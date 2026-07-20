import * as os from 'os'
import ip from 'ip'
import * as fs from 'fs-extra'
import uniq from 'lodash/uniq'
import type NodePty from 'node-pty'
import isEqual from 'lodash/isEqual'
import * as path from 'path'
import Koa from 'koa'
import bodyParser from 'koa-body'
import * as mime from 'mime'
import * as undici from 'undici'
import { promisify } from 'util'
import { STATIC_DIR, HOME_DIR, HELP_DIR, USER_PLUGIN_DIR, FLAG_DISABLE_SERVER, APP_NAME, USER_THEME_DIR, RESOURCES_DIR, BUILD_IN_STYLES, USER_EXTENSION_DIR, USER_DATA } from '../constant'
import * as file from './file'
import * as search from './search'
import run from './run'
import convert from './convert'
import plantuml from './plantuml'
import * as premium from './premium'
import shell from '../shell'
import config from '../config'
import * as jwt from '../jwt'
import { getAction } from '../action'
import * as extension from '../extension'
import * as mcpServer from './mcp'
import type { FileReadResult } from '../../share/types'

const isLocalhost = (address: string) => {
  if (!address) return false
  return ip.isEqual(address, '127.0.0.1') || ip.isEqual(address, '::1') || address === '::ffff:127.0.0.1'
}

const result = (status: 'ok' | 'error' = 'ok', message = 'success', data: any = null) => {
  return { status, message, data }
}

const resultError = (message: string) => {
  return { status: 'error' as const, message, data: null }
}

const resultOk = (data: any = null) => {
  return { status: 'ok' as const, message: 'success', data }
}

const noCache = (ctx: any) => {
  try {
    if (ctx.set) {
      ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      ctx.set('Pragma', 'no-cache')
      ctx.set('Expires', 0)
    }
  } catch (error) {
    console.error('noCache error:', error)
  }
}

const isImagePath = (filePath: string) => {
  if (!filePath) return false
  try {
    const fileType = mime.getType(filePath)
    return typeof fileType === 'string' && fileType.startsWith('image/')
  } catch (error) {
    return false
  }
}

const getFallbackAbsoluteImagePath = (filePath: string) => {
  if (!filePath || !isImagePath(filePath) || !filePath.startsWith('/')) {
    return null
  }

  try {
    return path.posix.isAbsolute(filePath) ? filePath : null
  } catch (error) {
    return null
  }
}

const parseRange = (range: string, size: number) => {
  if (!range) {
    return { start: 0, end: size - 1, chunkSize: size }
  }
  const requestRange = range.replace('bytes=', '').split('-').map((x: string) => parseInt(x || '-1'))
  const start = requestRange[0] < 0 ? 0 : requestRange[0]
  const end = requestRange[1] < 0 ? size - 1 : Math.min(requestRange[1], size - 1)

  return {
    start,
    end,
    chunkSize: Math.max(0, end - start + 1),
  }
}

const sendAttachmentContent = async (ctx: any, target: { repo?: string, path: string }) => {
  const headers = ctx.headers || {}
  const range = headers.range

  if (range) {
    const size = target.repo
      ? (await file.stat(target.repo, target.path)).size
      : (await fs.stat(target.path)).size
    const { start, end, chunkSize } = parseRange(range, size)

    ctx.status = 206
    ctx.set('Content-Range', `bytes ${start}-${end}/${size}`)
    ctx.set('Accept-Ranges', 'bytes')
    ctx.set('Content-Length', chunkSize)
    ctx.body = target.repo
      ? await file.createReadStream(target.repo, target.path, { start, end })
      : fs.createReadStream(target.path, { start, end })
  } else {
    ctx.body = target.repo
      ? await file.read(target.repo, target.path)
      : await fs.readFile(target.path)
  }

  ctx.type = mime.getType(target.path) || 'application/octet-stream'
}

const checkPermission = (ctx: any, next: any) => {
  try {
    const query = ctx.query || {}
    const headers = ctx.headers || {}
    const token = query._token || (headers['x-yn-authorization'] ?? (headers.authorization || '')).replace('Bearer', '').trim()

    if (ctx.req && ctx.req._protocol || (!token && ctx.request && isLocalhost(ctx.request.ip))) {
      if (ctx.req) {
        ctx.req.jwt = { role: 'admin' }
      }
      return next()
    }

    if (!ctx.path || !ctx.path.startsWith('/api')) {
      return next()
    }

    const allowList = {
      public: [
        '/api/help',
        '/api/custom-css',
        '/api/custom-styles',
        '/api/plugins',
        '/api/attachment',
        '/api/plantuml',
        '/api/settings/js',
        '/api/extensions',
      ],
      guest: [
        '/api/file',
        '/api/settings',
        '/api/proxy-fetch'
      ]
    }

    if (ctx.method === 'GET' && allowList.public.some(x => ctx.path.startsWith(x))) {
      return next()
    }

    let payload
    try {
      payload = jwt.verify(token)
      if (ctx.req) {
        ctx.req.jwt = payload
      }
    } catch (error) {
      ctx.status = 401
      throw error
    }

    if (payload.role === 'admin') {
      return next()
    }

    if (payload.role === 'guest' && ctx.method === 'GET' && allowList.guest.some(x => ctx.path.startsWith(x))) {
      return next()
    }

    ctx.status = 403
    throw new Error('Forbidden')
  } catch (error) {
    throw error
  }
}

const isAdmin = (ctx: any) => ctx.req && ctx.req.jwt && ctx.req.jwt.role === 'admin'

const checkIsAdmin = (ctx: any) => {
  if (!isAdmin(ctx)) {
    throw new Error('Forbidden')
  }
}

const checkPrivateRepo = (ctx: any, repo: string) => {
  if (repo && repo.startsWith('__')) {
    checkIsAdmin(ctx)
  }
}

const fileContent = async (ctx: any, next: any) => {
  if (ctx.path === '/api/file') {
    if (ctx.method === 'GET') {
      const { repo, path, asBase64, exists } = ctx.query || {}

      if (!repo || !path) {
        throw new Error('Invalid repo or path')
      }

      checkPrivateRepo(ctx, repo)

      if (exists === 'true') {
        ctx.body = result('ok', 'success', await file.exists(repo, path))
        return
      }

      const stat = await file.stat(repo, path)

      // limit 30mb
      if (stat.size > 30 * 1024 * 1024) {
        throw new Error('File is too large.')
      }

      const content = await file.read(repo, path)

      const data: FileReadResult = {
        content: content.toString(asBase64 ? 'base64' : undefined),
        hash: await file.hash(repo, path),
        stat: await file.stat(repo, path),
        writeable: await file.checkWriteable(repo, path),
      }

      ctx.body = result('ok', 'success', data)
    } else if (ctx.method === 'POST') {
      const _dbg = (msg: string) => { try { require('fs').appendFileSync('/tmp/yank-debug.log', `[debug-fileContent] ${msg}\n`) } catch {} }
      const { oldHash, content, asBase64, repo, path } = ctx.request.body || {}
      _dbg(`POST /api/file repo: ${repo} path: ${path} oldHash: ${oldHash} content type: ${typeof content} len: ${content?.length}`)

      if (!repo || !path) {
        throw new Error('Invalid repo or path')
      }

      if (!oldHash) {
        throw new Error('No hash.')
      } else if (oldHash === 'new' && (await file.exists(repo, path))) {
        throw new Error('File or directory already exists.')
      } else if (oldHash !== 'new' && !(await file.checkHash(repo, path, oldHash))) {
        throw new Error('File is stale. Please refresh.')
      }

      let saveContent = content
      if (asBase64) {
        saveContent = Buffer.from(
          content.startsWith('data:') ? content.substring(content.indexOf(',') + 1) : content,
          'base64'
        )
      }
      _dbg(`calling file.write, saveContent type: ${typeof saveContent} isBuffer: ${Buffer.isBuffer(saveContent)}`)

      try {
        const hash = await file.write(repo, path, saveContent)
        _dbg(`file.write OK, hash: ${hash}`)
        ctx.body = result('ok', 'success', {
          hash,
          stat: await file.stat(repo, path),
        })
      } catch (e) {
        _dbg(`file.write FAILED: ${(e as Error).message}\n${(e as Error).stack}`)
        throw e
      }
    } else if (ctx.method === 'DELETE') {
      const { repo, path } = ctx.query || {}
      if (!repo || !path) {
        throw new Error('Invalid repo or path')
      }
      const trash = ctx.query.trash !== 'false'
      await file.rm(repo, path, trash)
      ctx.body = result()
    } else if (ctx.method === 'PATCH') {
      const { repo, oldPath, newPath } = ctx.request.body || {}
      if (!repo || !oldPath || !newPath) {
        throw new Error('Invalid repo or path')
      }
      if (oldPath === newPath) {
        throw new Error('No change.')
      }

      if ((await file.exists(repo, newPath)) && newPath.toLowerCase() !== oldPath.toLowerCase()) {
        throw new Error('File or directory already exists.')
      }

      await file.mv(repo, oldPath, newPath)
      ctx.body = result()
    } else if (ctx.method === 'PUT') {
      const { repo, oldPath, newPath } = ctx.request.body || {}
      if (!repo || !oldPath || !newPath) {
        throw new Error('Invalid repo or path')
      }
      if ((await file.exists(repo, newPath))) {
        throw new Error('File or directory already exists.')
      }

      await file.cp(repo, oldPath, newPath)
      ctx.body = result()
    }
  } else if (ctx.path === '/api/tree') {
    const { repo, sort: sortStr, include, noEmptyDir } = ctx.query || {}
    if (!repo) {
      throw new Error('Invalid repo')
    }
    const arr = (sortStr || '').split('-')
    const sort = { by: arr[0] || 'name', order: arr[1] || 'asc' }
    ctx.body = result('ok', 'success', (await file.tree(repo, sort, include, noEmptyDir === 'true')))
  } else if (ctx.path === '/api/history/list') {
    const { repo, path } = ctx.query || {}
    if (!repo || !path) {
      throw new Error('Invalid repo or path')
    }
    ctx.body = result('ok', 'success', (await file.historyList(repo, path)))
  } else if (ctx.path === '/api/history/content') {
    const { repo, path, version } = ctx.query || {}
    if (!repo || !path || !version) {
      throw new Error('Invalid repo, path or version')
    }
    ctx.body = result('ok', 'success', (await file.historyContent(repo, path, version)))
  } else if (ctx.path === '/api/history/delete') {
    const { repo, path, version } = ctx.request.body || {}
    if (!repo || !path || !version) {
      throw new Error('Invalid repo, path or version')
    }
    ctx.body = result('ok', 'success', (await file.deleteHistoryVersion(repo, path, version)))
  } else if (ctx.path === '/api/history/comment') {
    const { repo, path, version, msg } = ctx.request.body || {}
    if (!repo || !path || !version) {
      throw new Error('Invalid repo, path or version')
    }
    ctx.body = result('ok', 'success', (await file.commentHistoryVersion(repo, path, version, msg)))
  } else if (ctx.path === '/api/watch-file') {
    const { repo, path, options } = ctx.request.body || {}
    if (!repo || !path) {
      throw new Error('Invalid repo or path')
    }
    ctx.body = await file.watchFile(repo, path, options)
  } else {
    await next()
  }
}

const attachment = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/attachment')) {
    if (ctx.method === 'POST') {
      const body = ctx.request.body || {}
      const path = body.path
      const repo = body.repo
      const attachment = body.attachment
      const exists = body.exists
      if (!repo || !path) {
        throw new Error('Invalid repo or path')
      }
      if (!attachment) {
        throw new Error('No attachment data.')
      }
      const buffer = Buffer.from(attachment.substring(attachment.indexOf(',') + 1), 'base64')
      const res = await file.upload(repo, buffer, path, exists)
      ctx.body = result('ok', 'success', res)
    } else if (ctx.method === 'GET') {
      let { repo, path } = ctx.query || {}

      if (!repo || !path) {
        const filePath = ctx.path.replace('/api/attachment', '')
        const arr = filePath.split('/')
        repo = decodeURIComponent(arr[1] || '')
        path = decodeURI('/' + arr.slice(2).join('/'))
      }

      if (!repo || !path) {
        throw new Error('Invalid path.')
      }

      checkPrivateRepo(ctx, repo)

      noCache(ctx)

      try {
        await sendAttachmentContent(ctx, { repo, path })
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          const fallbackAbsoluteImagePath = getFallbackAbsoluteImagePath(path)

          if (fallbackAbsoluteImagePath) {
            try {
              await sendAttachmentContent(ctx, { path: fallbackAbsoluteImagePath })
              return
            } catch (fallbackError: any) {
              if (fallbackError.code !== 'ENOENT') {
                throw fallbackError
              }
            }
          }

          ctx.status = 404
          ctx.body = resultError('Not found')
        } else {
          throw error
        }
      }
    }
  } else {
    await next()
  }
}

const searchFile = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/search') && ctx.method === 'POST') {
    const query = ctx.request.body.query
    if (!query) {
      throw new Error('No search query provided')
    }
    ctx.body = await search.search(query)
  } else {
    await next()
  }
}

const plantumlGen = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/plantuml')) {
    try {
      const { type, content } = await plantuml(ctx.query.data)
      ctx.type = type
      ctx.body = content
      ctx.set('cache-control', 'max-age=86400') // 1 day.
    } catch (error) {
      console.error('plantuml error:', error)
      ctx.body = String(error)
    }
  } else {
    await next()
  }
}

const runCode = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/run')) {
    const { cmd, code } = ctx.request.body
    if (!cmd && !code) {
      throw new Error('No command or code provided')
    }
    ctx.body = await run.runCode(cmd, code)
  } else {
    await next()
  }
}

const convertFile = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/convert/')) {
    const source = ctx.request.body.source
    const fromType = ctx.request.body.fromType
    const toType = ctx.request.body.toType
    const resourcePath = ctx.request.body.resourcePath

    if (!source || !fromType || !toType) {
      throw new Error('Invalid convert parameters')
    }

    ctx.set('content-type', 'application/octet-stream')
    ctx.body = await convert(source, fromType, toType, resourcePath)
  } else {
    await next()
  }
}

const tmpFile = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/tmp-file')) {
    const query = ctx.query || {}
    const name = query.name
    if (!name) {
      throw new Error('Invalid name')
    }
    const absPath = path.join(os.tmpdir(), APP_NAME + '-' + name.replace(/\//g, '_'))
    if (ctx.method === 'GET') {
      ctx.body = await fs.readFile(absPath)
    } else if (ctx.method === 'POST') {
      let body: any = ctx.request.body ? ctx.request.body.toString() : ''

      if (query.asBase64) {
        body = Buffer.from(
          body.startsWith('data:') ? body.substring(body.indexOf(',') + 1) : body,
          'base64'
        )
      }

      await fs.ensureFile(absPath)
      await fs.writeFile(absPath, body)
      ctx.body = result('ok', 'success', { path: absPath })
    } else if (ctx.method === 'DELETE') {
      try {
        await fs.unlink(absPath)
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }
      ctx.body = result('ok', 'success')
    }
  } else {
    await next()
  }
}

const userFile = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/user-file')) {
    const query = ctx.query || {}
    const name = query.name
    if (!name) {
      throw new Error('Invalid path')
    }
    const filePath = name.replace(/\.+/g, '.') // replace multiple dots with one dot

    if (!filePath) {
      throw new Error('Invalid path')
    }

    const absPath = path.join(USER_DATA, filePath)

    if (ctx.method === 'GET') {
      ctx.body = await fs.readFile(absPath)
    } else if (ctx.method === 'POST') {
      let body: any = ctx.request.body ? ctx.request.body.toString() : ''

      if (query.asBase64) {
        body = Buffer.from(
          body.startsWith('data:') ? body.substring(body.indexOf(',') + 1) : body,
          'base64'
        )
      }

      await fs.ensureFile(absPath)
      await fs.writeFile(absPath, body)
      ctx.body = result('ok', 'success', { path: absPath })
    } else if (ctx.method === 'DELETE') {
      try {
        await fs.unlink(absPath)
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }
      ctx.body = result('ok', 'success')
    }
  } else if (ctx.path.startsWith('/api/user-dir')) {
    const query = ctx.query || {}
    const dirName = query.name
    if (!dirName) {
      throw new Error('Invalid path')
    }
    const dirPath = dirName.replace(/\.+/g, '.') // replace multiple dots with one dot

    if (!dirPath) {
      throw new Error('Invalid path')
    }

    const absPath = path.join(USER_DATA, dirPath)

    if (ctx.method === 'GET') {
      const recursive = query.recursive === 'true'

      const data: ({ name: string, absolutePath: string, path: string, isFile: boolean, isDir: boolean })[] = []

      const readDirRecursive = async (dir: string) => {
        const items = await fs.readdir(dir, { withFileTypes: true })

        for (const item of items) {
          const absolutePath = path.resolve(dir, item.name)
          data.push({
            name: item.name,
            absolutePath,
            path: path.relative(absPath, absolutePath).replace(/\\/g, '/'),
            isFile: item.isFile(),
            isDir: item.isDirectory(),
          })

          if (recursive && item.isDirectory()) {
            await readDirRecursive(absolutePath)
          }
        }
      }

      await readDirRecursive(absPath)

      ctx.body = result('ok', 'success', data)
    }
  } else {
    await next()
  }
}

const proxy = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/proxy-fetch/')) {
    const originalUrl = ctx.originalUrl || ''
    const url = originalUrl.replace(/^.*\/api\/proxy-fetch\//, '')

    if (!url) {
      throw new Error('No URL provided')
    }

    let signal: AbortSignal | undefined
    let timeoutTimer: NodeJS.Timeout | undefined

    try {
      const headers = ctx.headers || {}
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        host,
        'x-proxy-url': proxyUrl,
        'x-proxy-timeout': proxyTimeout,
        'x-proxy-max-redirections': maxRedirections = '3',
        ...restHeaders
      } = headers

      const dispatcher = proxyUrl
        ? getAction('new-proxy-dispatcher')(proxyUrl)
        : await getAction('get-proxy-dispatcher')(url)

      if (proxyTimeout) {
        const controller = new AbortController()
        signal = controller.signal
        timeoutTimer = setTimeout(() => {
          controller.abort()
          timeoutTimer = undefined
        }, Number(proxyTimeout))
      }

      const response = await undici.request(url, {
        dispatcher,
        method: ctx.method,
        headers: restHeaders,
        body: ctx.req,
        signal,
        maxRedirections: Number(maxRedirections)
      })

      // Set the response status, headers, and body
      ctx.status = response.statusCode
      ctx.set(response.headers)
      ctx.body = response.body

      response.body.once('close', () => {
        timeoutTimer && clearTimeout(timeoutTimer)
      })
    } catch (error: any) {
      ctx.status = 500
      timeoutTimer && clearTimeout(timeoutTimer)
      throw error
    }
  } else {
    await next()
  }
}

const readme = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/help')) {
    const query = ctx.query || {}
    if (query.path) {
      const safePath = query.path.replace('../', '')
      ctx.type = mime.getType(safePath)
      ctx.body = await fs.readFile(path.join(HELP_DIR, safePath))
    } else if (query.doc) {
      const safeDoc = query.doc.replace('../', '')
      ctx.body = result('ok', 'success', {
        content: await fs.readFile(path.join(HELP_DIR, safeDoc), 'utf-8')
      })
    } else {
      throw new Error('Invalid help request')
    }
  } else {
    await next()
  }
}

const userPlugin = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/plugins')) {
    ctx.type = 'application/javascript; charset=utf-8'

    let code = ''
    try {
      for (const x of await fs.readdir(USER_PLUGIN_DIR, { withFileTypes: true })) {
        if (x.isFile() && x.name.endsWith('.js')) {
          code += `;(async function () {; // ===== ${x.name} =====\n` +
            (await fs.readFile(path.join(USER_PLUGIN_DIR, x.name))) +
            '\n;})(); // ===== end =====\n\n'
        }
      }
    } catch (error) {
      console.error('Failed to read plugins:', error)
    }

    ctx.body = code
  } else {
    await next()
  }
}

const customCss = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/custom-styles')) {
    const files: string[] = [...BUILD_IN_STYLES]
    try {
      for (const x of await fs.readdir(USER_THEME_DIR, { withFileTypes: true })) {
        if (x.isFile() && x.name.endsWith('.css')) {
          files.push(x.name)
        }
      }
    } catch (error) {
      console.error('Failed to read theme directory:', error)
    }

    ctx.body = result('ok', 'success', Array.from(new Set(files)))
  } else if (ctx.path.startsWith('/custom-css')) {
    const configKey = 'custom-css'
    const defaultCss = BUILD_IN_STYLES[0]

    ctx.type = 'text/css'
    noCache(ctx)

    try {
      const filename = config.get(configKey, defaultCss)

      if (filename.startsWith('extension:')) {
        const extensions = await extension.list()
        const extensionName = filename.substring('extension:'.length, filename.indexOf('/'))
        if (extensions.some(x => x.enabled && x.id === extension.dirnameToId(extensionName))) {
          ctx.redirect(`/extensions/${filename.replace('extension:', '')}`)
        } else {
          throw new Error(`extension not found [${extensionName}]`)
        }
      } else {
        ctx.body = await fs.readFile(path.join(USER_THEME_DIR, filename))
      }
    } catch (error) {
      console.error(error)

      try {
        await fs.writeFile(
          path.join(USER_THEME_DIR, defaultCss),
          await fs.readFile(path.join(RESOURCES_DIR, defaultCss))
        )

        config.set(configKey, defaultCss)
        ctx.body = await fs.readFile(path.join(USER_THEME_DIR, defaultCss))
      } catch (fallbackError) {
        console.error('Failed to fallback to default CSS:', fallbackError)
        ctx.body = ''
      }
    }
  } else {
    await next()
  }
}

const setting = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/settings')) {
    if (ctx.method === 'GET') {
      const getSettings = () => {
        if (isAdmin(ctx)) {
          return config.getAll()
        } else {
          const data = { ...config.getAll() }
          data.repositories = {}
          data.mark = []

          // remove sensitive data
          Object.keys(data).forEach((key) => {
            if (key.endsWith('-token') || key.endsWith('-secret')) {
              delete data[key]
            }
          })

          delete data.license
          delete data.extensions
          return data
        }
      }

      if (ctx.path && ctx.path.endsWith('js')) {
        ctx.type = 'application/javascript; charset=utf-8'
        noCache(ctx)
        ctx.body = '_INIT_SETTINGS = ' + JSON.stringify(getSettings())
      } else {
        ctx.body = result('ok', 'success', getSettings())
      }
    } else if (ctx.method === 'POST') {
      const oldConfig = config.getAll()
      const body = ctx.request.body || {}
      const data = { ...oldConfig, ...body }
      config.setAll(data)

      const changedKeys = uniq([...Object.keys(oldConfig), ...Object.keys(data)])
        .filter((key) => !isEqual(data[key], oldConfig[key]))

      try {
        if (oldConfig.language !== data.language) {
          getAction('i18n.change-language')(data.language)
        }
      } catch (error) {
        console.error('Failed to change language:', error)
      }

      try {
        if (oldConfig['updater.source'] !== data['updater.source'] && data['updater.source']) {
          getAction('updater.change-source')(data['updater.source'])
        }
      } catch (error) {
        console.error('Failed to change updater source:', error)
      }

      try {
        getAction('proxy.reload')(data)
      } catch (error) {
        console.error('Failed to reload proxy:', error)
      }

      try {
        getAction('envs.reload')(data)
      } catch (error) {
        console.error('Failed to reload envs:', error)
      }

      try {
        getAction('shortcuts.reload')(changedKeys)
      } catch (error) {
        console.error('Failed to reload shortcuts:', error)
      }

      ctx.body = result('ok', 'success')
    }
  } else {
    await next()
  }
}

let chooseLock = false
const choose = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/choose')) {
    if (ctx.method === 'POST') {
      const { from } = ctx.query || {}
      const body = ctx.request.body

      if (chooseLock) {
        throw new Error('Busy')
      }

      chooseLock = true
      try {
        if (from === 'browser') {
          try { getAction('show-main-window')() } catch (e) { console.error(e) }
        }
        const data = await getAction('show-open-dialog')(body)
        if (from === 'browser') {
          try { getAction('hide-main-window')() } catch (e) { console.error(e) }
        }
        chooseLock = false
        ctx.body = result('ok', 'success', data)
      } catch (error) {
        chooseLock = false
        throw error
      }
    }
  } else {
    await next()
  }
}

const mcpEndpoint = async (ctx: any, next: any) => {
  if (ctx.path === '/api/mcp/message' && ctx.method === 'POST') {
    checkIsAdmin(ctx)
    // MCP endpoint using SDK's StreamableHTTPServerTransport
    try {
      await mcpServer.handleMCPRequest(ctx.req, ctx.res, ctx.request.body)
    } catch (error) {
      console.error('MCP handler error:', error)
      ctx.status = 500
      ctx.body = resultError('MCP handler error')
      ctx.respond = true
      return
    }
    ctx.respond = false
  } else {
    await next()
  }
}

const rpc = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/rpc') && ctx.method === 'POST') {
    const body = ctx.request.body || {}
    const { code } = body
    if (!code) {
      throw new Error('No code provided')
    }
    const AsyncFunction = Object.getPrototypeOf(async () => 0).constructor
    const fn = new AsyncFunction('require', code)
    const nodeRequire = (id: string) => id.startsWith('.')
      ? require(path.resolve(__dirname, '..', id))
      : require(id)
    ctx.body = result('ok', 'success', await fn(nodeRequire))
  } else {
    await next()
  }
}

const sendFile = async (ctx: any, next: any, filePath: string, fullback = true) => {
  try {
    if (!fs.existsSync(filePath)) {
      if (fullback) {
        await sendFile(ctx, next, path.resolve(STATIC_DIR, 'index.html'), false)
      } else {
        next()
      }

      return false
    }

    const fileStat = fs.statSync(filePath)
    if (fileStat.isDirectory()) {
      await sendFile(ctx, next, path.resolve(filePath, 'index.html'))
      return true
    }

    ctx.body = await promisify(fs.readFile)(filePath)
    ctx.set('Content-Length', fileStat.size)
    ctx.set('Last-Modified', fileStat.mtime.toUTCString())
    try {
      if (!ctx.response.get('Cache-Control')) {
        ctx.set('Cache-Control', 'max-age=0')
      }
    } catch (error) {
      ctx.set('Cache-Control', 'max-age=0')
    }
    ctx.set('X-XSS-Protection', '0')
    ctx.type = path.extname(filePath)

    return true
  } catch (error) {
    console.error('sendFile error:', filePath, error)
    if (fullback) {
      await sendFile(ctx, next, path.resolve(STATIC_DIR, 'index.html'), false)
    }
    return false
  }
}

const userExtension = async (ctx: any, next: any) => {
  if (ctx.method === 'GET') {
    if (ctx.path.startsWith('/api/extensions')) {
      ctx.body = result('ok', 'success', await extension.list())
    } else if (ctx.path.startsWith('/extensions/') && ctx.method === 'GET') {
      const filePath = path.join(USER_EXTENSION_DIR, ctx.path.replace('/extensions', ''))
      noCache(ctx)
      await sendFile(ctx, next, filePath, false)
    } else {
      await next()
    }
  } else if (ctx.path.startsWith('/api/extensions/')) {
    const query = ctx.query || {}
    const id = query.id

    if (ctx.path.startsWith('/api/extensions/abort-installation')) {
      ctx.body = result('ok', 'success', await extension.abortInstallation())
    } else if (!id) {
      throw new Error('Extension ID is required')
    } else if (ctx.path.startsWith('/api/extensions/install')) {
      ctx.body = result('ok', 'success', await extension.install(id, query.url))
    } else if (ctx.path.startsWith('/api/extensions/uninstall')) {
      ctx.body = result('ok', 'success', await extension.uninstall(id))
    } else if (ctx.path.startsWith('/api/extensions/enable')) {
      ctx.body = result('ok', 'success', await extension.enable(id))
    } else if (ctx.path.startsWith('/api/extensions/disable')) {
      ctx.body = result('ok', 'success', await extension.disable(id))
    } else {
      await next()
    }
  } else {
    await next()
  }
}

const premiumManage = async (ctx: any, next: any) => {
  if (ctx.method === 'POST' && ctx.path.startsWith('/api/premium')) {
    const body = ctx.request.body || {}
    const { method, payload } = body
    if (!method || typeof (premium as any)[method] !== 'function') {
      throw new Error('Invalid premium method')
    }
    const data = await (premium as any)[method](payload)
    ctx.body = result('ok', 'success', data)
  } else {
    await next()
  }
}

const wrapper = async (ctx: any, next: any, fun: any) => {
  try {
    await fun(ctx, next)
  } catch (error: any) {
    try { require('fs').appendFileSync('/tmp/yank-debug.log', `[debug-wrapper] CAUGHT error in ${ctx.method} ${ctx.path}: ${error?.message}\n${error?.stack}\n`) } catch {}
    console.error(error)
    try {
      if (ctx.set) {
        ctx.set('x-yank-note-api-status', 'error')
        ctx.set('x-yank-note-api-message', encodeURIComponent(error.message || 'Unknown error'))
      }
      ctx.body = resultError(error.message || 'Unknown error')
    } catch (setError) {
      console.error('wrapper set error:', setError)
    }
  }
}

const ptyProcesses: NodePty.IPty[] = []

export async function killPtyProcesses (pty?: NodePty.IPty) {
  const kill = async (ptyProcess: NodePty.IPty) => {
    try {
      const index = ptyProcesses.indexOf(ptyProcess)
      if (index >= 0) {
        ptyProcesses.splice(index, 1)
      } else {
        // already killed
        return
      }

      const promise = Promise.race([
        new Promise<void>((resolve) => {
          try {
            ptyProcess.onExit(() => resolve())
          } catch (e) {
            resolve()
          }
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 500)
        })
      ])

      try {
        ptyProcess.kill()
      } catch (e) {
        console.error('pty kill error:', e)
      }

      await promise
    } catch (error) {
      console.error('kill pty error:', error)
    }
  }

  if (pty) {
    await kill(pty)
  } else {
    for (const ptyProcess of [...ptyProcesses]) {
      await kill(ptyProcess)
    }
    ptyProcesses.length = 0
  }
}

const server = (port = 3000) => {
  const app = new Koa()

  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, checkPermission))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, proxy))

  app.use(async (ctx: any, next: any) => {
    const fs = require('fs')
    fs.appendFileSync('/tmp/yank-debug.log', `[debug-body] before bodyParser: ${ctx.method} ${ctx.path}\n`)
    try {
      await bodyParser({
        multipart: true,
        formLimit: '50mb',
        jsonLimit: '50mb',
        textLimit: '50mb',
        formidable: {
          maxFieldsSize: 268435456
        }
      })(ctx, next)
      fs.appendFileSync('/tmp/yank-debug.log', `[debug-body] after bodyParser OK: ${ctx.method} ${ctx.path} body type: ${typeof ctx.request.body}\n`)
    } catch (e) {
      fs.appendFileSync('/tmp/yank-debug.log', `[debug-body] bodyParser FAILED: ${ctx.method} ${ctx.path} ${(e as Error).message}\n${(e as Error).stack}\n`)
      throw e
    }
  })

  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, fileContent))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, attachment))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, plantumlGen))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, runCode))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, convertFile))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, searchFile))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, readme))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, userPlugin))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, customCss))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, userExtension))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, premiumManage))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, setting))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, mcpEndpoint))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, choose))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, tmpFile))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, userFile))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, rpc))

  // static file
  app.use(async (ctx: any, next: any) => {
    try {
      const urlPath = decodeURIComponent(ctx.path).replace(/^(\/static\/|\/)/, '')

      if (!(await sendFile(ctx, next, path.resolve(STATIC_DIR, urlPath), false))) {
        await sendFile(ctx, next, path.resolve(USER_THEME_DIR, urlPath), true)
      }
    } catch (error) {
      console.error('static file error:', error)
      await sendFile(ctx, next, path.resolve(STATIC_DIR, 'index.html'), false)
    }
  })

  const callback = app.callback()

  if (FLAG_DISABLE_SERVER) {
    return { callback }
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const server = require('http').createServer(callback)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const io = require('socket.io')(server, { path: '/ws' })
  // eslint-disable-next-line @typescript-eslint/no-var-requires

  let pty: typeof NodePty | null = null

  try {
    pty = require('node-pty')
  } catch (error) {
    console.error(error)
  }

  io.on('connection', (socket: any) => {
    try {
      if (!socket.client || !socket.client.conn || !isLocalhost(socket.client.conn.remoteAddress)) {
        socket.disconnect()
        return
      }
    } catch (e) {
      socket.disconnect()
      return
    }

    if (pty) {
      try {
        const handshake = socket.handshake || { query: {} }
        const query = handshake.query || {}
        const env = JSON.parse(query.env || '{}')

        const ptyProcess = pty.spawn(shell.getShell(), [], {
          name: 'xterm-color',
          cols: 80,
          rows: 24,
          cwd: query.cwd || HOME_DIR,
          env: { ...process.env, ...env },
        })

        ptyProcesses.push(ptyProcess)

        const kill = () => {
          killPtyProcesses(ptyProcess)
        }

        ptyProcess.onData((data: any) => socket.emit('output', data))
        ptyProcess.onExit(() => {
          console.log('ptyProcess exit')
          socket.disconnect()
          process.off('exit', kill)
        })

        socket.on('input', (data: any) => {
          try {
            if (data.startsWith(shell.CD_COMMAND_PREFIX)) {
              ptyProcess.write(shell.transformCdCommand(data.toString()))
            } else {
              ptyProcess.write(data)
            }
          } catch (error) {
            console.error('pty input error:', error)
          }
        })
        socket.on('resize', (size: any) => {
          try {
            ptyProcess.resize(size[0], size[1])
          } catch (error) {
            console.error('pty resize error:', error)
          }
        })
        socket.on('disconnect', kill)

        process.on('exit', kill)
      } catch (error) {
        console.error('pty spawn error:', error)
        socket.emit('output', 'Failed to spawn terminal: ' + String(error))
      }
    } else {
      socket.emit('output', 'node-pty is not compatible with this platform. Please install another version from GitHub https://github.com/purocean/yn/releases')
    }
  })

  const host = config.get('server.host', '127.0.0.1')
  try {
    server.listen(port, host)
    console.log(`Address: http://${host}:${port}`)
  } catch (error) {
    console.error('Failed to start server:', error)
  }

  return { callback, server }
}

export default server
