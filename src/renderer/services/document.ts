import { Fragment, h } from 'vue'
import { Optional } from 'utility-types'
import { URI } from 'monaco-editor/esm/vs/base/common/uri.js'
import * as crypto from '@fe/utils/crypto'
import { useModal } from '@fe/support/ui/modal'
import { useToast } from '@fe/support/ui/toast'
import store from '@fe/support/store'
import type { Doc, PathItem } from '@fe/types'
import { basename, dirname, isBelongTo, join, normalizeSep } from '@fe/utils/path'
import { getActionHandler } from '@fe/core/action'
import { triggerHook } from '@fe/core/hook'
import * as api from '@fe/support/api'
import { getLogger } from '@fe/utils'
import { getRepo, inputPassword, openPath, showItemInFolder } from './base'
import { t } from './i18n'
import { getSetting, setSetting } from './setting'

const logger = getLogger('document')

function decrypt (content: any, password: string) {
  if (!password) {
    throw new Error(t('no-password'))
  }

  return crypto.decrypt(content, password)
}

function encrypt (content: any, password: string) {
  if (!password) {
    throw new Error(t('no-password'))
  }

  return crypto.encrypt(content, password)
}

/**
 * Get absolutePath of document
 * @param doc
 * @returns
 */
export function getAbsolutePath (doc: Doc) {
  return join(getRepo(doc.repo)?.path || '/', doc.path)
}

/**
 * Determine if the document is encrypted.
 * @param doc
 * @returns
 */
export function isEncrypted (doc?: Pick<Doc, 'path'> | null): boolean {
  return !!(doc && doc.path.toLowerCase().endsWith('.c.md'))
}

/**
 * Determine if it is in the same repository.
 * @param docA
 * @param docB
 * @returns
 */
export function isSameRepo (docA?: Doc | null, docB?: Doc | null) {
  return docA && docB && docA.repo === docB.repo
}

/**
 * Determine if it is the same document.
 * @param docA
 * @param docB
 * @returns
 */
export function isSameFile (docA?: Doc | null, docB?: Doc | null) {
  return docA && docB && docA.repo === docB.repo && docA.path === docB.path
}

/**
 * Determine whether document B is the same as document A or a subordinate to directory A.
 * @param docA
 * @param docB
 * @returns
 */
export function isSubOrSameFile (docA?: Doc | null, docB?: Doc | null) {
  return docA && docB && docA.repo === docB.repo &&
  (
    isBelongTo(docA.path, docB.path) ||
    isSameFile(docA, docB)
  )
}

/**
 * Get file URI.
 * @param doc
 * @returns
 */
export function toUri (doc?: Doc | null): string {
  if (doc && doc.repo && doc.path) {
    return URI.parse(`yank-note://${doc.repo}/${doc.path.replace(/^\//, '')}`).toString()
  } else {
    return 'yank-note://system/blank.md'
  }
}

/**
 * Create a document.
 * @param doc
 * @param baseDoc
 * @returns
 */
export async function createDoc (doc: Pick<Doc, 'repo' | 'path' | 'content'>, baseDoc: Doc): Promise<Doc>
export async function createDoc (doc: Optional<Pick<Doc, 'repo' | 'path' | 'content'>, 'path'>, baseDoc?: Doc): Promise<Doc>
export async function createDoc (doc: Optional<Pick<Doc, 'repo' | 'path' | 'content'>, 'path'>, baseDoc?: Doc) {
  if (!doc.path) {
    if (baseDoc) {
      const currentPath = baseDoc.type === 'dir' ? baseDoc.path : dirname(baseDoc.path)

      let filename = await useModal().input({
        title: t('document.create-dialog.title'),
        hint: t('document.create-dialog.hint'),
        content: t('document.current-path', currentPath),
        value: 'new.md',
        select: true
      })

      if (!filename) {
        return
      }

      if (!filename.endsWith('.md')) {
        filename = filename.replace(/\/$/, '') + '.md'
      }

      doc.path = join(currentPath, normalizeSep(filename))
    }
  }

  if (!doc.path) {
    throw new Error('Need path')
  }

  const filename = basename(doc.path)

  const file: Doc = { ...doc, path: doc.path, type: 'file', name: filename, contentHash: 'new' }

  if (typeof file.content !== 'string') {
    file.content = `# ${filename.replace(/\.md$/i, '')}\n`
  }

  try {
    if (isEncrypted(file)) {
      const password = await inputPassword(t('document.password-create'), file.name)
      if (!password) {
        return
      }

      const encrypted = encrypt(file.content, password)
      file.content = encrypted.content
    }

    await api.writeFile(file, file.content)

    triggerHook('DOC_CREATED', { doc: file })
  } catch (error: any) {
    useToast().show('warning', error.message)
    console.error(error)
  }

  return file
}

/**
 * Create a dir.
 * @param doc
 * @param baseDoc
 * @returns
 */
export async function createDir (doc: Pick<Doc, 'repo' | 'path' | 'content'>, baseDoc: Doc): Promise<Doc>
export async function createDir (doc: Optional<Pick<Doc, 'repo' | 'path' | 'content'>, 'path'>, baseDoc?: Doc): Promise<Doc>
export async function createDir (doc: Optional<Pick<Doc, 'repo' | 'path' | 'content'>, 'path'>, baseDoc?: Doc) {
  if (!doc.path) {
    if (baseDoc) {
      const currentPath = baseDoc.type === 'dir' ? baseDoc.path : dirname(baseDoc.path)

      const name = await useModal().input({
        title: t('document.create-dir-dialog.title'),
        hint: t('document.create-dir-dialog.hint'),
        content: t('document.current-path', currentPath),
        value: 'new-folder',
        select: true
      })

      if (!name) {
        return
      }

      doc.path = join(currentPath, normalizeSep(name), '/')
    }
  }

  if (!doc.path) {
    throw new Error('Need path')
  }

  const name = basename(doc.path)

  const dir: Doc = { ...doc, path: doc.path, type: 'dir', name, contentHash: 'new' }

  try {
    await api.writeFile(dir)

    triggerHook('DOC_CREATED', { doc: dir })
  } catch (error: any) {
    useToast().show('warning', error.message)
    console.error(error)
  }

  return dir
}

/**
 * Duplicate a document.
 * @param originDoc
 * @returns
 */
export async function duplicateDoc (originDoc: Doc) {
  let newPath = await useModal().input({
    title: t('document.duplicate-dialog.title'),
    hint: t('document.duplicate-dialog.hint'),
    content: t('document.current-path', originDoc.path),
    value: originDoc.path,
    // default select file basename.
    select: [
      originDoc.path.lastIndexOf('/') + 1,
      originDoc.name.lastIndexOf('.') > -1 ? originDoc.path.lastIndexOf('.') : originDoc.path.length,
      'forward'
    ]
  })

  if (!newPath) {
    return
  }

  newPath = newPath.replace(/\/$/, '')

  const { content } = await api.readFile(originDoc)

  await createDoc({ repo: originDoc.repo, path: newPath, content })
}

/**
 * Delete a document.
 * @param doc
 */
export async function deleteDoc (doc: Doc) {
  if (doc.path === '/') {
    throw new Error('Could\'t delete root dir.')
  }

  await ensureCurrentFileSaved()

  const confirm = await useModal().confirm({
    title: t('document.delete-dialog.title'),
    content: t('document.delete-dialog.content', doc.path),
  })

  if (confirm) {
    try {
      await api.deleteFile(doc)
    } catch (error: any) {
      useToast().show('warning', error.message)
      throw error
    }

    triggerHook('DOC_DELETED', { doc })
  }
}

/**
 * Move or rename a document.
 * @param doc
 * @param newPath
 */
export async function moveDoc (doc: Doc, newPath?: string) {
  if (doc.path === '/') {
    throw new Error('Could\'t move/rename root dir.')
  }

  await ensureCurrentFileSaved()

  newPath ??= await useModal().input({
    title: t('document.move-dialog.title'),
    hint: t('document.move-dialog.content'),
    content: t('document.current-path', doc.path),
    value: doc.path,
    // default select file basename.
    select: [
      doc.path.lastIndexOf('/') + 1,
      doc.name.lastIndexOf('.') > -1 ? doc.path.lastIndexOf('.') : doc.path.length,
      'forward'
    ]
  }) || ''

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
    useToast().show('warning', t('document.file-transform-error'))
    return
  }

  try {
    await api.moveFile(doc, newPath)
    triggerHook('DOC_MOVED', { oldDoc: doc, newDoc })
  } catch (error: any) {
    useToast().show('warning', error.message)
    throw error
  }
}

/**
 * Save a document.
 * @param doc
 * @param content
 */
export async function saveDoc (doc: Doc, content: string) {
  logger.debug('saveDoc', doc)

  const payload = { doc, content }

  await triggerHook('DOC_BEFORE_SAVE', payload, { breakable: true })

  doc = payload.doc
  content = payload.content

  try {
    let sendContent = content
    let passwordHash = ''

    if (isEncrypted(doc)) {
      const password = await inputPassword(t('document.password-save'), doc.name)
      if (!password) {
        return
      }

      const encrypted = encrypt(sendContent, password)
      if (doc.passwordHash !== encrypted.passwordHash) {
        if (!(await useModal().confirm({
          title: t('document.save-encrypted-file-dialog.title'),
          content: t('document.save-encrypted-file-dialog.content')
        }))) {
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
    triggerHook('DOC_SAVED', { doc: store.state.currentFile! })
  } catch (error: any) {
    Object.assign(doc, { status: 'save-failed' })
    useToast().show('warning', error.message)
    throw error
  }
}

/**
 * Ensure current document is saved.
 */
export async function ensureCurrentFileSaved () {
  const { currentFile, currentContent } = store.state
  if (!currentFile || !currentFile.status) {
    return
  }

  const unsaved = !store.getters.isSaved && currentFile.repo !== '__help__'

  if (!unsaved) {
    return
  }

  const fileURI = toUri(currentFile)
  const checkFile = () => {
    if (fileURI !== toUri(store.state.currentFile)) {
      throw new Error('Save Error')
    }
  }

  const saveContent = async () => {
    checkFile()
    await saveDoc(currentFile, currentContent)
  }

  try {
    const autoSave = !isEncrypted(currentFile) && getSetting('auto-save', 2000)
    if (autoSave) {
      await saveContent()
    } else {
      const confirm = await useModal().confirm({
        title: t('save-check-dialog.title'),
        content: t('save-check-dialog.desc'),
        action: h(Fragment, [
          h('button', {
            onClick: async () => {
              await saveContent()
              useModal().ok()
            }
          }, t('save')),
          h('button', {
            onClick: () => useModal().ok()
          }, t('discard')),
          h('button', {
            onClick: () => useModal().cancel()
          }, t('cancel')),
        ])
      })

      checkFile()

      if (confirm) {
        if (!store.getters.isSaved && currentFile.content) {
          store.state.currentContent = currentFile.content!
        }
      } else {
        throw new Error('Document not saved')
      }
    }
  } catch (error: any) {
    useToast().show('warning', error.message)
    throw error
  }
}

/**
 * Switch document.
 * @param doc
 * @param force
 */
export async function switchDoc (doc: Doc | null, force = false) {
  logger.debug('switchDoc', doc)

  if (!force && toUri(doc) === toUri(store.state.currentFile)) {
    logger.debug('skip switch', doc)
    return
  }

  await ensureCurrentFileSaved().catch(error => {
    if (force) {
      console.error(error)
    } else {
      throw error
    }
  })

  try {
    if (!doc) {
      store.commit('setCurrentFile', null)
      triggerHook('DOC_SWITCHED', { doc: null })
      return
    }

    doc.absolutePath = getAbsolutePath(doc)

    const timer = setTimeout(() => {
      store.commit('setCurrentFile', { ...doc, status: undefined })
    }, 150)

    let passwordHash = ''
    let { content, hash } = await api.readFile(doc)
    clearTimeout(timer)

    // decrypt content.
    if (isEncrypted(doc)) {
      const password = await inputPassword(t('document.password-open'), doc.name, true)
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

    triggerHook('DOC_SWITCHED', { doc: store.state.currentFile })
  } catch (error: any) {
    triggerHook('DOC_SWITCH_FAILED', { doc, message: error.message })
    useToast().show('warning', error.message.includes('Malformed') ? t('document.wrong-password') : error.message)
    throw error
  }
}

/**
 * Mark document.
 * @param doc
 */
export async function markDoc (doc: Doc) {
  const list = getSetting('mark', []).filter(x => !(x.path === doc.path && x.repo === doc.repo))
  list.push({ repo: doc.repo, path: doc.path, name: basename(doc.path) })
  await setSetting('mark', list)
  triggerHook('DOC_CHANGED', { doc })
}

/**
 * Unmark document.
 * @param doc
 */
export async function unmarkDoc (doc: Doc) {
  const list = getSetting('mark', []).filter(x => !(x.path === doc.path && x.repo === doc.repo))
  await setSetting('mark', list)
  triggerHook('DOC_CHANGED', { doc })
}

export function getMarkedFiles () {
  return getSetting('mark', [])
}

export function isMarked (doc: PathItem) {
  return getMarkedFiles().findIndex(x => doc.repo === x.repo && doc.path === x.path) > -1
}

/**
 * Open in OS.
 * @param doc
 * @param reveal
 */
export async function openInOS (doc: Doc, reveal?: boolean) {
  const repo = getRepo(doc.repo)
  if (repo) {
    const path = join(repo.path, doc.path)
    if (reveal) {
      showItemInFolder(path)
    } else {
      openPath(path)
    }
  }
}

/**
 * Show help file.
 * @param docName
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
 * Show export panel.
 */
export function showExport () {
  store.commit('setShowExport', true)
}

/**
 * show history versions of document
 * @param doc
 */
export function showHistory (doc: Doc) {
  getActionHandler('doc.show-history')(doc)
}

/**
 * hide history panel
 */
export function hideHistory () {
  getActionHandler('doc.hide-history')()
}

/**
 * print current document
 */
export async function print () {
  await triggerHook('DOC_BEFORE_EXPORT', { type: 'pdf' }, { breakable: true })
  window.print()
}
