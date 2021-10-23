import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import Koa from 'koa'
import bodyParser from 'koa-body'
import * as mime from 'mime'
import request from 'request'
import { promisify } from 'util'
import { STATIC_DIR, HOME_DIR, HELP_DIR, USER_PLUGIN_DIR, FLAG_DISABLE_SERVER, APP_NAME } from '../constant'
import file from './file'
import dataRepository from './repository'
import run from './run'
import convert from './convert'
import plantuml from './plantuml'
import shell from '../shell'
import mark from './mark'
import config from '../config'
import { getAction } from '../action'

const result = (status: 'ok' | 'error' = 'ok', message = '操作成功', data: any = null) => {
  return { status, message, data }
}

const fileContent = async (ctx: any, next: any) => {
  if (ctx.path === '/api/file') {
    if (ctx.method === 'GET') {
      ctx.body = result('ok', '获取成功', {
        content: file.read(ctx.query.repo, ctx.query.path).toString(),
        hash: file.hash(ctx.query.repo, ctx.query.path)
      })
    } else if (ctx.method === 'POST') {
      const oldHash = ctx.request.body.old_hash

      if (!oldHash) {
        throw new Error('未传递文件hash')
      } else if (oldHash === 'new' && file.exists(ctx.request.body.repo, ctx.request.body.path)) {
        throw new Error('文件已经存在')
      } else if (oldHash !== 'new' && !file.checkHash(ctx.request.body.repo, ctx.request.body.path, oldHash)) {
        throw new Error('磁盘文件已经更新，请刷新文件')
      }

      const hash = file.write(ctx.request.body.repo, ctx.request.body.path, ctx.request.body.content)
      ctx.body = result('ok', '保存成功', hash)
    } else if (ctx.method === 'DELETE') {
      file.rm(ctx.query.repo, ctx.query.path)
      ctx.body = result()
    } else if (ctx.method === 'PATCH') {
      if (file.exists(ctx.request.body.repo, ctx.request.body.newPath)) {
        throw new Error('文件已经存在')
      }

      file.mv(ctx.request.body.repo, ctx.request.body.oldPath, ctx.request.body.newPath)
      ctx.body = result()
    }
  } else if (ctx.path === '/api/tree') {
    ctx.body = result('ok', '获取成功', file.tree(ctx.query.repo))
  } else {
    await next()
  }
}

const attachment = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/attachment')) {
    if (ctx.method === 'POST') {
      const path = ctx.request.body.path
      const repo = ctx.request.body.repo
      const attachment = ctx.request.body.attachment
      const buffer = Buffer.from(attachment.substring(attachment.indexOf(',') + 1), 'base64')
      file.upload(repo, buffer, path)
      ctx.body = result('ok', '上传成功', path)
    } else if (ctx.method === 'GET') {
      ctx.type = mime.getType(ctx.query.path)
      ctx.body = file.read(ctx.query.repo, ctx.query.path)
    }
  } else {
    await next()
  }
}

const open = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/open')) {
    if (ctx.method === 'GET') {
      file.open(ctx.query.repo, ctx.query.path)
      ctx.body = result()
    }
  } else {
    await next()
  }
}

const markFile = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/mark')) {
    if (ctx.method === 'GET') {
      ctx.body = result('ok', '获取成功', mark.list())
    } else if (ctx.method === 'POST') {
      mark.add({ repo: ctx.query.repo, path: ctx.query.path })
      ctx.body = result()
    } else if (ctx.method === 'DELETE') {
      mark.remove({ repo: ctx.query.repo, path: ctx.query.path })
      ctx.body = result()
    }
  } else {
    await next()
  }
}

const searchFile = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/search')) {
    const search = ctx.query.search
    const repo = ctx.query.repo

    ctx.body = result('ok', '操作成功', file.search(repo, search))
  } else {
    await next()
  }
}

const repository = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/repositories')) {
    ctx.body = result('ok', '获取成功', dataRepository.list())
  } else {
    await next()
  }
}

const plantumlGen = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/plantuml/png')) {
    ctx.type = 'image/png'
    try {
      ctx.body = await plantuml(ctx.query.data)
      ctx.set('cache-control', 'max-age=86400') // 一天过期
    } catch (error) {
      ctx.body = error
    }
  } else {
    await next()
  }
}

const runCode = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/run')) {
    const rst = run.runCode(ctx.request.body.language, ctx.request.body.code)
    ctx.body = result('ok', '运行成功', rst)
  } else {
    await next()
  }
}

const convertFile = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/convert/')) {
    const source = ctx.request.body.source
    const fromType = ctx.request.body.fromType
    const toType = ctx.request.body.toType

    ctx.set('content-type', 'application/octet-stream')
    ctx.body = await convert(source, fromType, toType)
  } else {
    await next()
  }
}

const tmpFile = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/tmp-file')) {
    const absPath = path.join(os.tmpdir(), APP_NAME + '_' + ctx.query.name.replace(/\//g, '_'))
    if (ctx.method === 'GET') {
      ctx.body = fs.readFileSync(absPath)
    } else if (ctx.method === 'POST') {
      let body: any = ctx.request.body.toString()

      if (ctx.query.asBase64) {
        body = Buffer.from(
          body.startsWith('data:') ? body.substring(body.indexOf(',') + 1) : body,
          'base64'
        )
      }

      fs.writeFileSync(absPath, body)
      ctx.body = result('ok', '写入成功', { path: absPath })
    } else if (ctx.method === 'DELETE') {
      fs.unlinkSync(absPath)
      ctx.body = result('ok', '删除成功')
    }
  } else {
    await next()
  }
}

const proxy = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/proxy')) {
    const url = ctx.query.url
    const headers = ctx.query.headers ? JSON.parse(ctx.query.headers) : undefined
    const options = ctx.query.options ? JSON.parse(ctx.query.options) : {}
    await new Promise<void>((resolve, reject) => {
      request({ url, headers, encoding: null, ...options }, function (err: any, response: any, body: any) {
        if (err) {
          reject(err)
        } else {
          ctx.status = response.statusCode
          ctx.set('content-type', response.headers['content-type'])
          ctx.body = body
          resolve()
        }
      })
    })
  } else {
    await next()
  }
}

const readme = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/help')) {
    if (ctx.query.path) {
      ctx.type = mime.getType(ctx.query.path)
      ctx.body = fs.readFileSync(path.join(HELP_DIR, ctx.query.path.replace('../', '')))
    } else {
      ctx.body = result('ok', '获取成功', {
        content: fs.readFileSync(path.join(HELP_DIR, ctx.query.doc.replace('../', ''))).toString()
      })
    }
  } else {
    await next()
  }
}

const userPlugin = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/plugins')) {
    ctx.type = 'application/javascript; charset=utf-8'

    let code = ''
    fs.readdirSync(USER_PLUGIN_DIR, { withFileTypes: true })
      .filter(x => x.isFile() && x.name.endsWith('.js'))
      .forEach(x => {
        code += `// ===== ${x.name} =====\n` +
          fs.readFileSync(path.join(USER_PLUGIN_DIR, x.name)) +
          '\n// ===== end =====\n\n'
      })
    ctx.body = code
  } else {
    await next()
  }
}

const setting = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/settings')) {
    if (ctx.method === 'GET') {
      ctx.body = result('ok', '获取成功', config.getAll())
    } else if (ctx.method === 'POST') {
      const data = { ...config.getAll(), ...ctx.request.body }
      config.setAll(data)
      ctx.body = result('ok', '设置成功')
    }
  } else {
    await next()
  }
}

let chooseLock = false
const choose = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/choose')) {
    if (ctx.method === 'POST') {
      const { from } = ctx.query
      const body = ctx.request.body

      if (chooseLock) {
        throw new Error('当前正在选择文件')
      }

      chooseLock = true
      from === 'browser' && getAction('show-main-window')()
      const data = await getAction('show-open-dialog')(body)
      from === 'browser' && getAction('hide-main-window')()
      chooseLock = false
      ctx.body = result('ok', '完成', data)
    }
  } else {
    await next()
  }
}

const wrapper = async (ctx: any, next: any, fun: any) => {
  try {
    await fun(ctx, next)
  } catch (error: any) {
    console.error(error)
    ctx.body = result('error', error.message)
  }
}

const server = (port = 3000) => {
  const app = new Koa()

  app.use(bodyParser({
    multipart: true,
    formLimit: '20mb',
    jsonLimit: '20mb',
    textLimit: '20mb',
    formidable: {
      maxFieldsSize: 268435456
    }
  }))

  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, fileContent))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, attachment))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, open))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, plantumlGen))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, runCode))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, convertFile))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, searchFile))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, repository))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, proxy))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, readme))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, markFile))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, userPlugin))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, setting))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, choose))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, tmpFile))

  // 静态文件
  app.use(async (ctx: any, next: any) => {
    const urlPath = decodeURIComponent(ctx.path).replace(/^(\/static\/|\/)/, '')
    const sendFile = async (filePath: string, fullback = true) => {
      if (!fs.existsSync(filePath)) {
        if (fullback) {
          await sendFile(path.resolve(STATIC_DIR, 'index.html'), false)
        } else {
          next()
        }

        return false
      }

      const fileStat = fs.statSync(filePath)
      if (fileStat.isDirectory()) {
        await sendFile(path.resolve(filePath, 'index.html'))
        return true
      }

      ctx.body = await promisify(fs.readFile)(filePath)
      ctx.set('Content-Length', fileStat.size)
      ctx.set('Last-Modified', fileStat.mtime.toUTCString())
      ctx.set('Cache-Control', 'max-age=0')
      ctx.set('X-XSS-Protection', '0')
      ctx.type = path.extname(filePath)

      return true
    }

    if (!(await sendFile(path.resolve(STATIC_DIR, urlPath), false))) {
      await sendFile(path.resolve(USER_PLUGIN_DIR, urlPath), true)
    }
  })

  const callback = app.callback()

  if (FLAG_DISABLE_SERVER) {
    return callback
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const server = require('http').createServer(callback)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const io = require('socket.io')(server, { path: '/ws' })
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pty = require('node-pty')

  io.on('connection', (socket: any) => {
    const ptyProcess = pty.spawn(shell.getShell(), [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: HOME_DIR,
      env: process.env
    })
    ptyProcess.onData((data: any) => socket.emit('output', data))
    ptyProcess.onExit(() => socket.disconnect())
    socket.on('input', (data: any) => {
      if (data.startsWith(shell.CD_COMMAND_PREFIX)) {
        ptyProcess.write(shell.transformCdCommand(data.toString()))
      } else {
        ptyProcess.write(data)
      }
    })
    socket.on('resize', (size: any) => ptyProcess.resize(size[0], size[1]))
    socket.on('disconnect', () => ptyProcess.kill())
  })

  server.listen(port, 'localhost')

  console.log(`访问地址：http://localhost:${port}`)

  return callback
}

export default server
