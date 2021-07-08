import { slugify } from 'transliteration'
import { basename, relative, extname, join, dirname } from '@fe/utils/path'
import { fileToBase64URL } from '@fe/utils'
import env from '@fe/utils/env'
import Crypto from '@fe/utils/crypto'
import { Doc } from './types'
import { FLAG_DEMO } from './global-args'

async function fetchHttp (input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init)
  const result = await response.json()
  if (result.status !== 'ok') {
    throw new Error(result.message)
  }

  return result
}

async function fetchHelpContent (doc: string) {
  const result = await fetchHttp('/api/help?doc=' + doc)
  return { content: result.data.content, hash: '' }
}

export async function readFile ({ path, repo }: Pick<Doc, 'path' | 'repo'>) {
  if (repo === '__help__') {
    return await fetchHelpContent(path)
  }

  const result = await fetchHttp(`/api/file?path=${encodeURIComponent(path)}&repo=${encodeURIComponent(repo)}`)
  const hash = result.data.hash
  const content = result.data.content

  return { content, hash }
}

export async function writeFile ({ repo, path, contentHash }: Doc, content: string) {
  const result = await fetchHttp('/api/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, path, content, old_hash: contentHash })
  })

  return { hash: result.data }
}

export async function moveFile ({ repo, path }: Doc, newPath: string) {
  return fetchHttp('/api/file', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: repo, oldPath: path, newPath })
  })
}

export async function deleteFile ({ path, repo }: Doc) {
  return fetchHttp(`/api/file?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'DELETE' })
}

export async function markFile ({ path, repo }: Doc) {
  return fetchHttp(`/api/mark?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'POST' })
}

export async function unmarkFile ({ path, repo }: Doc) {
  return fetchHttp(`/api/mark?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'DELETE' })
}

export async function fetchMarkedFiles () {
  const { data } = await fetchHttp('/api/mark')
  return data
}

export async function fetchTree (repo: string) {
  const result = await fetchHttp(`/api/tree?repo=${repo}`)
  return result.data
}

export async function fetchRepositories () {
  const result = await fetchHttp('/api/repositories')
  return result.data
}

export async function fetchSettings () {
  const result = await fetchHttp('/api/settings')
  return result.data
}

export async function writeSettings (body: any) {
  return fetchHttp('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

export async function choosePath (args: any) {
  const from = env.isElectron ? 'electron' : 'browser'
  const result = await fetchHttp(`/api/choose?from=${from}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  })
  return result.data
}

export async function search (repo: string, text: string) {
  const result = await fetchHttp(`/api/search?repo=${repo}&search=${encodeURIComponent(text)}`)
  return result.data
}

export async function upload (repo: string, belongPath: string, uploadFile: any, name: string | null = null) {
  if (FLAG_DEMO) {
    return Promise.resolve({
      repo,
      path: belongPath,
      relativePath: URL.createObjectURL(uploadFile)
    })
  }

  const fileBase64Url = await fileToBase64URL(uploadFile)
  const filename = name || Crypto.binMd5(fileBase64Url).substr(0, 8) + extname(uploadFile.name)

  const formData = new FormData()
  const dirName = slugify(basename(belongPath))
  const parentPath = dirname(belongPath)
  const path: string = join(
    parentPath,
    'FILES',
    dirName.startsWith('.') ? 'upload' : dirName, filename
  )
  formData.append('repo', repo)
  formData.append('path', path)
  formData.append('attachment', fileBase64Url)

  await fetchHttp('/api/attachment', { method: 'POST', body: formData })

  const relativePath: string = relative(parentPath, path)
  return { repo, path, relativePath }
}

export async function openInOS ({ repo, path }: Doc) {
  return fetchHttp(`/api/open?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`)
}

export async function runCode (language: string, code: string, callback?: { name: string, handler: (res: string) => void }) {
  if (['js', 'javascript'].includes(language.toLowerCase())) {
    const loggerName = callback ? `${callback.name}_${Date.now()}` : ''
    if (loggerName) {
      Object.keys(window).forEach(key => {
        if (key.startsWith(callback!.name)) {
          delete (window as any)[key]
        }
      })

      ;(window as any)[loggerName] = (...args: any[]) => {
        callback?.handler(args.map((arg) => {
          if (['boolean', 'number', 'bigint', 'string', 'symbol', 'function'].includes(typeof arg)) {
            return arg.toString()
          } else {
            return JSON.stringify(arg)
          }
        }).join(' '))
      }
    }

    await eval(`(async () => {
      const console = new Proxy(window.console, {
        get: (obj, prop) => ['error', 'warn', 'info', 'log', 'debug'].includes(prop)
          ? (...args) => {
            obj[prop](...args);
            const loggerName = '${loggerName}';
            if (loggerName && window[loggerName]) {
              window[loggerName](...args)
            }
          }
          : obj[prop]
      });
      ${code}
    })()`)

    return ''
  }

  const { data } = await fetchHttp('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, code })
  })

  callback && callback.handler(data)

  return data
}
