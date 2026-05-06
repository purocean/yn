import type { Doc, DocCategory, Repo } from '@fe/types'

const storeMock = vi.hoisted(() => ({
  state: {
    currentFile: null as Doc | null,
    currentContent: '',
  },
  getters: {
    isSaved: { value: true },
  },
}))

const repoMocks = vi.hoisted(() => ({
  repos: [
    { name: 'main', path: '/repo' },
    { name: 'notes', path: '/workspace/notes' },
  ] as Repo[],
}))

const settingMocks = vi.hoisted(() => ({
  values: new Map<string, any>(),
  setSetting: vi.fn(async (key: string, value: any) => {
    settingMocks.values.set(key, value)
  }),
}))

const apiMocks = vi.hoisted(() => ({
  writeFile: vi.fn(async () => ({ hash: 'hash', stat: { size: 1 } })),
  readFile: vi.fn(async () => ({ content: '# Read', hash: 'read-hash', stat: { size: 6 }, writeable: true })),
  copyFile: vi.fn(async () => undefined),
  deleteFile: vi.fn(async () => undefined),
  moveFile: vi.fn(async () => undefined),
}))

const baseMocks = vi.hoisted(() => ({
  openPath: vi.fn(),
  showItemInFolder: vi.fn(),
  inputPassword: vi.fn(),
}))

const actionMocks = vi.hoisted(() => ({
  handler: vi.fn(),
  getActionHandler: vi.fn(() => actionMocks.handler),
}))

const hookMocks = vi.hoisted(() => ({
  triggerHook: vi.fn(async () => undefined),
}))

const modalMocks = vi.hoisted(() => ({
  input: vi.fn(),
  confirm: vi.fn(),
  alert: vi.fn(),
  ok: vi.fn(),
  cancel: vi.fn(),
}))

const toastMocks = vi.hoisted(() => ({
  show: vi.fn(),
}))

const cryptoMocks = vi.hoisted(() => ({
  encrypt: vi.fn((content: string, password: string) => ({ content: `encrypted:${content}`, passwordHash: `hash:${password}` })),
  decrypt: vi.fn((content: string, password: string) => {
    if (password === 'bad') throw new Error('Malformed UTF-8 data')
    return { content: content.replace(/^encrypted:/, ''), passwordHash: `hash:${password}` }
  }),
}))

vi.mock('@fe/support/store', () => ({
  default: storeMock,
}))

vi.mock('@fe/services/repo', () => ({
  getAllRepos: () => repoMocks.repos,
  getRepo: (name: string) => repoMocks.repos.find(repo => repo.name === name),
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: (key: string, fallback?: any) => settingMocks.values.has(key) ? settingMocks.values.get(key) : fallback,
  setSetting: settingMocks.setSetting,
}))

vi.mock('@fe/support/api', () => apiMocks)

vi.mock('@fe/services/base', () => baseMocks)

vi.mock('@fe/core/action', () => ({
  getActionHandler: actionMocks.getActionHandler,
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: hookMocks.triggerHook,
}))

vi.mock('@fe/support/ui/modal', () => ({
  useModal: () => modalMocks,
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => toastMocks,
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string, ...args: string[]) => [key, ...args].join(':'),
  $$t: (key: string) => key,
}))

vi.mock('@fe/utils', () => ({
  fileToBase64URL: vi.fn(async () => 'data:text/plain;base64,'),
  getLogger: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@fe/others/file-extensions', () => ({
  default: {
    supported: (path: string) => path.endsWith('.txt'),
  },
}))

vi.mock('@fe/utils/crypto', () => cryptoMocks)

import * as ioc from '@fe/core/ioc'
import {
  URI_SCHEME,
  cloneDoc,
  createCurrentDocChecker,
  createDir,
  createDoc,
  deleteDoc,
  duplicateDoc,
  ensureCurrentFileSaved,
  getAbsolutePath,
  getAllDocCategories,
  getMarkedFiles,
  hideHistory,
  isEncrypted,
  isMarkdownFile,
  isMarked,
  isOutOfRepo,
  isPlain,
  isSameFile,
  isSameRepo,
  isSubOrSameFile,
  markDoc,
  openInOS,
  registerDocCategory,
  removeDocCategory,
  resolveDocType,
  saveDoc,
  showHistory,
  showHelp,
  supported,
  switchDoc,
  switchDocByPath,
  toUri,
  unmarkDoc,
  moveDoc,
} from '@fe/services/document'
import { ROOT_REPO_NAME_PREFIX } from '@share/misc'
import { HELP_REPO_NAME } from '@fe/support/args'

describe('document service pure helpers', () => {
  const fileDoc: Doc = {
    type: 'file',
    repo: 'main',
    name: 'note.md',
    path: '/dir/note.md',
    absolutePath: '/repo/dir/note.md',
    plain: true,
    extra: { source: 'test' },
  }

  beforeEach(() => {
    storeMock.state.currentFile = null
    storeMock.state.currentContent = ''
    storeMock.getters.isSaved.value = true
    settingMocks.values.clear()
    settingMocks.setSetting.mockClear()
    apiMocks.writeFile.mockClear()
    apiMocks.readFile.mockClear()
    apiMocks.copyFile.mockClear()
    apiMocks.deleteFile.mockClear()
    apiMocks.moveFile.mockClear()
    baseMocks.openPath.mockClear()
    baseMocks.showItemInFolder.mockClear()
    baseMocks.inputPassword.mockReset()
    actionMocks.handler.mockClear()
    actionMocks.getActionHandler.mockClear()
    hookMocks.triggerHook.mockClear()
    modalMocks.input.mockReset()
    modalMocks.confirm.mockReset()
    modalMocks.alert.mockReset()
    modalMocks.ok.mockReset()
    modalMocks.cancel.mockReset()
    toastMocks.show.mockClear()
    cryptoMocks.encrypt.mockClear()
    cryptoMocks.decrypt.mockClear()
  })

  afterEach(() => {
    ioc.removeWhen('DOC_CATEGORIES', item => item.category === 'custom-docs')
  })

  test('clones document basics and includes extra only when requested', () => {
    expect(cloneDoc(null)).toBeNull()

    const cloned = cloneDoc(fileDoc)!
    expect(cloned).toEqual({
      type: 'file',
      name: 'note.md',
      repo: 'main',
      path: '/dir/note.md',
      absolutePath: '/repo/dir/note.md',
      plain: true,
    })
    expect(cloned).not.toBe(fileDoc)

    expect(cloneDoc(fileDoc, { includeExtra: true })?.extra).toEqual({ source: 'test' })
  })

  test('classifies markdown, encrypted, out-of-repo, and related docs', () => {
    const dirDoc = { type: 'dir' as const, repo: 'main', path: '/dir', name: 'dir' }
    const encrypted = { type: 'file' as const, repo: 'main', path: '/secret.c.md', name: 'secret.c.md' }
    const child = { type: 'file' as const, repo: 'main', path: '/dir/child.md', name: 'child.md' }
    const siblingRepo = { ...child, repo: 'notes' }

    expect(isMarkdownFile(fileDoc)).toBe(true)
    expect(isMarkdownFile(dirDoc)).toBe(false)
    expect(isEncrypted(encrypted)).toBe(true)
    expect(isEncrypted(fileDoc)).toBe(false)
    expect(isOutOfRepo({ ...fileDoc, repo: ROOT_REPO_NAME_PREFIX + '/' })).toBe(true)
    expect(isSameRepo(fileDoc, child)).toBe(true)
    expect(isSameRepo(fileDoc, siblingRepo)).toBe(false)
    expect(isSameFile(fileDoc, { ...fileDoc })).toBe(true)
    expect(isSameFile(fileDoc, child)).toBe(false)
    expect(isSubOrSameFile(dirDoc, child)).toBe(true)
    expect(isSubOrSameFile(fileDoc, { ...fileDoc })).toBe(true)
    expect(isSubOrSameFile(dirDoc, siblingRepo)).toBe(false)
  })

  test('builds stable uris for files, non-file docs, and blank system doc', () => {
    expect(toUri(fileDoc)).toBe(`${URI_SCHEME}://main/dir/note.md`)
    expect(toUri({ type: 'dir', repo: 'main', path: '/dir', name: 'dir' })).toBe(`${URI_SCHEME}://dir/main/dir`)
    expect(toUri()).toBe(`${URI_SCHEME}://system/blank.md`)
  })

  test('resolves absolute paths for normal repos and root repos', () => {
    expect(getAbsolutePath(fileDoc)).toBe('/repo/dir/note.md')
    expect(getAbsolutePath({ ...fileDoc, repo: ROOT_REPO_NAME_PREFIX + '/tmp/root' })).toBe('/tmp/root/dir/note.md')
    expect(getAbsolutePath({ ...fileDoc, repo: 'missing' })).toBe('/dir/note.md')
  })

  test('detects whether the current document changed', () => {
    storeMock.state.currentFile = { ...fileDoc }
    const checker = createCurrentDocChecker()

    expect(checker.check()).toBe(true)
    expect(checker.changed()).toBe(false)

    storeMock.state.currentFile = { ...fileDoc, path: '/other.md' }
    expect(checker.check()).toBe(false)
    expect(checker.changed()).toBe(true)
    expect(() => checker.throwErrorIfChanged()).toThrow('Current file changed')
  })

  test('registers, resolves, and removes document categories', () => {
    const category: DocCategory = {
      category: 'custom-docs',
      displayName: 'Custom',
      types: [
        {
          id: 'custom-long',
          displayName: 'Custom Long',
          extension: ['.custom.md'],
          plain: true,
          buildNewContent: filename => `custom ${filename}`,
        },
        {
          id: 'custom-short',
          displayName: 'Custom Short',
          extension: ['.custom'],
          plain: false,
        },
      ],
    }

    registerDocCategory(category)

    expect(getAllDocCategories()).toContain(category)
    expect(resolveDocType('/tmp/file.custom.md')?.type.id).toBe('custom-long')
    expect(resolveDocType('/tmp/file.custom')?.type.id).toBe('custom-short')
    expect(supported({ type: 'file', repo: 'main', path: '/tmp/file.custom.md' })).toBe(true)
    expect(isPlain({ type: 'file', path: '/tmp/file.custom.md' })).toBe(true)
    expect(isPlain({ type: 'file', path: '/tmp/readme.txt' })).toBe(true)

    removeDocCategory('custom-docs')

    expect(resolveDocType('/tmp/file.custom')).toBeNull()
  })

  test('marks and unmarks documents through settings', async () => {
    await markDoc(fileDoc)
    expect(settingMocks.setSetting).toHaveBeenLastCalledWith('mark', [
      { type: 'file', repo: 'main', path: '/dir/note.md', name: 'note.md' },
    ])
    expect(getMarkedFiles()).toEqual([
      { type: 'file', repo: 'main', path: '/dir/note.md', name: 'note.md' },
    ])
    expect(isMarked(fileDoc)).toBe(true)

    await unmarkDoc(fileDoc)
    expect(getMarkedFiles()).toEqual([])
    expect(isMarked(fileDoc)).toBe(false)
    expect(isMarked({ type: 'dir', repo: 'main', path: '/dir', name: 'dir' })).toBe(false)
  })

  test('creates directories and files with provided paths', async () => {
    const dir = await createDir({ repo: 'main', path: '/new-folder/', content: undefined })
    expect(dir).toMatchObject({ type: 'dir', repo: 'main', path: '/new-folder/', name: 'new-folder' })
    expect(apiMocks.writeFile).toHaveBeenCalledWith(dir)
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('DOC_CREATED', { doc: dir })

    const doc = await createDoc({ repo: 'main', path: '/new.md', content: '# Existing' })
    expect(doc).toMatchObject({ type: 'file', repo: 'main', path: '/new.md', name: 'new.md', contentHash: 'new' })
    expect(apiMocks.writeFile).toHaveBeenLastCalledWith(doc, '# Existing', false)
  })

  test('creates files from registered builders including file-like base64 payloads', async () => {
    const textCategory: DocCategory = {
      category: 'custom-docs',
      displayName: 'Custom',
      types: [{
        id: 'built-text',
        displayName: 'Built Text',
        extension: ['.built'],
        plain: true,
        buildNewContent: filename => `built:${filename}`,
      }],
    }
    registerDocCategory(textCategory)

    const built = await createDoc({ repo: 'main', path: '/from-builder.built' })
    expect(apiMocks.writeFile).toHaveBeenLastCalledWith(built, 'built:from-builder.built', false)

    ioc.removeWhen('DOC_CATEGORIES', item => item.category === 'custom-docs')
    const binaryCategory: DocCategory = {
      category: 'custom-docs',
      displayName: 'Custom',
      types: [{
        id: 'binary',
        displayName: 'Binary',
        extension: ['.bin'],
        plain: true,
        buildNewContent: () => new Blob(['abc']),
      }],
    }
    registerDocCategory(binaryCategory)

    const binary = await createDoc({ repo: 'main', path: '/asset.bin' })
    expect(apiMocks.writeFile).toHaveBeenLastCalledWith(binary, 'data:text/plain;base64,', true)
  })

  test('saves plain documents and applies hook-mutated payloads', async () => {
    const doc = { ...fileDoc, status: 'loaded' as const }
    storeMock.state.currentFile = doc
    hookMocks.triggerHook.mockImplementationOnce(async (_name, payload) => {
      payload.doc.path = '/dir/hooked.md'
      payload.content = 'hooked content'
    })

    await saveDoc(doc, 'draft')

    expect(apiMocks.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: '/dir/hooked.md' }), 'hooked content')
    expect(doc).toMatchObject({
      content: 'hooked content',
      contentHash: 'hash',
      stat: { size: 1 },
      status: 'saved',
    })
    expect(hookMocks.triggerHook).toHaveBeenLastCalledWith('DOC_SAVED', { doc })
  })

  test('skips non-plain save and marks save failures', async () => {
    const nonPlain = { ...fileDoc, plain: false, status: 'loaded' as const }
    await saveDoc(nonPlain, 'ignored')
    expect(apiMocks.writeFile).not.toHaveBeenCalled()

    const doc = { ...fileDoc, status: 'loaded' as const }
    apiMocks.writeFile.mockRejectedValueOnce(new Error('disk full'))
    await expect(saveDoc(doc, 'draft')).rejects.toThrow('disk full')
    expect(doc.status).toBe('save-failed')
    expect(toastMocks.show).toHaveBeenCalledWith('warning', 'disk full')
  })

  test('saves encrypted documents only after password confirmation', async () => {
    const doc = { ...fileDoc, path: '/dir/secret.c.md', name: 'secret.c.md', status: 'loaded' as const, passwordHash: 'old' }
    baseMocks.inputPassword.mockResolvedValue('pw')
    modalMocks.confirm.mockResolvedValueOnce(false)

    await saveDoc(doc, 'secret')
    expect(apiMocks.writeFile).not.toHaveBeenCalled()

    modalMocks.confirm.mockResolvedValueOnce(true)
    await saveDoc(doc, 'secret')
    expect(cryptoMocks.encrypt).toHaveBeenCalledWith('secret', 'pw')
    expect(apiMocks.writeFile).toHaveBeenCalledWith(doc, 'encrypted:secret')
    expect(doc.passwordHash).toBe('hash:pw')
  })

  test('ensures current file by auto-saving unsaved plain files', async () => {
    const doc = { ...fileDoc, status: 'loaded' as const }
    storeMock.state.currentFile = doc
    storeMock.state.currentContent = 'changed'
    storeMock.getters.isSaved.value = false
    settingMocks.values.set('auto-save', 2000)

    await ensureCurrentFileSaved()

    expect(apiMocks.writeFile).toHaveBeenCalledWith(doc, 'changed')
    expect(modalMocks.confirm).not.toHaveBeenCalled()
  })

  test('throws when current file save is declined', async () => {
    const doc = { ...fileDoc, status: 'loaded' as const }
    storeMock.state.currentFile = doc
    storeMock.state.currentContent = 'changed'
    storeMock.getters.isSaved.value = false
    settingMocks.values.set('auto-save', 0)
    modalMocks.confirm.mockResolvedValue(false)

    await expect(ensureCurrentFileSaved()).rejects.toThrow('Document not saved')
    expect(modalMocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'save-check-dialog.title',
    }))
  })

  test('switches plain, blank, and encrypted documents', async () => {
    await switchDoc({ ...fileDoc })
    expect(apiMocks.readFile).toHaveBeenCalledWith(expect.objectContaining({ path: '/dir/note.md', plain: true }))
    expect(storeMock.state.currentFile).toMatchObject({
      path: '/dir/note.md',
      content: '# Read',
      contentHash: 'read-hash',
      status: 'loaded',
      absolutePath: '/repo/dir/note.md',
    })
    expect(storeMock.state.currentContent).toBe('# Read')

    await switchDoc(null, { force: true })
    expect(storeMock.state.currentFile).toBeNull()
    expect(storeMock.state.currentContent).toBe('')

    apiMocks.readFile.mockResolvedValueOnce({ content: 'encrypted:secret', hash: 'secret-hash', stat: { size: 16 }, writeable: true })
    baseMocks.inputPassword.mockResolvedValueOnce('pw')
    await switchDoc({ ...fileDoc, path: '/dir/secret.c.md', name: 'secret.c.md' })
    expect(cryptoMocks.decrypt).toHaveBeenCalledWith('encrypted:secret', 'pw')
    expect(storeMock.state.currentFile).toMatchObject({
      path: '/dir/secret.c.md',
      content: 'secret',
      passwordHash: 'hash:pw',
    })
  })

  test('handles switch skip, read failure, and path lookup branches', async () => {
    storeMock.state.currentFile = { ...fileDoc }
    await switchDoc({ ...fileDoc })
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('DOC_SWITCH_SKIPPED', { doc: fileDoc, opts: undefined })

    apiMocks.readFile.mockRejectedValueOnce(new Error('read failed'))
    await expect(switchDoc({ ...fileDoc, path: '/dir/fail.md', name: 'fail.md' }, { force: true })).rejects.toThrow('read failed')
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('DOC_SWITCH_FAILED', expect.objectContaining({
      message: 'read failed',
    }))

    await switchDocByPath('/workspace/notes/a/b.md')
    expect(storeMock.state.currentFile).toMatchObject({ repo: 'notes', path: '/a/b.md', name: 'b.md' })

    await switchDocByPath('/external/out.md')
    expect(storeMock.state.currentFile).toMatchObject({ repo: `${ROOT_REPO_NAME_PREFIX}/`, path: '/external/out.md' })
  })

  test('duplicates markdown through createDoc and non-markdown through copyFile', async () => {
    await duplicateDoc(fileDoc, '/dir/note-copy')
    expect(apiMocks.readFile).toHaveBeenCalledWith(fileDoc)
    expect(apiMocks.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: '/dir/note-copy.md' }), '# Read', false)

    const txtDoc = { ...fileDoc, path: '/dir/readme.txt', name: 'readme.txt' }
    await duplicateDoc(txtDoc, '/dir/readme-copy')
    expect(apiMocks.copyFile).toHaveBeenCalledWith(txtDoc, '/dir/readme-copy.txt')
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('DOC_CREATED', { doc: { ...txtDoc, path: '/dir/readme-copy.txt' } })
  })

  test('deletes with confirmation and force retry when initial delete fails', async () => {
    modalMocks.confirm.mockResolvedValueOnce(true)
    await deleteDoc(fileDoc)
    expect(apiMocks.deleteFile).toHaveBeenCalledWith(fileDoc, true)
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('DOC_DELETED', { doc: fileDoc })

    apiMocks.deleteFile.mockRejectedValueOnce(new Error('soft fail')).mockResolvedValueOnce(undefined)
    modalMocks.confirm.mockResolvedValueOnce(true)
    await deleteDoc(fileDoc, true)
    expect(apiMocks.deleteFile).toHaveBeenLastCalledWith(fileDoc, false)
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('DOC_BEFORE_DELETE', { doc: fileDoc, force: true }, { breakable: true })
  })

  test('moves documents, skips no-op moves, and blocks encryption transforms', async () => {
    await moveDoc(fileDoc, '/dir/renamed.md')
    expect(apiMocks.moveFile).toHaveBeenCalledWith(fileDoc, '/dir/renamed.md')
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('DOC_MOVED', {
      oldDoc: fileDoc,
      newDoc: { name: 'renamed.md', path: '/dir/renamed.md', repo: 'main', type: 'file' },
    })

    await moveDoc(fileDoc, '/dir/note.md')
    expect(apiMocks.moveFile).toHaveBeenCalledTimes(1)

    await moveDoc(fileDoc, '/dir/note.c.md')
    expect(apiMocks.moveFile).toHaveBeenCalledTimes(1)
    expect(toastMocks.show).toHaveBeenCalledWith('warning', 'document.file-transform-error')
  })

  test('rejects invalid create paths before writing', async () => {
    await expect(createDir({ repo: 'main', path: '/bad?.dir/', content: undefined })).rejects.toThrow('document.invalid-filename')
    await expect(createDoc({ repo: 'main', path: '/bad?.md', content: '' })).rejects.toThrow('document.invalid-filename')
  })

  test('opens documents in the operating system and delegates history actions', async () => {
    await openInOS(fileDoc)
    expect(baseMocks.openPath).toHaveBeenCalledWith('/repo/dir/note.md')

    await openInOS(fileDoc, true)
    expect(baseMocks.showItemInFolder).toHaveBeenCalledWith('/repo/dir/note.md')

    showHistory(fileDoc)
    expect(actionMocks.getActionHandler).toHaveBeenCalledWith('doc.show-history')
    expect(actionMocks.handler).toHaveBeenCalledWith(fileDoc)

    hideHistory()
    expect(actionMocks.getActionHandler).toHaveBeenCalledWith('doc.hide-history')
  })

  test('creates docs and dirs from modal input relative to a base document', async () => {
    modalMocks.input.mockResolvedValueOnce('draft')
    const created = await createDoc({ repo: 'main' }, { ...fileDoc, type: 'dir', path: '/folder' })

    expect(created).toMatchObject({ repo: 'main', path: '/folder/draft.md', name: 'draft.md' })
    expect(apiMocks.writeFile).toHaveBeenLastCalledWith(created, '# draft\n', false)

    modalMocks.input.mockResolvedValueOnce('nested')
    const dir = await createDir({ repo: 'main', content: undefined }, { ...fileDoc, type: 'file', path: '/folder/note.md' })
    expect(dir).toMatchObject({ repo: 'main', path: '/folder/nested/', name: 'nested' })

    modalMocks.input.mockResolvedValueOnce('')
    await expect(createDoc({ repo: 'main' }, { ...fileDoc, type: 'dir', path: '/folder' })).resolves.toBeUndefined()
    modalMocks.input.mockResolvedValueOnce('')
    await expect(createDir({ repo: 'main', content: undefined }, { ...fileDoc, type: 'dir', path: '/folder' })).resolves.toBeUndefined()
  })

  test('lets the create-file panel update doc type before building the path', async () => {
    const customType = {
      id: 'vector',
      displayName: 'Vector',
      extension: ['.svg'],
      plain: true,
      buildNewContent: (filename: string) => `<svg data-name="${filename}" />`,
    }
    modalMocks.input.mockImplementationOnce((opts: any) => {
      const vnode = opts.component()
      expect(vnode.props.currentPath).toBe('/folder')
      vnode.props.onUpdateDocType(customType)
      return 'icon'
    })

    const doc = await createDoc({ repo: 'main' }, { ...fileDoc, type: 'dir', path: '/folder' })

    expect(doc).toMatchObject({ path: '/folder/icon.svg', name: 'icon.svg' })
    expect(apiMocks.writeFile).toHaveBeenLastCalledWith(doc, '<svg data-name="icon.svg" />', false)
  })

  test('handles create-doc builder errors, inline base64 payloads, and encrypted creation', async () => {
    const category: DocCategory = {
      category: 'custom-docs',
      displayName: 'Custom',
      types: [
        {
          id: 'inline-base64',
          displayName: 'Inline Base64',
          extension: ['.inline'],
          plain: true,
          buildNewContent: () => ({ base64Content: 'data:custom;base64,AAAA' } as any),
        },
        {
          id: 'empty-builder',
          displayName: 'Empty',
          extension: ['.empty'],
          plain: true,
          buildNewContent: () => null as any,
        },
        {
          id: 'missing-builder',
          displayName: 'Missing',
          extension: ['.missing'],
          plain: true,
        },
      ],
    }
    registerDocCategory(category)

    const inline = await createDoc({ repo: 'main', path: '/asset.inline' })
    expect(apiMocks.writeFile).toHaveBeenLastCalledWith(inline, 'data:custom;base64,AAAA', true)

    await expect(createDoc({ repo: 'main', path: '/asset.empty' })).rejects.toThrow('Could not build new content')
    await expect(createDoc({ repo: 'main', path: '/asset.missing' })).rejects.toThrow('Could not build new content')
    await expect(createDoc({ repo: 'main', path: '/asset.unknown' })).rejects.toThrow('Could not resolve doc type')

    baseMocks.inputPassword.mockResolvedValueOnce('')
    await expect(createDoc({ repo: 'main', path: '/secret.c.md', content: 'secret' })).resolves.toBeUndefined()

    baseMocks.inputPassword.mockResolvedValueOnce('pw')
    const encrypted = await createDoc({ repo: 'main', path: '/secret.c.md', content: 'secret' })
    expect(cryptoMocks.encrypt).toHaveBeenCalledWith('secret', 'pw')
    expect(apiMocks.writeFile).toHaveBeenLastCalledWith(encrypted, 'encrypted:secret', false)
  })

  test('runs custom save-confirm actions and tolerates force switching after save errors', async () => {
    const doc = { ...fileDoc, status: 'loaded' as const }
    storeMock.state.currentFile = doc
    storeMock.state.currentContent = 'changed'
    storeMock.getters.isSaved.value = false
    settingMocks.values.set('auto-save', 0)
    modalMocks.confirm.mockImplementationOnce((opts: any) => {
      opts.action.children[0].props.onClick()
      return new Promise(() => undefined)
    })

    await ensureCurrentFileSaved()

    expect(apiMocks.writeFile).toHaveBeenCalledWith(doc, 'changed')

    storeMock.state.currentFile = { ...fileDoc, status: 'loaded' as const }
    storeMock.state.currentContent = 'still changed'
    storeMock.getters.isSaved.value = false
    modalMocks.confirm.mockResolvedValueOnce(false)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await switchDoc({ ...fileDoc, path: '/dir/forced.md', name: 'forced.md' }, { force: true })

    expect(consoleError).toHaveBeenCalledWith(expect.any(Error))
    expect(storeMock.state.currentFile).toMatchObject({ path: '/dir/forced.md', status: 'loaded' })
    consoleError.mockRestore()
  })

  test('covers guarded document operations and error branches', async () => {
    await expect(duplicateDoc({ ...fileDoc, type: 'dir' as any })).rejects.toThrow('Invalid document type')
    modalMocks.input.mockResolvedValueOnce('')
    await expect(duplicateDoc(fileDoc)).rejects.toThrow('Need supply new path')

    await expect(deleteDoc({ ...fileDoc, path: '/' })).rejects.toThrow('delete root')
    modalMocks.confirm.mockResolvedValueOnce(false)
    await expect(deleteDoc(fileDoc)).rejects.toThrow('User cancel')

    apiMocks.deleteFile.mockRejectedValueOnce(new Error('soft fail')).mockRejectedValueOnce(new Error('hard fail'))
    modalMocks.confirm.mockResolvedValueOnce(true)
    await expect(deleteDoc(fileDoc, true)).rejects.toThrow('soft fail')
    expect(toastMocks.show).toHaveBeenCalledWith('warning', 'hard fail')

    await expect(moveDoc({ ...fileDoc, path: '/' })).rejects.toThrow('move/rename root')
    modalMocks.input.mockResolvedValueOnce('')
    await expect(moveDoc(fileDoc)).resolves.toBeUndefined()

    apiMocks.moveFile.mockRejectedValueOnce(new Error('move failed'))
    await expect(moveDoc(fileDoc, '/dir/move-failed.md')).rejects.toThrow('move failed')
    expect(toastMocks.show).toHaveBeenCalledWith('warning', 'move failed')
  })

  test('ensures saved/current-file shortcuts and switch-doc force behavior', async () => {
    storeMock.state.currentFile = null
    await expect(ensureCurrentFileSaved()).resolves.toBeUndefined()

    storeMock.state.currentFile = { ...fileDoc, plain: false, status: 'loaded' as const }
    await expect(ensureCurrentFileSaved()).resolves.toBeUndefined()

    storeMock.state.currentFile = { ...fileDoc, status: undefined }
    await expect(ensureCurrentFileSaved()).resolves.toBeUndefined()

    storeMock.state.currentFile = { ...fileDoc, repo: HELP_REPO_NAME, status: 'loaded' as const }
    storeMock.getters.isSaved.value = false
    await expect(ensureCurrentFileSaved()).resolves.toBeUndefined()

    storeMock.state.currentFile = { ...fileDoc, status: 'loaded' as const }
    storeMock.state.currentContent = 'changed'
    settingMocks.values.set('auto-save', 2000)
    apiMocks.writeFile.mockRejectedValueOnce(new Error('save failed'))
    modalMocks.confirm.mockResolvedValueOnce(true)
    await expect(ensureCurrentFileSaved()).resolves.toBeUndefined()
    expect(toastMocks.show).toHaveBeenCalledWith('warning', 'save failed')

    await expect(switchDoc({ type: 'dir', repo: 'main', path: '/dir', name: 'dir' } as any, { force: true })).rejects.toThrow('Invalid document type')

    storeMock.state.currentFile = null
    storeMock.state.currentContent = ''
    storeMock.getters.isSaved.value = true
    showHelp('/README.md')
    await vi.waitFor(() => {
      expect(storeMock.state.currentFile).toMatchObject({ repo: HELP_REPO_NAME, path: '/README.md' })
    })
  })
})
