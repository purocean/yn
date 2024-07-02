import { Fragment, h } from 'vue'
import AsyncLock from 'async-lock'
import { cloneDeep } from 'lodash-es'
import { Optional } from 'utility-types'
import { URI } from 'monaco-editor/esm/vs/base/common/uri.js'
import * as misc from '@share/misc'
import extensions from '@fe/others/file-extensions'
import * as crypto from '@fe/utils/crypto'
import { useModal } from '@fe/support/ui/modal'
import { useToast } from '@fe/support/ui/toast'
import store from '@fe/support/store'
import type { Doc, PathItem, SwitchDocOpts } from '@fe/types'
import { basename, dirname, extname, isBelongTo, join, normalizeSep, relative, resolve } from '@fe/utils/path'
import { getActionHandler } from '@fe/core/action'
import { triggerHook } from '@fe/core/hook'
import { FLAG_MAS, HELP_REPO_NAME } from '@fe/support/args'
import * as api from '@fe/support/api'
import { getLogger } from '@fe/utils'
import { isWindows } from '@fe/support/env'
import { getAllRepos, getRepo, inputPassword, openPath, showItemInFolder } from './base'
import { t } from './i18n'
import { getSetting, setSetting } from './setting'
import { changePosition } from './routines'

const logger = getLogger('document')
const lock = new AsyncLock()

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

function checkFilePath (path: string) {
  // check filename is valid
  const filename = basename(path)
  if (/[<>:"|?*#]/.test(filename)) {
    throw new Error(t('document.invalid-filename', '< > : " / \\ | ? * #'))
  }
}

/**
 * Get absolutePath of document
 * @param doc
 * @returns
 */
export function getAbsolutePath (doc: Doc) {
  if (isOutOfRepo(doc)) {
    const repoPath = doc.repo.substring(misc.ROOT_REPO_NAME_PREFIX.length)
    return normalizeSep(join(repoPath, doc.path))
  }

  return normalizeSep(join(getRepo(doc.repo)?.path || '/', doc.path))
}

/**
 * Create a checker to check if a document is current activated document.
 * @returns
 */
export function createCurrentDocChecker () {
  const currentFileUri = toUri(store.state.currentFile)

  const check = () => {
    return currentFileUri === toUri(store.state.currentFile)
  }

  return {
    check,
    changed: () => !check(),
    throwErrorIfChanged: () => {
      if (check()) {
        return
      }

      throw new Error('Current file changed')
    }
  }
}

/**
 * Check if the document is a markdown file.
 * @param doc
 * @returns
 */
export function isMarkdownFile (doc: Doc) {
  return !!(doc && doc.type === 'file' && misc.isMarkdownFile(doc.path))
}

/**
 * Check if the document is out of a repository.
 * @param doc
 * @returns
 */
export function isOutOfRepo (doc?: Doc | null) {
  return !!(doc && doc.repo.startsWith(misc.ROOT_REPO_NAME_PREFIX))
}

/**
 * Determine if the document is encrypted.
 * @param doc
 * @returns
 */
export function isEncrypted (doc?: Pick<Doc, 'path' | 'type'> | null): boolean {
  return !!(doc && doc.type === 'file' && misc.isEncryptedMarkdownFile(doc.path))
}

/**
 * Determine if it is in the same repository.
 * @param docA
 * @param docB
 * @returns
 */
export function isSameRepo (docA: Doc | null | undefined, docB: Doc | null | undefined) {
  return docA && docB && docA.repo === docB.repo
}

/**
 * Determine if it is the same document.
 * @param docA
 * @param docB
 * @returns
 */
export function isSameFile (docA: PathItem | null | undefined, docB: PathItem | null | undefined) {
  return docA && docB && docA.repo === docB.repo && docA.path === docB.path
}

/**
 * Determine whether document B is the same as document A or a subordinate to directory A.
 * @param docA
 * @param docB
 * @returns
 */
export function isSubOrSameFile (docA: PathItem | null | undefined, docB?: PathItem | null | undefined) {
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
export function toUri (doc?: PathItem | null): string {
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

      const newFilename = 'new.md'
      let filename = await useModal().input({
        title: t('document.create-dialog.title'),
        hint: t('document.create-dialog.hint'),
        content: t('document.current-path', currentPath),
        value: newFilename,
        select: [
          0,
          newFilename.lastIndexOf('.') > -1 ? newFilename.lastIndexOf('.') : newFilename.length,
          'forward'
        ],
      })

      if (!filename) {
        return
      }

      if (!misc.isMarkdownFile(filename)) {
        filename = filename.replace(/\/$/, '') + misc.MARKDOWN_FILE_EXT
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

    checkFilePath(file.path)
    await api.writeFile(file, file.content)

    triggerHook('DOC_CREATED', { doc: file })
  } catch (error: any) {
    useToast().show('warning', error.message)
    throw error
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
    checkFilePath(dir.path)
    await api.writeFile(dir)

    triggerHook('DOC_CREATED', { doc: dir })
  } catch (error: any) {
    useToast().show('warning', error.message)
    throw error
  }

  return dir
}

/**
 * Duplicate a document.
 * @param originDoc
 * @param newPath
 * @returns
 */
export async function duplicateDoc (originDoc: Doc, newPath?: string) {
  newPath ??= await useModal().input({
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
  }) || ''

  if (!newPath) {
    throw new Error('Need supply new path')
  }

  newPath = newPath.replace(/\/$/, '')
  const originExt = extname(originDoc.path)
  const newExt = extname(newPath)

  // check extension name
  if (originExt.toLowerCase() !== newExt.toLowerCase()) {
    newPath += extname(originDoc.path)
  }

  // check if file path is same
  if (newPath === originDoc.path) {
    const ext = extname(newPath)
    newPath = join(dirname(newPath), `${basename(newPath, ext)}-copy${ext}`)
  }

  // duplicate markdown file
  if (misc.isMarkdownFile(newPath)) {
    const { content } = await api.readFile(originDoc)
    await createDoc({ repo: originDoc.repo, path: newPath, content })
  } else {
    try {
      await api.copyFile(originDoc, newPath)
      triggerHook('DOC_CREATED', { doc: { ...originDoc, path: newPath } })
    } catch (error: any) {
      useToast().show('warning', error.message)
      throw error
    }
  }
}

/**
 * Delete a document.
 * @param doc
 * @param skipConfirm
 */
export async function deleteDoc (doc: PathItem, skipConfirm = false) {
  if (doc.path === '/') {
    throw new Error('Could\'t delete root dir.')
  }

  // delete current file or parent folder need save first
  if (isSubOrSameFile(doc, store.state.currentFile)) {
    await ensureCurrentFileSaved()
  }

  const confirm = skipConfirm ? true : await useModal().confirm({
    title: t('document.delete-dialog.title'),
    content: t('document.delete-dialog.content', doc.path),
  })

  if (!confirm) {
    throw new Error('User cancel')
  }

  try {
    await api.deleteFile(doc)
  } catch (error: any) {
    useToast().show('warning', error.message)
    throw error
  }

  triggerHook('DOC_DELETED', { doc })
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

  // move current file or parent folder need save first
  if (isSubOrSameFile(doc, store.state.currentFile)) {
    await ensureCurrentFileSaved()
  }

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

  if (isEncrypted(doc) !== isEncrypted(newDoc)) {
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

async function _saveDoc (doc: Doc, content: string): Promise<void> {
  logger.debug('saveDoc', doc)

  if (!doc.plain) {
    logger.warn('saveDoc', 'is not plain doc')
    return
  }

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

    const { hash, stat } = await api.writeFile(doc, sendContent)
    Object.assign(doc, {
      stat,
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
 * Save a document.
 * @param doc
 * @param content
 */
export async function saveDoc (doc: Doc, content: string): Promise<void> {
  return lock.acquire('saveDoc', async (done) => {
    try {
      await _saveDoc(doc, content)
      done()
    } catch (e: any) {
      done(e)
    }
  })
}

/**
 * Ensure current document is saved.
 */
export async function ensureCurrentFileSaved () {
  await triggerHook('DOC_PRE_ENSURE_CURRENT_FILE_SAVED', undefined, { breakable: true })

  const { currentFile, currentContent } = store.state

  // do not check if current file is not plain file.
  if (currentFile && !extensions.supported(currentFile.name)) {
    return
  }

  // check blank file.
  if (!currentFile && currentContent.trim()) {
    const confirm = await useModal().confirm({
      title: t('save-check-dialog.title'),
      content: t('save-check-dialog.desc'),
      action: h(Fragment, [
        h('button', {
          onClick: () => useModal().ok()
        }, t('discard')),
        h('button', {
          onClick: () => useModal().cancel()
        }, t('cancel')),
      ])
    })

    if (confirm) {
      return
    } else {
      throw new Error('Discard saving [blank] file')
    }
  }

  if (!currentFile || !currentFile.status) {
    return
  }

  const unsaved = !store.getters.isSaved.value && currentFile.repo !== HELP_REPO_NAME

  if (!unsaved) {
    return
  }

  const currentDocChecker = createCurrentDocChecker()

  const checkFile = () => {
    if (currentDocChecker.changed()) {
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
      try {
        await saveContent()
        return
      } catch (error: any) {
        useToast().show('warning', error.message)
      }
    }

    const confirm = await useModal().confirm({
      title: t('save-check-dialog.title'),
      content: t('save-check-dialog.desc'),
      action: h(Fragment, [
        h('button', {
          onClick: async () => {
            await saveContent().catch(error => {
              useToast().show('warning', error.message)
              throw error
            })

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
  } catch (error: any) {
    useToast().show('warning', error.message)
    throw error
  }
}

async function _switchDoc (doc: Doc | null, opts?: SwitchDocOpts): Promise<void> {
  doc = doc ? cloneDeep(doc) : null

  logger.debug('switchDoc', doc)

  if (doc && doc.type !== 'file') {
    throw new Error('Invalid document type')
  }

  await triggerHook('DOC_PRE_SWITCH', { doc, opts }, { breakable: true })

  const force = opts?.force

  if (!force && store.state.currentFile !== undefined && isSameFile(doc, store.state.currentFile)) {
    logger.debug('skip switch', doc)
    triggerHook('DOC_SWITCH_SKIPPED', { doc, opts })

    if (opts?.position) {
      changePosition(opts.position)
    }
    return
  }

  await ensureCurrentFileSaved().catch(error => {
    if (force) {
      console.error(error)
    } else {
      throw error
    }
  })

  if (doc) {
    doc.plain = extensions.supported(doc.name)
    doc.absolutePath = getAbsolutePath(doc)
  }

  await triggerHook('DOC_BEFORE_SWITCH', { doc, opts }, { breakable: true, ignoreError: true })

  try {
    if (!doc) {
      store.state.currentFile = null
      store.state.currentContent = ''
      triggerHook('DOC_SWITCHED', { doc: null, opts })
      return
    }

    let content = ''
    let hash = ''
    let stat
    if (doc.plain) {
      const timer = setTimeout(() => {
        store.state.currentFile = { ...doc!, status: undefined }
        store.state.currentContent = doc?.content || ''
      }, 150)

      const res = await api.readFile(doc)
      clearTimeout(timer)

      content = res.content
      hash = res.hash
      stat = res.stat
    }

    // decrypt content.
    let passwordHash = ''
    if (isEncrypted(doc)) {
      const password = await inputPassword(t('document.password-open'), doc.name, true)
      const decrypted = decrypt(content, password)
      content = decrypted.content
      passwordHash = decrypted.passwordHash
    }

    store.state.currentFile = {
      ...doc,
      stat,
      content,
      passwordHash,
      contentHash: hash,
      status: 'loaded'
    }

    store.state.currentContent = content
    triggerHook('DOC_SWITCHED', { doc: store.state.currentFile || null, opts })

    if (opts?.position) {
      changePosition(opts.position)
    }
  } catch (error: any) {
    triggerHook('DOC_SWITCH_FAILED', { doc, message: error.message, opts })
    useToast().show('warning', error.message.includes('Malformed') ? t('document.wrong-password') : error.message)
    throw error
  }
}

/**
 * Switch document.
 * @param doc
 * @param opts
 */
export async function switchDoc (doc: Doc | null, opts?: SwitchDocOpts): Promise<void> {
  return lock.acquire('switchDoc', async (done) => {
    try {
      await _switchDoc(doc, opts)
      done()
    } catch (e: any) {
      done(e)
    }
  })
}

export async function switchDocByPath (path: string): Promise<void> {
  logger.debug('switchDocByPath', path)

  // find repo of path
  const repo = getAllRepos().find(x => isBelongTo(normalizeSep(x.path), normalizeSep(path)))
  if (repo) {
    return switchDoc({
      type: 'file',
      repo: repo.name,
      name: basename(path),
      path: resolve(relative(repo.path, path))
    })
  } else {
    if (FLAG_MAS) {
      useModal().alert({ title: 'Error', content: `Could not find repo of path: ${path}` })
      return
    }

    let root = '/'
    if (isWindows) {
      const regMatch = path.match(/^([a-zA-Z]:\\)/)
      if (regMatch) {
        root = regMatch[1]
        path = path.replace(root, '/')
      }
    }

    return switchDoc({
      type: 'file',
      repo: misc.ROOT_REPO_NAME_PREFIX + root,
      name: basename(path),
      path: normalizeSep(path)
    })
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

export function isMarked (doc: PathItem & { type?: Doc['type'] }) {
  if (doc.type === 'dir') {
    return false
  }

  return getMarkedFiles().findIndex(x => doc.repo === x.repo && doc.path === x.path) > -1
}

/**
 * Open in OS.
 * @param doc
 * @param reveal
 */
export async function openInOS (doc: PathItem, reveal?: boolean) {
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
    repo: HELP_REPO_NAME,
    title: docName,
    name: docName,
    path: docName,
  })
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
