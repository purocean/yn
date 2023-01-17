import type { Stats } from 'fs'
import type { WatchOptions } from 'chokidar'
import type { IProgressMessage, ISerializedFileMatch, ISerializedSearchSuccess, ITextQuery } from 'ripgrep-wrapper'
import type { Components, Doc, ExportType, FileItem, FileSort, FileStat, PathItem } from '@fe/types'
import { isElectron } from '@fe/support/env'
import { JWT_TOKEN } from './args'

export type ApiResult<T = any> = {
  status: 'ok' | 'error',
  message: string,
  data: T,
}

function getAuthHeader (): Record<string, string> {
  return JWT_TOKEN ? { Authorization: 'Bearer ' + JWT_TOKEN } : {}
}

export async function fetchHttp (input: RequestInfo, init?: RequestInit) {
  if (!init) {
    init = {}
  }

  init.headers = { ...init.headers, ...getAuthHeader() }

  const response = await fetch(input, init)

  if (!response.headers.get('content-type')?.includes('json')) {
    return response
  }

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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({
        url: url,
        options: reqOptions
      })
    })
  } else {
    const options = encodeURIComponent(JSON.stringify(reqOptions))
    res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}&options=${options}`, {
      headers: getAuthHeader()
    })
  }

  if (res.headers.get('x-yank-note-api-status') === 'error') {
    const msg = res.headers.get('x-yank-note-api-message') || 'error'
    throw new Error(decodeURIComponent(msg))
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
  return { content: result.data.content, hash: '', stat: { mtime: 0, birthtime: 0, size: 0 } }
}

/**
 * Read a file.
 * @param file
 * @param asBase64
 * @returns
 */
export async function readFile (file: PathItem, asBase64 = false): Promise<{content: string, hash: string, stat: FileStat}> {
  const { path, repo } = file

  if (repo === '__help__') {
    return await fetchHelpContent(path)
  }

  const url = `/api/file?path=${encodeURIComponent(path)}&repo=${encodeURIComponent(repo)}${asBase64 ? '&asBase64=true' : ''}`
  const { data } = await fetchHttp(url)

  return data
}

/**
 * Write content to a file.
 * @param file
 * @param content
 * @param asBase64
 * @returns
 */
export async function writeFile (file: Doc, content = '', asBase64 = false): Promise<{ hash: string, stat: FileStat }> {
  const { repo, path, contentHash } = file
  const { data } = await fetchHttp('/api/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, path, content, oldHash: contentHash, asBase64 })
  })

  return data
}

/**
 * Move / Rename a file or dir.
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
 * Copy a file
 * @param file
 * @param newPath
 * @returns
 */
export async function copyFile (file: FileItem, newPath: string): Promise<ApiResult<any>> {
  const { path, repo } = file
  return fetchHttp('/api/file', {
    method: 'PUT',
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
  return fetchHttp(`/api/file?path=${encodeURIComponent(path)}&repo=${encodeURIComponent(repo)}`, { method: 'DELETE' })
}

export async function fetchHistoryList (file: PathItem): Promise<{name: string, comment: string}[]> {
  const { path, repo } = file
  const { data } = await fetchHttp(`/api/history/list?path=${encodeURIComponent(path)}&repo=${encodeURIComponent(repo)}`)
  return data
}

export async function fetchHistoryContent (file: PathItem, version: string): Promise<string> {
  const { path, repo } = file
  const { data } = await fetchHttp(`/api/history/content?path=${encodeURIComponent(path)}&repo=${encodeURIComponent(repo)}&version=${encodeURIComponent(version)}`)
  return data
}

export async function deleteHistoryVersion (file: PathItem, version: string) {
  const { path, repo } = file
  const { data } = await fetchHttp('/api/history/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, path, version })
  })
  return data
}

export async function commentHistoryVersion (file: PathItem, version: string, msg: string) {
  const { path, repo } = file
  const { data } = await fetchHttp('/api/history/comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, path, version, msg })
  })
  return data
}

/**
 * Fetch file tree from a repository.
 * @param repo
 * @returns
 */
export async function fetchTree (repo: string, sort: FileSort): Promise<Components.Tree.Node[]> {
  const result = await fetchHttp(`/api/tree?repo=${encodeURIComponent(repo)}&sort=${sort.by}-${sort.order}`)
  return result.data
}

/**
 * Fetch custom styles.
 * @returns
 */
export async function fetchCustomStyles (): Promise<string[]> {
  const result = await fetchHttp('/api/custom-styles')
  return result.data
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

type SearchReturn = (
  onResult: (result: ISerializedFileMatch[]) => void,
  onMessage?: (message: IProgressMessage) => void
) => Promise<ISerializedSearchSuccess | null>

async function readReader<R = any, S = any, M = any> (
  reader: ReadableStreamDefaultReader,
  onResult: (result: R) => void,
  onMessage?: (message: M) => void
): Promise<S | null> {
  let val = ''

  // read stream
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      return null
    }

    val += new TextDecoder().decode(value)

    const idx = val.lastIndexOf('\n')
    if (idx === -1) {
      continue
    }

    const lines = val.slice(0, idx)
    val = val.slice(idx + 1)

    for (const line of lines.split('\n')) {
      const data = JSON.parse(line)

      switch (data.type) {
        case 'result':
          onResult(data.payload)
          break
        case 'message':
          onMessage?.(data.payload)
          break
        case 'done':
          return data.payload
        default:
          throw data.payload
      }
    }
  }
}

/**
 * Search files.
 * @param controller
 * @param query
 * @returns
 */
export async function search (controller: AbortController, query: ITextQuery): Promise<SearchReturn> {
  const response = await fetchHttp('/api/search', {
    signal: controller.signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  })

  return async function (onResult, onMessage) {
    const reader: ReadableStreamDefaultReader = response.body.getReader()
    return readReader<ISerializedFileMatch[], ISerializedSearchSuccess, IProgressMessage>(
      reader,
      onResult,
      onMessage
    )
  }
}

/**
 * Watch a file.
 * @param controller
 * @param query
 * @returns
 */
export async function watchFile (
  repo: string,
  path: string,
  options: WatchOptions,
  onResult: (result: { eventName: 'add' | 'change' | 'unlink', path: string, stats?: Stats }) => void
) {
  const controller: AbortController = new AbortController()

  const response = await fetchHttp('/api/watch-file', {
    signal: controller.signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, path, options })
  })

  const reader: ReadableStreamDefaultReader = response.body.getReader()
  const result: Promise<string | null> = readReader(reader, onResult)
  const abort = () => controller.abort()

  return { result, abort }
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
 * Convert file
 * @param source
 * @param fromType
 * @param toType
 * @param resourcePath
 * @returns
 */
export async function convertFile (
  source: string,
  fromType: 'html' | 'markdown',
  toType: Exclude<ExportType, 'pdf'>,
  resourcePath: string,
): Promise<Response> {
  return fetchHttp(`/api/convert/export.${toType}`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, fromType, toType, resourcePath }),
  })
}

/**
 * Run code.
 * @param cmd
 * @param code
 * @param outputStream
 * @returns result
 */
export async function runCode (cmd: string | { cmd: string, args: string[] }, code: string, outputStream: true): Promise<ReadableStreamDefaultReader>
export async function runCode (cmd: string | { cmd: string, args: string[] }, code: string, outputStream?: false): Promise<string>
export async function runCode (cmd: string | { cmd: string, args: string[] }, code: string, outputStream = false): Promise<ReadableStreamDefaultReader | string> {
  const response = await fetchHttp('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd, code })
  })

  if (outputStream) {
    return response.body.getReader()
  } else {
    return response.text()
  }
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

/**
 * Fetch installed extensions
 * @returns
 */
export async function fetchInstalledExtensions (): Promise<{id: string, enabled: boolean, isDev?: boolean}[]> {
  const { data } = await fetchHttp('/api/extensions')
  return data
}

/**
 * Install extension
 * @param id
 * @param url
 * @returns
 */
export async function installExtension (id: string, url: string): Promise<any> {
  return fetchHttp(`/api/extensions/install?id=${encodeURIComponent(id)}&url=${encodeURIComponent(url)}`, { method: 'POST' })
}

/**
 * Abort extension installation
 * @returns
 */
export async function abortExtensionInstallation (): Promise<any> {
  return fetchHttp('/api/extensions/abort-installation', { method: 'DELETE' })
}

/**
 * Uninstall extension
 * @param id
 * @returns
 */
export async function uninstallExtension (id: string): Promise<any> {
  return fetchHttp(`/api/extensions/uninstall?id=${encodeURIComponent(id)}`, { method: 'POST' })
}

/**
 * Enable extension
 * @param id
 * @returns
 */
export async function enableExtension (id: string): Promise<any> {
  return fetchHttp(`/api/extensions/enable?id=${encodeURIComponent(id)}`, { method: 'POST' })
}

/**
 * Disable extension
 * @param id
 * @returns
 */
export async function disableExtension (id: string): Promise<any> {
  return fetchHttp(`/api/extensions/disable?id=${encodeURIComponent(id)}`, { method: 'POST' })
}
