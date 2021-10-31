import { Optional } from 'utility-types'
import * as crypto from '@fe/utils/crypto'
import { useModal } from '@fe/support/ui/modal'
import { useToast } from '@fe/support/ui/toast'
import store from '@fe/support/store'
import type { Doc } from '@fe/types'
import { basename, dirname, isBelongTo, join } from '@fe/utils/path'
import { useBus } from '@fe/core/bus'
import * as api from '@fe/support/api'
import { getLogger } from '@fe/utils'
import { inputPassword } from './base'

const logger = getLogger('document')
const bus = useBus()

function decrypt (content: any, password: string) {
  if (!password) {
    throw new Error('未输入解密密码')
  }

  return crypto.decrypt(content, password)
}

function encrypt (content: any, password: string) {
  if (!password) {
    throw new Error('未输入解密密码')
  }

  return crypto.encrypt(content, password)
}

/**
 * 判断是否是加密文档
 * @param doc 文档
 * @returns
 */
export function isEncrypted (doc?: Pick<Doc, 'path'> | null) {
  return doc && doc.path.toLowerCase().endsWith('.c.md')
}

/**
 * 判断是否在同一个仓库
 * @param a 文档 A
 * @param b 文档 B
 * @returns
 */
export function isSameRepo (a?: Doc | null, b?: Doc | null) {
  return a && b && a.repo === b.repo
}

/**
 * 判断是否是同一个文档
 * @param a 文档 A
 * @param b 文档 B
 * @returns
 */
export function isSameFile (a?: Doc | null, b?: Doc | null) {
  return a && b && a.repo === b.repo && a.path === b.path
}

/**
 * 判断文档 B 是否和文档 A 相同或是目录 A 的下级
 * @param a 文档/目录 A
 * @param b 文档 B
 * @returns
 */
export function isSubOrSameFile (a?: Doc | null, b?: Doc | null) {
  return a && b && a.repo === b.repo &&
  (
    isBelongTo(a.path, b.path) ||
    isSameFile(a, b)
  )
}

export function toUri (doc?: Doc | null) {
  if (doc && doc.repo && doc.path) {
    return encodeURI(`yank-note://${doc.repo}/${doc.path.replace(/^\//, '')}`)
  } else {
    return 'yank-note://system/blank.md'
  }
}

/**
 * 创建一个文档
 * @param doc 文档
 * @param baseDoc 文档所在目录或同级文档
 * @returns 创建的文档
 */
export async function createDoc (doc: Pick<Doc, 'repo' | 'path' | 'content'>, baseDoc: Doc): Promise<Doc>
export async function createDoc (doc: Optional<Pick<Doc, 'repo' | 'path' | 'content'>, 'path'>, baseDoc?: Doc): Promise<Doc>
export async function createDoc (doc: Optional<Pick<Doc, 'repo' | 'path' | 'content'>, 'path'>, baseDoc?: Doc) {
  if (!doc.path) {
    if (baseDoc) {
      const currentPath = baseDoc.type === 'dir' ? baseDoc.path : dirname(baseDoc.path)

      let filename = await useModal().input({
        title: '创建文件(加密文件以 .c.md 结尾)',
        hint: '文件路径',
        content: '当前路径：' + currentPath,
        value: 'new.md',
        select: true
      })

      if (!filename) {
        return
      }

      if (!filename.endsWith('.md')) {
        filename = filename.replace(/\/$/, '') + '.md'
      }

      doc.path = join(currentPath, filename)
    }
  }

  if (!doc.path) {
    throw new Error('需要传入文件路径')
  }

  const filename = basename(doc.path)

  const file: Doc = { ...doc, path: doc.path, type: 'file', name: filename, contentHash: 'new' }

  if (typeof file.content !== 'string') {
    file.content = `# ${filename.replace(/\.md$/i, '')}\n`
  }

  try {
    // 加密文件内容
    if (isEncrypted(file)) {
      const password = await inputPassword('[创建] 请输入密码', file.name)
      if (!password) {
        return
      }

      const encrypted = encrypt(file.content, password)
      file.content = encrypted.content
    }

    await api.writeFile(file, file.content)

    bus.emit('doc.created', file)
  } catch (error: any) {
    useToast().show('warning', error.message)
    console.error(error)
  }

  return file
}

/**
 * 重复一个文档
 * @param origin 源文档
 * @returns 创建的文档
 */
export async function duplicateDoc (origin: Doc) {
  let newPath = await useModal().input({
    title: '重复文件',
    hint: '目标路径',
    content: '当前路径：' + origin.path,
    value: origin.path,
    // 默认选中文件名
    select: [
      origin.path.lastIndexOf('/') + 1,
      origin.name.lastIndexOf('.') > -1 ? origin.path.lastIndexOf('.') : origin.path.length,
      'forward'
    ]
  })

  if (!newPath) {
    return
  }

  newPath = newPath.replace(/\/$/, '')

  const { content } = await api.readFile(origin)

  await createDoc({ repo: origin.repo, path: newPath, content })
}

/**
 * 删除一个文档
 * @param doc 文档
 */
export async function deleteDoc (doc: Doc) {
  if (doc.path === '/') {
    throw new Error('不能删除根目录')
  }

  const confirm = await useModal().confirm({ title: '删除文件', content: `确定要删除 [${doc.path}] 吗？` })

  if (confirm) {
    await api.deleteFile(doc)

    bus.emit('doc.deleted', doc)
  }
}

/**
 * 移动一个文档
 * @param doc 文档
 * @param newPath 新路径
 */
export async function moveDoc (doc: Doc, newPath?: string) {
  if (doc.path === '/') {
    throw new Error('不能移动根目录')
  }

  newPath = newPath ?? await useModal().input({
    title: '移动文件',
    hint: '新的路径',
    content: '当前路径：' + doc.path,
    value: doc.path,
    // 默认选中文件名
    select: [
      doc.path.lastIndexOf('/') + 1,
      doc.name.lastIndexOf('.') > -1 ? doc.path.lastIndexOf('.') : doc.path.length,
      'forward'
    ]
  })

  if (!newPath) {
    return
  }

  newPath = newPath.replace(/\/$/, '')
  const oldPath = doc.path.replace(/\/$/, '')

  if (newPath === oldPath) {
    return
  }

  const newDoc: Doc = {
    name: basename(newPath),
    path: newPath,
    repo: doc.repo,
    type: doc.type
  }

  if (isEncrypted(doc) !== isEncrypted({ path: newPath })) {
    useToast().show('warning', '加密文件和非加密文件不能互相转换')
    return
  }

  await api.moveFile(doc, newPath)

  bus.emit('doc.moved', { oldDoc: doc, newDoc })
}

/**
 * 保存一个文档
 * @param doc 文档
 * @param content 内容
 */
export async function saveDoc (doc: Doc, content: string) {
  logger.debug('saveDoc', doc)
  try {
    let sendContent = content
    let passwordHash = ''

    // 加密文件内容
    if (isEncrypted(doc)) {
      const password = await inputPassword('[保存] 请输入密码', doc.name)
      if (!password) {
        return
      }

      const encrypted = encrypt(sendContent, password)
      if (doc.passwordHash !== encrypted.passwordHash) {
        if (!(await useModal().confirm({ title: '提示', content: '密码和上一次输入的密码不一致，是否用新密码保存？' }))) {
          return
        }
      }

      sendContent = encrypted.content
      passwordHash = encrypted.passwordHash
    }

    const { hash } = await api.writeFile(doc, sendContent)
    Object.assign(doc, {
      content,
      passwordHash,
      contentHash: hash,
      status: 'saved'
    })
    bus.emit('doc.saved', store.state.currentFile!)
  } catch (error: any) {
    store.commit('setCurrentFile', { ...doc, status: 'save-failed' })
    useToast().show('warning', error.message)
    throw error
  }
}

/**
 * 确保一个文档已保存
 */
export async function ensureCurrentFileSaved () {
  const { currentFile, currentContent } = store.state
  if (!currentFile || !currentFile.status) {
    return
  }

  try {
    if (isEncrypted(currentFile)) {
      if (!store.getters.isSaved && !(await useModal().confirm({ title: '未保存文件', content: '确定要离开吗？' }))) {
        throw new Error('请先保存文件')
      } else {
        store.commit('setCurrentFile', null)
      }
    } else {
      if (currentFile && currentContent && currentFile.content !== currentContent && currentFile.repo !== '__help__') {
        await saveDoc(currentFile, currentContent)
      }
    }
  } catch (error: any) {
    useToast().show('warning', error.message)
    throw error
  }
}

/**
 * 切换文档
 * @param doc 文档
 */
export async function switchDoc (doc: Doc | null) {
  logger.debug('switchDoc', doc)

  if (toUri(doc) === toUri(store.state.currentFile)) {
    logger.debug('skip switch', doc)
    return
  }

  await ensureCurrentFileSaved()

  try {
    if (!doc) {
      store.commit('setCurrentFile', null)
      bus.emit('doc.switched', null)
      return
    }

    const timer = setTimeout(() => {
      store.commit('setCurrentFile', { ...doc, status: undefined })
    }, 150)

    let passwordHash = ''
    let { content, hash } = await api.readFile(doc)
    clearTimeout(timer)

    // 解密文件内容
    if (isEncrypted(doc)) {
      const password = await inputPassword('[打开] 请输入密码', doc.name, true)
      const decrypted = decrypt(content, password)
      content = decrypted.content
      passwordHash = decrypted.passwordHash
    }

    store.commit('setCurrentFile', {
      ...doc,
      content,
      passwordHash,
      contentHash: hash,
      status: 'loaded'
    })

    bus.emit('doc.switched', store.state.currentFile)
  } catch (error: any) {
    bus.emit('doc.switch-failed', { doc, message: error.message })
    useToast().show('warning', error.message.includes('Malformed') ? '密码错误' : error.message)
    throw error
  }
}

/**
 * 标记文档
 * @param doc 文档
 */
export async function markDoc (doc: Doc) {
  await api.markFile(doc)
  bus.emit('doc.changed', doc)
}

/**
 * 取消标记文档
 * @param doc 文档
 */
export async function unmarkDoc (doc: Doc) {
  await api.unmarkFile(doc)
  bus.emit('doc.changed', doc)
}

/**
 * 在操作系统中打开
 * @param doc 文档
 */
export async function openInOS (doc: Doc) {
  await api.openInOS(doc)
}

/**
 * 打开帮助文档
 * @param docName 文档名
 */
export async function showHelp (docName: string) {
  switchDoc({
    type: 'file',
    repo: '__help__',
    title: docName,
    name: docName,
    path: docName,
  })
}

/**
 * 显示导出面板
 */
export function showExport () {
  store.commit('setShowExport', true)
}
