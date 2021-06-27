import Crypto from './crypto'
import { slugify } from 'transliteration'
import env from './env'
import { basename, relative, extname, join } from './path'

// TODO 文件类型
type F = { repo: string; path: string };

const fetchHttp = async (input: RequestInfo, init?: RequestInit) => {
  const response = await fetch(input, init)
  const result = await response.json()
  if (result.status !== 'ok') {
    throw new Error(result.message)
  }

  return result
}

const isEncryptedFile = (file: any) => {
  return file && file.path.endsWith('.c.md')
}

const isSameFile = (a?: F | null, b?: F | null) => {
  return a && b && a.repo === b.repo && a.path === b.path
}

const toUri = (file?: F | null) => {
  if (file && file.repo && file.path) {
    return encodeURI(`yank-note://${file.repo}/${file.path.replace(/^\//, '')}`)
  } else {
    return 'yank-note://system/blank.md'
  }
}

const decrypt = (content: any, password: string) => {
  if (!password) {
    throw new Error('未输入解密密码')
  }

  return Crypto.decrypt(content, password)
}

const encrypt = (content: any, password: string) => {
  if (!password) {
    throw new Error('未输入解密密码')
  }

  return Crypto.encrypt(content, password)
}

const read = async ({ path, repo }: F) => {
  const result = await fetchHttp(`/api/file?path=${encodeURIComponent(path)}&repo=${encodeURIComponent(repo)}`)
  const hash = result.data.hash
  const content = result.data.content

  return { content, hash }
}

const write = async ({ repo, path }: F, content: any, oldHash: string) => {
  const result = await fetchHttp('/api/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, path, content, old_hash: oldHash })
  })

  return { hash: result.data }
}

const move = async ({ repo, path }: F, newPath: string) => {
  return fetchHttp('/api/file', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: repo, oldPath: path, newPath })
  })
}

const deleteFile = async ({ path, repo }: F) => {
  return fetchHttp(`/api/file?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'DELETE' })
}

const mark = async ({ path, repo }: F) => {
  return fetchHttp(`/api/mark?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'POST' })
}

const unmark = async ({ path, repo }: F) => {
  return fetchHttp(`/api/mark?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'DELETE' })
}

const markedFiles = async () => {
  const { data } = await fetchHttp('/api/mark')
  return data
}

const fetchTree = async (repo: string) => {
  const result = await fetchHttp(`/api/tree?repo=${repo}`)
  return result.data
}

const fetchHelpContent = async (doc: string) => {
  const result = await fetchHttp('/api/help?doc=' + doc)
  return result.data.content
}

const fetchRepositories = async () => {
  const result = await fetchHttp('/api/repositories')
  return result.data
}

const fetchSettings = async () => {
  const result = await fetchHttp('/api/settings')
  return result.data
}

const writeSettings = (body: any) => {
  return fetchHttp('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

const choosePath = async (args: any) => {
  const from = env.isElectron ? 'electron' : 'browser'
  const result = await fetchHttp(`/api/choose?from=${from}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  })
  return result.data
}

const search = async (repo: string, text: string) => {
  const result = await fetchHttp(`/api/search?repo=${repo}&search=${encodeURIComponent(text)}`)
  return result.data
}

const upload = async (repo: string, belongPath: string, uploadFile: any, name: string | null = null): Promise<{repo: string; path: string; relativePath: string}> => {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.readAsBinaryString(uploadFile)
    fr.onloadend = async () => {
      try {
        const filename = name || Crypto.binMd5(fr.result).substr(0, 8) + extname(uploadFile.name)

        const formData = new FormData()
        const dirName = slugify(basename(belongPath))
        const path = join(belongPath, 'FILES', dirName.startsWith('.') ? 'upload' : dirName, filename)
        formData.append('repo', repo)
        formData.append('path', path)
        formData.append('attachment', uploadFile)

        await fetchHttp('/api/attachment', { method: 'POST', body: formData })

        const relativePath = relative(belongPath, path)
        resolve({ repo, path, relativePath })
      } catch (error) {
        reject(error)
      }
    }
  })
}

const openInOS = async ({ repo, path }: F) => {
  return fetchHttp(`/api/open?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`)
}

const toBase64URL = async (file: any) => new Promise((resolve, reject) => {
  const fr = new FileReader()
  fr.readAsDataURL(file)
  fr.onload = () => resolve(fr.result)
  fr.onerror = error => reject(error)
})

export default {
  isSameFile,
  isEncryptedFile,
  toUri,
  decrypt,
  encrypt,
  read,
  write,
  move,
  delete: deleteFile,
  fetchTree,
  fetchRepositories,
  fetchHelpContent,
  fetchSettings,
  writeSettings,
  choosePath,
  openInOS,
  search,
  upload,
  mark,
  unmark,
  markedFiles,
  toBase64URL,
}
