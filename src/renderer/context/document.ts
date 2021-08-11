import { Optional } from 'utility-types'
import Crypto from '@fe/utils/crypto'
import { useModal } from '@fe/support/modal'
import { useToast } from '@fe/support/toast'
import store from '@fe/support/store'
import type { Doc } from '@fe/support/types'
import { basename, dirname, isBelongTo, join } from '@fe/utils/path'
import { useBus } from '@fe/support/bus'
import * as api from '@fe/support/api'
import { getLogger } from '@fe/utils'
import { registerAction } from './action'

export type ActionName = 'doc.create'
  | 'doc.create'
  | 'doc.delete'
  | 'doc.move'
  | 'doc.mark'
  | 'doc.unmark'
  | 'doc.open-in-os'
  | 'doc.save'
  | 'doc.switch'
  | 'doc.show-help'

const logger = getLogger('document')
const bus = useBus()

function decrypt (content: any, password: string) {
  if (!password) {
    throw new Error('未输入解密密码')
  }

  return Crypto.decrypt(content, password)
}

function encrypt (content: any, password: string) {
  if (!password) {
    throw new Error('未输入解密密码')
  }

  return Crypto.encrypt(content, password)
}

async function inputPassword (title: string, filename: string, throwError = false) {
  const password = await useModal().input({ title, type: 'password', hint: filename })
  if (!password) {
    if (throwError) {
      throw new Error('未输入密码')
    } else {
      useToast().show('warning', '未输入密码')
    }
  }

  return password
}

export function isEncrypted (doc?: Pick<Doc, 'path'> | null) {
  return doc && doc.path.toLowerCase().endsWith('.c.md')
}

export function isSameFile (a?: Doc | null, b?: Doc | null) {
  return a && b && a.repo === b.repo && a.path === b.path
}

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
  } catch (error) {
    useToast().show('warning', error.message)
    console.error(error)
  }

  return file
}

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

  await api.moveFile(doc, newPath)

  bus.emit('doc.moved', { oldDoc: doc, newDoc })
}

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
    bus.emit('doc.saved', store.state.currentFile)
  } catch (error) {
    store.commit('setCurrentFile', { ...doc, status: 'save-failed' })
    useToast().show('warning', error.message)
    throw error
  }
}

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
  } catch (error) {
    useToast().show('warning', error.message)
    throw error
  }
}

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
  } catch (error) {
    bus.emit('doc.switch-failed', { doc, message: error.message })
    useToast().show('warning', error.message.includes('Malformed') ? '密码错误' : error.message)
    throw error
  }
}

export async function markDoc (doc: Doc) {
  await api.markFile(doc)
  bus.emit('doc.changed', doc)
}

export async function unmarkDoc (doc: Doc) {
  await api.unmarkFile(doc)
  bus.emit('doc.changed', doc)
}

export async function openInOS (doc: Doc) {
  await api.openInOS(doc)
}

export async function showHelp (doc: string) {
  switchDoc({
    type: 'file',
    repo: '__help__',
    title: doc,
    name: doc,
    path: doc,
  })
}

registerAction({ name: 'doc.create', handler: createDoc })
registerAction({ name: 'doc.duplicate', handler: duplicateDoc })
registerAction({ name: 'doc.delete', handler: deleteDoc })
registerAction({ name: 'doc.move', handler: moveDoc })
registerAction({ name: 'doc.mark', handler: markDoc })
registerAction({ name: 'doc.unmark', handler: unmarkDoc })
registerAction({ name: 'doc.open-in-os', handler: openInOS })
registerAction({ name: 'doc.save', handler: saveDoc })
registerAction({ name: 'doc.switch', handler: switchDoc })
registerAction({ name: 'doc.show-help', handler: showHelp })
