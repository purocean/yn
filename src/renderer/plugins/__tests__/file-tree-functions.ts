const mocks = vi.hoisted(() => ({
  isNormalRepo: vi.fn(() => true),
}))

vi.mock('@fe/services/repo', () => ({
  isNormalRepo: mocks.isNormalRepo,
}))

vi.mock('@fe/support/args', () => ({
  FLAG_DISABLE_XTERM: false,
}))

import fileTreeFunctions from '../file-tree-functions'

function createCtx () {
  const treeMenuTaps: Function[] = []
  const tabMenuTaps: Function[] = []
  const actionButtonTaps: Function[] = []
  const ctx = {
    action: {
      getActionHandler: vi.fn(() => vi.fn()),
    },
    api: {
      upload: vi.fn(),
    },
    args: {
      FLAG_READONLY: false,
    },
    base: {
      findInRepository: vi.fn(),
    },
    doc: {
      createDir: vi.fn(),
      createDoc: vi.fn(),
      deleteDoc: vi.fn(),
      duplicateDoc: vi.fn(),
      isEncrypted: vi.fn(() => false),
      markDoc: vi.fn(),
      moveDoc: vi.fn(),
      openInOS: vi.fn(),
      supported: vi.fn(() => true),
      unmarkDoc: vi.fn(),
    },
    i18n: {
      t: vi.fn((key: string) => key),
    },
    store: {
      state: {
        currentRepo: { path: '/repo-root' },
      },
    },
    tree: {
      refreshTree: vi.fn(),
      tapContextMenus: vi.fn((fn: Function) => treeMenuTaps.push(fn)),
      tapNodeActionButtons: vi.fn((fn: Function) => actionButtonTaps.push(fn)),
    },
    utils: {
      copyText: vi.fn(),
      fileToBase64URL: vi.fn(() => Promise.resolve('data:file')),
      path: {
        join: vi.fn((...parts: string[]) => parts.join('/').replace(/\/+/g, '/')),
        resolve: vi.fn((dir: string, name: string) => `${dir}/${name}`.replace(/\/+/g, '/')),
      },
    },
    workbench: {
      FileTabs: {
        tapTabContextMenus: vi.fn((fn: Function) => tabMenuTaps.push(fn)),
      },
    },
    _actionButtonTaps: actionButtonTaps,
    _tabMenuTaps: tabMenuTaps,
    _treeMenuTaps: treeMenuTaps,
  } as any

  return ctx
}

describe('file-tree-functions plugin', () => {
  beforeEach(() => {
    mocks.isNormalRepo.mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('adds tree menus and executes core document actions', async () => {
    const ctx = createCtx()
    const runInTerminal = vi.fn()
    ctx.action.getActionHandler.mockReturnValue(runInTerminal)
    const node = { type: 'dir', repo: 'repo', path: '/docs', name: 'docs', marked: false }
    const items: any[] = []
    const vueCtx = { localMarked: { value: false } }

    fileTreeFunctions.register(ctx)
    ctx._treeMenuTaps[0](items, node, vueCtx)

    expect(items.map(item => item.id || item.type)).toEqual([
      'mark',
      'create-doc',
      'create-dir',
      'add-item',
      'rename',
      'delete',
      'duplicate',
      'separator',
      'open-in-os',
      'refresh',
      'find-in-folder',
      'open-in-terminal',
      'create-in-cd',
      'separator',
      'copy-name',
      'copy-path',
    ])

    await items.find(item => item.id === 'mark').onClick()
    expect(ctx.doc.markDoc).toHaveBeenCalledWith(node)
    expect(node.marked).toBe(true)

    items.find(item => item.id === 'create-doc').onClick()
    items.find(item => item.id === 'create-dir').onClick()
    items.find(item => item.id === 'rename').onClick()
    items.find(item => item.id === 'delete').onClick()
    items.find(item => item.id === 'duplicate').onClick()
    items.find(item => item.id === 'open-in-os').onClick()
    items.find(item => item.id === 'refresh').onClick()
    items.find(item => item.id === 'find-in-folder').onClick()
    items.find(item => item.id === 'open-in-terminal').onClick()
    items.find(item => item.id === 'copy-name').onClick()
    items.find(item => item.id === 'copy-path').onClick()

    expect(ctx.doc.createDoc).toHaveBeenCalledWith({ repo: 'repo' }, node)
    expect(ctx.doc.createDir).toHaveBeenCalledWith({ repo: 'repo' }, node)
    expect(ctx.doc.moveDoc).toHaveBeenCalledWith(node)
    expect(ctx.doc.deleteDoc).toHaveBeenCalledWith(node)
    expect(ctx.doc.duplicateDoc).toHaveBeenCalledWith(node)
    expect(ctx.doc.openInOS).toHaveBeenCalledWith(node)
    expect(ctx.tree.refreshTree).toHaveBeenCalled()
    expect(ctx.base.findInRepository).toHaveBeenCalledWith({ include: 'docs/**/*.md' })
    expect(runInTerminal).toHaveBeenCalledWith('--yank-note-run-command-cd-- /repo-root/docs')
    expect(ctx.utils.copyText).toHaveBeenCalledWith('docs')
    expect(ctx.utils.copyText).toHaveBeenCalledWith('/docs')
  })

  test('uploads selected files from add-item without using a real file picker', async () => {
    const ctx = createCtx()
    const input = document.createElement('input')
    const file = new File(['body'], 'a.md', { type: 'text/markdown' })
    Object.defineProperty(input, 'files', { value: [file] })
    input.click = vi.fn(() => input.onchange?.(new Event('change')))
    const createElement = vi.spyOn(document, 'createElement').mockReturnValueOnce(input)
    const items: any[] = []
    const node = { type: 'dir', repo: 'repo', path: '/docs', name: 'docs' }

    fileTreeFunctions.register(ctx)
    ctx._treeMenuTaps[0](items, node, { localMarked: { value: false } })
    items.find(item => item.id === 'add-item').onClick()
    await Promise.resolve()

    expect(createElement).toHaveBeenCalledWith('input')
    expect(input.type).toBe('file')
    expect(input.multiple).toBe(true)
    expect(ctx.utils.fileToBase64URL).toHaveBeenCalledWith(file)
    await vi.waitFor(() => {
      expect(ctx.api.upload).toHaveBeenCalledWith('repo', 'data:file', '/docs/a.md')
      expect(ctx.tree.refreshTree).toHaveBeenCalled()
    })
  })

  test('adds tab menus only for normal file repos and hides refresh in tabs', () => {
    const ctx = createCtx()
    const items: any[] = []
    const doc = { type: 'file', repo: 'repo', path: '/a.md', name: 'a.md' }

    fileTreeFunctions.register(ctx)
    ctx._tabMenuTaps[0](items, { payload: { file: doc } })

    expect(items.map(item => item.id || item.type)).toEqual([
      'rename',
      'delete',
      'duplicate',
      'separator',
      'open-in-os',
      'reveal-in-os',
      'create-in-cd',
      'separator',
      'copy-name',
      'copy-path',
    ])

    items.find(item => item.id === 'reveal-in-os').onClick()
    expect(ctx.doc.openInOS).toHaveBeenCalledWith(doc, true)

    const skippedItems: any[] = []
    mocks.isNormalRepo.mockReturnValue(false)
    ctx._tabMenuTaps[0](skippedItems, { payload: { file: doc } })
    expect(skippedItems).toEqual([])
  })

  test('adds node action buttons for writable directories only', () => {
    const ctx = createCtx()
    const btns: any[] = []
    const node = { type: 'dir', repo: 'repo', path: '/docs' }

    fileTreeFunctions.register(ctx)
    ctx._actionButtonTaps[0](btns, node)

    expect(btns.map(btn => btn.id)).toEqual(['create-folder', 'create-file'])
    btns[0].onClick()
    btns[1].onClick()
    expect(ctx.doc.createDir).toHaveBeenCalledWith({ repo: 'repo' }, node)
    expect(ctx.doc.createDoc).toHaveBeenCalledWith({ repo: 'repo' }, node)

    const readonlyCtx = createCtx()
    readonlyCtx.args.FLAG_READONLY = true
    const readonlyBtns: any[] = []
    fileTreeFunctions.register(readonlyCtx)
    readonlyCtx._actionButtonTaps[0](readonlyBtns, node)
    expect(readonlyBtns).toEqual([])
  })
})
