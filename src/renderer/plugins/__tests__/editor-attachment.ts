const mocks = vi.hoisted(() => ({
  choosePath: vi.fn(),
  currentFile: { repo: 'repo-a', path: '/docs/current.md', name: 'current.md' } as any,
  insert: vi.fn(),
  isSameRepo: vi.fn(() => true),
  refreshTree: vi.fn(),
  toast: { show: vi.fn() },
  upload: vi.fn(),
  whenEditorReady: vi.fn(),
}))

vi.mock('dayjs', () => ({
  default: vi.fn(() => ({
    format: vi.fn(() => '2026-05-02 15:04'),
  })),
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/services/editor', () => ({
  insert: mocks.insert,
  whenEditorReady: mocks.whenEditorReady,
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: {
      get currentFile () {
        return mocks.currentFile
      },
      set currentFile (value: any) {
        mocks.currentFile = value
      },
    },
  },
}))

vi.mock('@fe/support/api', () => ({
  choosePath: mocks.choosePath,
}))

vi.mock('@fe/services/tree', () => ({
  refreshTree: mocks.refreshTree,
}))

vi.mock('@fe/services/base', () => ({
  upload: mocks.upload,
}))

vi.mock('@fe/services/document', () => ({
  isSameRepo: mocks.isSameRepo,
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: vi.fn(() => mocks.toast),
}))

vi.mock('@fe/support/args', () => ({
  DOM_CLASS_NAME: {
    MARK_OPEN: 'mark-open',
  },
}))

vi.mock('@fe/services/i18n', () => ({
  t: vi.fn((key: string) => key),
}))

vi.mock('@fe/utils', () => ({
  encodeMarkdownLink: vi.fn((value: string) => value.replaceAll(' ', '%20')),
  escapeMd: vi.fn((value: string) => value.replaceAll('[', '\\[').replaceAll(']', '\\]')),
}))

vi.mock('@fe/utils/path', () => ({
  basename: vi.fn((filePath: string) => filePath.split('/').pop()),
  dirname: vi.fn((filePath: string) => filePath.replace(/\/[^/]*$/, '') || '/'),
  isBelongTo: vi.fn((cwd: string, filePath: string) => filePath.startsWith(`${cwd}/`)),
  join: vi.fn((...parts: string[]) => parts.join('/').replace(/\/+/g, '/')),
  normalizeSep: vi.fn((filePath: string) => filePath.replaceAll('\\', '/')),
  relative: vi.fn((cwd: string, filePath: string) => filePath.slice(cwd.length + 1)),
}))

import editorAttachment from '../editor-attachment'

function createCtx () {
  return {
    editor: {
      lookupKeybindingKeys: vi.fn((id: string) => [id]),
    },
    i18n: {
      t: vi.fn((key: string) => key),
    },
    keybinding: {
      Alt: 'Alt',
      Shift: 'Shift',
      getKeysLabel: vi.fn((keys: string[]) => keys.join('+')),
    },
    routines: {
      chooseDocument: vi.fn(),
    },
    statusBar: {
      tapMenus: vi.fn(),
    },
  } as any
}

function createMonaco () {
  return {
    KeyCode: {
      KeyD: 68,
      KeyF: 70,
      KeyI: 73,
    },
    KeyMod: {
      Alt: 1000,
      Shift: 4000,
    },
  }
}

describe('editor-attachment plugin', () => {
  beforeEach(() => {
    mocks.choosePath.mockReset()
    mocks.currentFile = { repo: 'repo-a', path: '/docs/current.md', name: 'current.md' }
    mocks.insert.mockReset()
    mocks.isSameRepo.mockReset()
    mocks.isSameRepo.mockReturnValue(true)
    mocks.refreshTree.mockReset()
    mocks.toast.show.mockReset()
    mocks.upload.mockReset()
    mocks.upload.mockResolvedValue('/docs/assets/local file.png')
    mocks.whenEditorReady.mockReset()
    mocks.whenEditorReady.mockResolvedValue({
      editor: { addAction: vi.fn() },
      monaco: createMonaco(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('registers editor actions and status-bar insertion menus', async () => {
    const ctx = createCtx()

    editorAttachment.register(ctx)
    const ready = await mocks.whenEditorReady.mock.results[0].value

    expect(ready.editor.addAction.mock.calls.map(([action]: any[]) => action.id)).toEqual([
      'plugin.editor.add-image',
      'plugin.editor.add-file',
      'plugin.editor.link-doc',
      'plugin.editor.link-file',
    ])

    const menus = { 'status-bar-insert': { list: [] as any[] } }
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)
    expect(menus['status-bar-insert'].list.map(item => item.id || item.type)).toEqual([
      'plugin.editor.add-image',
      'plugin.editor.add-file',
      'plugin.editor.link-doc',
      'plugin.editor.link-file',
      'separator',
    ])
  })

  test('uploads selected files as image markdown and regular attachment links', async () => {
    const ctx = createCtx()
    const file = new File(['hello'], 'report [draft].png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: 2048 })
    const input = {
      type: '',
      multiple: false,
      files: [file],
      onchange: null as null | (() => Promise<void>),
      click: vi.fn(function (this: any) {
        return this.onchange?.()
      }),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(input as any)

    editorAttachment.register(ctx)
    const ready = await mocks.whenEditorReady.mock.results[0].value
    const actions = new Map(ready.editor.addAction.mock.calls.map(([action]: any[]) => [action.id, action]))

    await actions.get('plugin.editor.add-image')!.run()
    await actions.get('plugin.editor.add-file')!.run()

    expect(input.type).toBe('file')
    expect(input.multiple).toBe(true)
    expect(mocks.upload).toHaveBeenCalledWith(file, mocks.currentFile, 'report [draft].png')
    expect(mocks.insert.mock.calls.map(([text]: any[]) => text)).toEqual([
      '![Img](/docs/assets/local%20file.png)\n',
      '[2026-05-02 15:04] [report \\[draft\\].png (2.00KiB)](/docs/assets/local%20file.png){.mark-open}\n',
    ])
    expect(mocks.refreshTree).toHaveBeenCalledTimes(2)
  })

  test('links multiple filesystem paths as a markdown list', async () => {
    const ctx = createCtx()
    mocks.choosePath.mockResolvedValue({
      filePaths: ['C:\\docs\\One File.md', '/tmp/two.md'],
    })

    editorAttachment.register(ctx)
    const ready = await mocks.whenEditorReady.mock.results[0].value
    const action = ready.editor.addAction.mock.calls.find(([item]: any[]) => item.id === 'plugin.editor.link-file')[0]
    await action.run()

    expect(mocks.insert.mock.calls.map(([text]: any[]) => text)).toEqual([
      '- [One File.md](file://C:/docs/One%20File.md)\n',
      '- [two.md](file:///tmp/two.md)\n',
    ])
  })

  test('links same-repo documents relatively and warns for different repositories', async () => {
    const ctx = createCtx()
    ctx.routines.chooseDocument
      .mockResolvedValueOnce({ repo: 'repo-a', path: '/docs/sub/target.md', name: 'target.md' })
      .mockResolvedValueOnce({ repo: 'repo-b', path: '/other.md', name: 'other.md' })
    mocks.isSameRepo.mockReturnValueOnce(true).mockReturnValueOnce(false)

    editorAttachment.register(ctx)
    const ready = await mocks.whenEditorReady.mock.results[0].value
    const action = ready.editor.addAction.mock.calls.find(([item]: any[]) => item.id === 'plugin.editor.link-doc')[0]

    await action.run()
    await action.run()

    expect(mocks.insert).toHaveBeenCalledWith('[target](sub/target.md)')
    expect(mocks.toast.show).toHaveBeenCalledWith('warning', 'insert-different-repo-doc')
  })

  test('throws when uploading or linking documents without an opened file', async () => {
    const ctx = createCtx()
    const input = {
      files: [new File(['x'], 'x.txt')],
      onchange: null as null | (() => Promise<void>),
      click: vi.fn(),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(input as any)
    mocks.currentFile = null

    editorAttachment.register(ctx)
    const ready = await mocks.whenEditorReady.mock.results[0].value
    const addFile = ready.editor.addAction.mock.calls.find(([item]: any[]) => item.id === 'plugin.editor.add-file')[0]

    addFile.run()
    await expect(input.onchange!()).rejects.toThrow('No file opened.')
  })
})
