import Crypto from './Crypto'
import { slugify } from 'transliteration'

const fetchHttp = async (...params) => {
  const response = await fetch(...params)
  const result = await response.json()
  if (result.status !== 'ok') {
    throw new Error(result.message)
  }

  return result
}

const isBelongTo = (path, sub) => {
  return sub.startsWith(path.replace(/\/$/, '') + '/')
}

const isEncryptedFile = file => {
  return file && file.path.endsWith('.c.md')
}

const isSameFile = (a, b) => {
  return a && b && a.repo === b.repo && a.path === b.path
}

const dirname = path => {
  return path.substr(0, path.lastIndexOf('/'))
}

const basename = path => {
  return path.substr(path.lastIndexOf('/') + 1)
}

const extname = path => {
  return path.substr(path.lastIndexOf('.'))
}

const toUri = (file) => {
  if (file && file.repo && file.path) {
    return encodeURI(`yank-note://${file.repo}/${file.path.replace(/^\//, '')}`)
  } else {
    return 'yank-note://system/blank.md'
  }
}

const decrypt = (content, password) => {
  if (!password) {
    throw new Error('未输入解密密码')
  }

  return Crypto.decrypt(content, password)
}

const encrypt = (content, password) => {
  if (!password) {
    throw new Error('未输入解密密码')
  }

  return Crypto.encrypt(content, password)
}

const read = async ({ path, repo }) => {
  const result = await fetchHttp(`/api/file?path=${encodeURIComponent(path)}&repo=${encodeURIComponent(repo)}`)
  const hash = result.data.hash
  let content = result.data.content

  return { content, hash }
}

const write = async ({ repo, path }, content, oldHash) => {
  const result = await fetchHttp('/api/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, path, content, old_hash: oldHash })
  })

  return { hash: result.data }
}

const move = async ({ repo, path }, newPath) => {
  return fetchHttp('/api/file', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: repo, oldPath: path, newPath })
  })
}

const deleteFile = async ({ path, repo }) => {
  return fetchHttp(`/api/file?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'DELETE' })
}

const mark = async ({ path, repo }) => {
  return fetchHttp(`/api/mark?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'POST' })
}

const unmark = async ({ path, repo }) => {
  return fetchHttp(`/api/mark?path=${encodeURIComponent(path)}&repo=${repo}`, { method: 'DELETE' })
}

const markedFiles = async () => {
  const { data } = await fetchHttp('/api/mark')
  return data
}

const fetchTree = async repo => {
  const result = await fetchHttp(`/api/tree?repo=${repo}`)
  return result.data
}

const fetchHelpContent = async (doc) => {
  const result = await fetchHttp('/api/help?doc=' + doc)
  return result.data.content
}

const fetchRepositories = async () => {
  const result = await fetchHttp('/api/repositories')
  return result.data
}

const search = async (repo, text) => {
  const result = await fetchHttp(`/api/search?repo=${repo}&search=${encodeURIComponent(text)}`)
  return result.data
}

const upload = async (repo, belongPath, uploadFile, name = null) => {
  return new Promise((resolve, reject) => {
    belongPath = belongPath.replace(/\\/g, '/')

    const fr = new FileReader()
    fr.readAsBinaryString(uploadFile)
    fr.onloadend = async () => {
      try {
        const filename = name || Crypto.binMd5(fr.result).substr(0, 8) + extname(uploadFile.name)

        const formData = new FormData()
        const path = belongPath.replace(/\/([^/]*)$/, (_, capture) => `/FILES/${slugify(capture)}/` + filename)
        formData.append('repo', repo)
        formData.append('path', path)
        formData.append('attachment', uploadFile)

        await fetchHttp('/api/attachment', { method: 'POST', body: formData })

        // TODO 更好的相对路径算法
        const relativePath = path.replace(belongPath.substr(0, belongPath.lastIndexOf('/')), '.')
        resolve({ repo, path, relativePath })
      } catch (error) {
        reject(error)
      }
    }
  })
}

const openInOS = async ({ repo, path }) => {
  return fetchHttp(`/api/open?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`)
}

export default {
  isBelongTo,
  isSameFile,
  isEncryptedFile,
  dirname,
  basename,
  extname,
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
  openInOS,
  search,
  upload,
  mark,
  unmark,
  markedFiles,
}
