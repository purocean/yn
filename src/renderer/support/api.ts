import type { Components, Doc, FileItem, PathItem } from '@fe/types'
import { isElectron } from '@fe/support/env'
import { basename } from '@fe/utils/path'

export type ApiResult<T = any> = {
  status: 'ok' | 'error',
  message: string,
  data: T,
}

async function fetchHttp (input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init)

  let result: any = null
  try {
    result = await response.json()
  } catch (error) {
    return response
  }

  if (result.status && result.status !== 'ok') {
    throw new Error(result.message)
  }

  return result
}

/**
 * Proxy request.
 * @param url URL
 * @param reqOptions
 * @param usePost
 * @returns
 */
export async function proxyRequest (url: string, reqOptions: Record<string, any> = {}, usePost = false) {
  let res: Response
  if (usePost) {
    res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        options: reqOptions
      })
    })
  } else {
    const options = encodeURIComponent(JSON.stringify(reqOptions))
    res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}&options=${options}`)
  }

  if (res.headers.get('x-yank-note-api-status') === 'error') {
    throw new Error(res.headers.get('x-yank-note-api-message') || 'error')
  }

  return res
}

/**
 * Fetch help file content.
 * @param docName
 * @returns
 */
async function fetchHelpContent (docName: string) {
  const result = await fetchHttp('/api/help?doc=' + docName)
  return { content: result.data.content, hash: '' }
}

/**
 * Read a file.
 * @param file
 * @returns
 */
export async function readFile (file: PathItem) {
  const { path, repo } = file

  if (repo === '__help__') {
    return await fetchHelpContent(path)
  }

  const result = await fetchHttp(`/api/file?path=${encodeURIComponent(path)}&repo=${encodeURIComponent(repo)}`)
  const hash = result.data.hash
  const content = result.data.content

  return { content, hash }
}

/**
 * Write content to a file.
 * @param file
 * @param content
 * @returns
 */
export async function writeFile (file: Doc, content = '') {
  const { repo, path, contentHash } = file
  const result = await fetchHttp('/api/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, path, content, old_hash: contentHash })
  })

  return { hash: result.data }
}

/**
 * Move / Remove a file or dir.
 * @param file
 * @param newPath
 * @returns
 */
export async function moveFile (file: FileItem, newPath: string): Promise<ApiResult<any>> {
  const { path, repo } = file
  return fetchHttp('/api/file', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: repo, oldPath: path, newPath })
  })
}

/**
 * Delete a file or dir.
 * @param file
 * @returns
 */
export async function deleteFile (file: FileItem): Promise<ApiResult<any>> {
  const { path, repo } = file
  return fetchHttp(`/api/file?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'DELETE' })
}

/**
 * Mark a file.
 * @param file
 * @returns
 */
export async function markFile (file: FileItem): Promise<ApiResult<any>> {
  const { path, repo } = file
  return fetchHttp(`/api/mark?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'POST' })
}

/**
 * Unmark a file.
 * @param file
 * @returns
 */
export async function unmarkFile (file: FileItem): Promise<ApiResult<any>> {
  const { path, repo } = file
  return fetchHttp(`/api/mark?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'DELETE' })
}

/**
 * Fetch marked files.
 * @returns
 */
export async function fetchMarkedFiles (): Promise<FileItem[]> {
  const { data } = await fetchHttp('/api/mark')
  return data.map((x: PathItem) => ({ ...x, name: basename(x.path) }))
}

/**
 * Fetch file tree from a repository.
 * @param repo
 * @returns
 */
export async function fetchTree (repo: string): Promise<Components.Tree.Node[]> {
  const result = await fetchHttp(`/api/tree?repo=${repo}`)
  return result.data
}

/**
 * Fetch repositories.
 * @returns
 */
export async function fetchRepositories () {
  const result = await fetchHttp('/api/repositories')
  return result.data as Record<string, string>
}

/**
 * Fetch settings.
 * @returns
 */
export async function fetchSettings (): Promise<Record<string, any>> {
  const result = await fetchHttp('/api/settings')
  return result.data
}

/**
 * Write settings.
 * @param data
 * @returns
 */
export async function writeSettings (data: Record<string, any>): Promise<ApiResult<any>> {
  return fetchHttp('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
}

/**
 * Launch app to choose a path.
 * @param options
 * @returns
 */
export async function choosePath (options: Record<string, any>): Promise<{ canceled: boolean; filePaths: string[] }> {
  const from = isElectron ? 'electron' : 'browser'
  const result = await fetchHttp(`/api/choose?from=${from}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  })

  return result.data
}

/**
 * Search in a repository.
 * @param repo
 * @param text
 * @returns
 */
export async function search (repo: string, text: string): Promise<Pick<Doc, 'repo' | 'type' | 'path' | 'name'>> {
  const result = await fetchHttp(`/api/search?repo=${repo}&search=${encodeURIComponent(text)}`)
  return result.data
}

/**
 * Upload file.
 * @param repo
 * @param fileBase64Url
 * @param filePath
 */
export async function upload (repo: string, fileBase64Url: string, filePath: string): Promise<ApiResult<any>> {
  const formData = new FormData()
  formData.append('repo', repo)
  formData.append('path', filePath)
  formData.append('attachment', fileBase64Url)

  return fetchHttp('/api/attachment', { method: 'POST', body: formData })
}

/**
 * Open file in OS.
 * @param file
 * @param reveal
 * @returns
 */
export async function openInOS (file: FileItem, reveal?: boolean): Promise<ApiResult<any>> {
  const { repo, path } = file
  return fetchHttp(`/api/open?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}&reveal=${reveal ? 'true' : ''}`)
}

/**
 * Write temporary file.
 * @param name
 * @param data
 * @param asBase64
 * @returns
 */
export async function writeTmpFile (name: string, data: string, asBase64 = false): Promise<ApiResult<{ path: string }>> {
  return fetchHttp(
    `/api/tmp-file?name=${encodeURIComponent(name)}${asBase64 ? '&asBase64=true' : ''}`,
    { method: 'post', body: data }
  )
}

/**
 * Read temporary file.
 * @param name
 * @returns
 */
export async function readTmpFile (name: string): Promise<Response> {
  return fetchHttp(`/api/tmp-file?name=${encodeURIComponent(name)}`)
}

/**
 * Remove temporary file.
 * @param name
 * @returns
 */
export async function deleteTmpFile (name: string): Promise<ApiResult<any>> {
  return fetchHttp(
    `/api/tmp-file?name=${encodeURIComponent(name)}`,
    { method: 'delete' }
  )
}

/**
 * Run code.
 * @param language
 * @param code
 * @param callback
 * @returns result (javascript no result)
 */
export async function runCode (language: string, code: string, callback?: { name: string, handler: (res: string) => void }): Promise<string> {
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

    // eslint-disable-next-line no-eval
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

/**
 * Eval cade on Electron main process
 *
 * await ctx.api.rpc('return 1 + 1') // result 2
 * await ctx.api.rpc(`return require('os').platform()`) // result 'darwin'
 * await ctx.api.rpc(`return require('./constant').APP_NAME`) // result 'yank-note'
 *
 * @param code Function body
 */
export async function rpc (code: string) {
  const { data } = await fetchHttp('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })

  return data
}
