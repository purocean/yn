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
 * 代理请求，用于涉及跨域请求的地方
 * @param url URL
 * @param reqOptions 请求参数
 * @param usePost 是否使用 post 请求发送此次代理请求
 * @returns 响应
 */
export function proxyRequest (url: string, reqOptions: Record<string, any> = {}, usePost = false) {
  if (usePost) {
    return fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        options: reqOptions
      })
    })
  }

  const options = encodeURIComponent(JSON.stringify(reqOptions))
  return fetch(`/api/proxy?url=${encodeURIComponent(url)}&options=${options}`)
}

/**
 * 获取帮助文档
 * @param docName 文档名
 * @returns 文档内容
 */
async function fetchHelpContent (docName: string) {
  const result = await fetchHttp('/api/help?doc=' + docName)
  return { content: result.data.content, hash: '' }
}

/**
 * 读取一个文件
 * @param file 文件
 * @returns 文件内容
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
 * 写入一个文件
 * @param file 文件
 * @param content 文件内容
 * @returns 写入结果
 */
export async function writeFile (file: Doc, content: string) {
  const { repo, path, contentHash } = file
  const result = await fetchHttp('/api/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, path, content, old_hash: contentHash })
  })

  return { hash: result.data }
}

/**
 * 移动一个文件或目录
 * @param file 文件或目录
 * @param newPath 新的路径
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
 * 删除一个文件或目录
 * @param file 文件或目录
 * @returns
 */
export async function deleteFile (file: FileItem): Promise<ApiResult<any>> {
  const { path, repo } = file
  return fetchHttp(`/api/file?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'DELETE' })
}

/**
 * 标记一个文件
 * @param file 文件
 * @returns
 */
export async function markFile (file: FileItem): Promise<ApiResult<any>> {
  const { path, repo } = file
  return fetchHttp(`/api/mark?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'POST' })
}

/**
 * 取消标记文件
 * @param file 文件
 * @returns
 */
export async function unmarkFile (file: FileItem): Promise<ApiResult<any>> {
  const { path, repo } = file
  return fetchHttp(`/api/mark?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'DELETE' })
}

/**
 * 获取标记的文件
 * @returns 标记的文件
 */
export async function fetchMarkedFiles (): Promise<FileItem[]> {
  const { data } = await fetchHttp('/api/mark')
  return data.map((x: PathItem) => ({ ...x, name: basename(x.path) }))
}

/**
 * 获取一个仓库的目录树
 * @param repo 仓库名
 * @returns 目录树
 */
export async function fetchTree (repo: string): Promise<Components.Tree.Node[]> {
  const result = await fetchHttp(`/api/tree?repo=${repo}`)
  return result.data
}

/**
 * 获取仓库列表
 * @returns 仓库列表
 */
export async function fetchRepositories () {
  const result = await fetchHttp('/api/repositories')
  return result.data as Record<string, string>
}

/**
 * 获取配置信息
 * @returns 配置
 */
export async function fetchSettings (): Promise<Record<string, any>> {
  const result = await fetchHttp('/api/settings')
  return result.data
}

/**
 * 写入配置信息
 * @param data 配置信息
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
 * 调起应用选择一个路径
 * @param options 参数
 * @returns 选择结果
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
 * 在一个仓库中搜索
 * @param repo 仓库名
 * @param text 搜索文本
 * @returns 搜索结果
 */
export async function search (repo: string, text: string): Promise<Pick<Doc, 'repo' | 'type' | 'path' | 'name'>> {
  const result = await fetchHttp(`/api/search?repo=${repo}&search=${encodeURIComponent(text)}`)
  return result.data
}

/**
 * 上传文件
 * @param repo 仓库名
 * @param fileBase64Url 文件的 Base64 数据
 * @param filePath 上传到的路径
 */
export async function upload (repo: string, fileBase64Url: string, filePath: string): Promise<ApiResult<any>> {
  const formData = new FormData()
  formData.append('repo', repo)
  formData.append('path', filePath)
  formData.append('attachment', fileBase64Url)

  return fetchHttp('/api/attachment', { method: 'POST', body: formData })
}

/**
 * 在操作系统中打开
 * @param file 文件或目录
 * @returns
 */
export async function openInOS (file: FileItem): Promise<ApiResult<any>> {
  const { repo, path } = file
  return fetchHttp(`/api/open?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`)
}

/**
 * 写入一个临时文件
 * @param name 临时文件名
 * @param data 数据
 * @param asBase64 是否作为 Base64 传输数据
 * @returns 写入结果
 */
export async function writeTmpFile (name: string, data: string, asBase64 = false): Promise<ApiResult<{ path: string }>> {
  return fetchHttp(
    `/api/tmp-file?name=${encodeURIComponent(name)}${asBase64 ? '&asBase64=true' : ''}`,
    { method: 'post', body: data }
  )
}

/**
 * 读取一个临时文件
 * @param name 临时文件名
 * @returns 数据
 */
export async function readTmpFile (name: string): Promise<Response> {
  return fetchHttp(`/api/tmp-file?name=${encodeURIComponent(name)}`)
}

/**
 * 删除一个临时文件
 * @param name 临时文件名
 * @returns
 */
export async function deleteTmpFile (name: string): Promise<ApiResult<any>> {
  return fetchHttp(
    `/api/tmp-file?name=${encodeURIComponent(name)}`,
    { method: 'delete' }
  )
}

/**
 * 运行一段代码
 * @param language 语言
 * @param code 代码
 * @param callback 回调
 * @returns 运行结果（Js 无运行结果）
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
