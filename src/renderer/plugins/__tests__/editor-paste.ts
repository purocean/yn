const mocks = vi.hoisted(() => ({
  editor: {
    addAction: vi.fn(),
    executeEdits: vi.fn(),
    focus: vi.fn(),
    getModel: vi.fn(),
    getSelection: vi.fn(),
    getSelections: vi.fn(),
    hasTextFocus: vi.fn(() => true),
    onDidPaste: vi.fn(),
  },
  insert: vi.fn(),
  refreshTree: vi.fn(),
  triggerHook: vi.fn(),
  upload: vi.fn(),
  fileToBase64URL: vi.fn(),
  isKeydown: vi.fn(() => false),
}))

vi.mock('@fe/services/editor', () => ({
  getEditor: vi.fn(() => mocks.editor),
  insert: mocks.insert,
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/services/tree', () => ({
  refreshTree: mocks.refreshTree,
}))

vi.mock('@fe/services/base', () => ({
  upload: mocks.upload,
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: {
      currentFile: { repo: 'repo', path: '/docs/current.md' },
    },
  },
}))

vi.mock('@fe/utils', () => ({
  encodeMarkdownLink: vi.fn((value: string) => encodeURI(value)),
  fileToBase64URL: mocks.fileToBase64URL,
  path: {
    extname: vi.fn((value: string) => value.includes('.') ? value.slice(value.lastIndexOf('.')) : ''),
  },
}))

vi.mock('@fe/core/keybinding', () => ({
  isKeydown: mocks.isKeydown,
}))

import editorPaste from '../editor-paste'
import store from '@fe/support/store'

function createCtx () {
  const statusMenus = { 'status-bar-insert': { list: [] } }
  return {
    base: {
      readFromClipboard: vi.fn(),
    },
    editor: {
      whenEditorReady: vi.fn(() => Promise.resolve({ editor: mocks.editor })),
    },
    i18n: { t: vi.fn((key: string) => key) },
    lib: {
      mime: { getExtension: vi.fn(() => 'png') },
    },
    statusBar: {
      tapMenus: vi.fn((fn: any) => fn(statusMenus)),
    },
    _statusMenus: statusMenus,
  } as any
}

function setupSelectedPaste (selectedText: string, pastedText: string) {
  const selection = { isEmpty: () => false }
  const model = {
    getLanguageId: vi.fn(() => 'markdown'),
    getValueInRange: vi.fn((range: any) => range === selection ? selectedText : pastedText),
  }

  mocks.editor.getSelections.mockReturnValue([selection])
  mocks.editor.getSelection.mockReturnValue(selection)
  mocks.editor.getModel.mockReturnValue(model)
}

describe('editor-paste plugin', () => {
  let pasteListener: (event: any) => void

  beforeEach(() => {
    vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, listener: any) => {
      if (type === 'paste') {
        pasteListener = listener
      }
    }) as any)
    Object.values(mocks.editor).forEach((fn: any) => fn.mockClear?.())
    mocks.insert.mockClear()
    mocks.refreshTree.mockClear()
    mocks.triggerHook.mockClear()
    mocks.upload.mockClear()
    mocks.fileToBase64URL.mockClear()
    mocks.isKeydown.mockReset()
    mocks.isKeydown.mockReturnValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('registers paste listener, status bar menu items, and editor actions', async () => {
    const ctx = createCtx()

    editorPaste.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    expect(window.addEventListener).toHaveBeenCalledWith('paste', expect.any(Function), true)
    expect(ctx.statusBar.tapMenus).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx._statusMenus['status-bar-insert'].list.map((item: any) => item.id || item.type)).toEqual([
      'plugin.editor-paste.insert-image-base64',
      'plugin.editor-paste.insert-rt',
      'separator',
    ])
    expect(mocks.editor.addAction.mock.calls.map(([action]: any[]) => action.id)).toEqual([
      'plugin.editor-paste.insert-image',
      'plugin.editor-paste.insert-image-base64',
      'plugin.editor-paste.insert-rt',
    ])
  })

  test('turns selected text plus pasted url into a markdown link', async () => {
    const ctx = createCtx()
    editorPaste.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value
    setupSelectedPaste('Yank Note [docs]', 'https://example.com/a b')

    pasteListener({
      clipboardData: { items: [] },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    })
    const onDidPaste = mocks.editor.onDidPaste.mock.calls[0][0]
    const pasteRange = { id: 'paste-range' }
    onDidPaste({ range: pasteRange })

    expect(mocks.editor.executeEdits).toHaveBeenCalledWith('paste', [{
      range: pasteRange,
      text: '[Yank Note \\[docs\\]](https://example.com/a%20b)',
    }])
  })

  test('turns pasted text plus selected url into a markdown link and ignores url-over-url paste', async () => {
    const ctx = createCtx()
    editorPaste.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value
    setupSelectedPaste('https://example.com/doc a', 'Doc [title]')

    pasteListener({
      clipboardData: { items: [] },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    })
    const onDidPaste = mocks.editor.onDidPaste.mock.calls[0][0]
    const pasteRange = { id: 'paste-range' }
    onDidPaste({ range: pasteRange })

    expect(mocks.editor.executeEdits).toHaveBeenCalledWith('paste', [{
      range: pasteRange,
      text: '[Doc \\[title\\]](https://example.com/doc%20a)',
    }])

    mocks.editor.executeEdits.mockClear()
    setupSelectedPaste('https://example.com/a', 'https://example.com/b')
    pasteListener({
      clipboardData: { items: [] },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    })
    onDidPaste({ range: pasteRange })

    expect(mocks.editor.executeEdits).not.toHaveBeenCalled()
  })

  test('turns tab-separated markdown paste into a table', async () => {
    const ctx = createCtx()
    editorPaste.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value
    setupSelectedPaste('selected\ntext', 'A\tB\n1\t2\n3\t4')
    pasteListener({
      clipboardData: { items: [] },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    })

    const onDidPaste = mocks.editor.onDidPaste.mock.calls[0][0]
    const pasteRange = { id: 'table-range' }
    onDidPaste({ range: pasteRange })

    expect(mocks.editor.executeEdits).toHaveBeenCalledWith('paste', [{
      range: pasteRange,
      text: '| A | B |\n| -- | -- |\n| 1 | 2 |\n| 3 | 4 |',
    }])
  })

  test('handles paste event image and html clipboard branches', async () => {
    const ctx = createCtx()
    editorPaste.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value
    const imageFile = new File(['img'], 'clip.png', { type: 'image/png' })
    mocks.fileToBase64URL.mockResolvedValue('data:image/png;base64,aW1n')
    mocks.isKeydown.mockImplementation((key: string) => key === 'B')
    const preventDefault = vi.fn()
    const stopPropagation = vi.fn()

    pasteListener({
      clipboardData: {
        items: [{ type: 'image/png', getAsFile: () => imageFile }],
      },
      preventDefault,
      stopPropagation,
    })
    await Promise.resolve()

    expect(preventDefault).toHaveBeenCalled()
    expect(stopPropagation).toHaveBeenCalled()
    expect(mocks.insert).toHaveBeenCalledWith('![Img](data:image/png;base64,aW1n)\n')

    mocks.insert.mockClear()
    mocks.isKeydown.mockImplementation((key: string) => key === 'D')
    pasteListener({
      clipboardData: {
        items: [{ type: 'text/html', getAsString: (fn: Function) => fn('<h1>Title</h1><p>Body</p>') }],
      },
      preventDefault,
      stopPropagation,
    })
    await Promise.resolve()

    expect(mocks.insert).toHaveBeenCalledWith(expect.stringContaining('# Title'))
  })

  test('uploads pasted images to the current document unless an image hook handles it', async () => {
    const ctx = createCtx()
    editorPaste.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value
    mocks.upload.mockResolvedValue('assets/my image.png')
    mocks.triggerHook.mockResolvedValue(false)

    pasteListener({
      clipboardData: {
        items: [{ type: 'image/png', getAsFile: () => new File(['img'], 'clip.png', { type: 'image/png' }) }],
      },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(mocks.upload).toHaveBeenCalledWith(expect.any(File), store.state.currentFile, expect.stringMatching(/^img-\d{14}\.png$/))
    expect(mocks.insert).toHaveBeenCalledWith('![Img](assets/my%20image.png)\n')
    expect(mocks.refreshTree).toHaveBeenCalled()

    mocks.insert.mockClear()
    mocks.upload.mockClear()
    mocks.triggerHook.mockResolvedValue(true)
    pasteListener({
      clipboardData: {
        items: [{ type: 'image/png', getAsFile: () => new File(['img'], 'handled.png', { type: 'image/png' }) }],
      },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.refreshTree).toHaveBeenCalledTimes(2)
  })
})
