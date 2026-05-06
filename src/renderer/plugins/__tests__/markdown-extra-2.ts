const mocks = vi.hoisted(() => {
  const lines = new Map<number, string>()
  const editor = {
    addAction: vi.fn(),
    executeEdits: vi.fn(),
    focus: vi.fn(),
    getModel: vi.fn(),
    getOption: vi.fn(() => 20),
    getScrollTop: vi.fn(() => 0),
    getSelection: vi.fn(),
    getSelections: vi.fn(),
    getTopForLineNumber: vi.fn((line: number) => line * 20),
    hasTextFocus: vi.fn(() => true),
    layout: vi.fn(),
    onDidPaste: vi.fn(),
    onDidScrollChange: vi.fn(),
    setPosition: vi.fn(),
    setScrollTop: vi.fn(),
  }

  return {
    lines,
    editor,
    copyText: vi.fn(),
    deleteLine: vi.fn((line: number) => lines.delete(line)),
    disableSyncScrollAwhile: vi.fn((fn: Function) => {
      fn()
      return Promise.resolve()
    }),
    fileToBase64URL: vi.fn(),
    getPurchased: vi.fn(() => true),
    hasCtrlCmd: vi.fn(() => false),
    insert: vi.fn(),
    isKeydown: vi.fn(() => false),
    modalInput: vi.fn(),
    readFile: vi.fn(),
    refreshTree: vi.fn(),
    render: vi.fn(),
    renderImmediately: vi.fn(),
    replaceLine: vi.fn((line: number, text: string) => lines.set(line, text)),
    sortableOptions: [] as any[],
    sortableInstances: [] as any[],
    toastShow: vi.fn(),
    triggerHook: vi.fn(),
    upload: vi.fn(),
  }
})

vi.mock('sortablejs', () => ({
  default: {
    create: vi.fn((_el: HTMLElement, options: any) => {
      const instance = {
        toArray: vi.fn(() => ['a', 'b']),
        sort: vi.fn(),
        destroy: vi.fn(),
      }
      mocks.sortableOptions.push(options)
      mocks.sortableInstances.push(instance)
      return instance
    }),
  },
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
  default: {
    args: { HELP_REPO_NAME: 'help' },
    lib: {
      lodash: {
        debounce: (fn: any) => fn,
        pick: (obj: any, ...keys: string[]) => Object.fromEntries(keys.filter(key => key in obj).map(key => [key, obj[key]])),
      },
    },
    ui: {
      useToast: () => ({ show: mocks.toastShow }),
    },
  },
}))

vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: {
    DISPLAY_NONE: 'data-display-none',
    ONLY_CHILD: 'data-only-child',
    SOURCE_LINE_START: 'data-source-line',
    SOURCE_LINE_END: 'data-source-line-end',
    TOKEN_IDX: 'data-token-idx',
  },
  DOM_CLASS_NAME: {
    REDUCE_BRIGHTNESS: 'reduce-brightness',
    SKIP_EXPORT: 'skip-export',
    SKIP_PRINT: 'skip-print',
  },
  FLAG_READONLY: false,
}))

vi.mock('@fe/support/ui/modal', () => ({
  useModal: vi.fn(() => ({ input: mocks.modalInput })),
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: vi.fn(() => ({ show: mocks.toastShow })),
}))

vi.mock('@fe/core/keybinding', () => ({
  hasCtrlCmd: mocks.hasCtrlCmd,
  isKeydown: mocks.isKeydown,
}))

vi.mock('@fe/services/view', () => ({
  disableSyncScrollAwhile: mocks.disableSyncScrollAwhile,
  render: mocks.render,
  renderImmediately: mocks.renderImmediately,
}))

vi.mock('@fe/services/editor', () => ({
  deleteLine: mocks.deleteLine,
  getEditor: vi.fn(() => mocks.editor),
  getLineContent: vi.fn((line: number) => mocks.lines.get(line) || ''),
  getMonaco: vi.fn(() => ({
    editor: { EditorOption: { lineHeight: 'lineHeight' } },
    Position: class {},
    Range: class {
      startLineNumber: number
      constructor (startLineNumber: number) {
        this.startLineNumber = startLineNumber
      }
    },
  })),
  insert: mocks.insert,
  replaceLine: mocks.replaceLine,
}))

vi.mock('@fe/services/i18n', () => ({
  t: vi.fn((key: string, value?: string) => value ? `${key}:${value}` : key),
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
      showView: true,
    },
  },
}))

vi.mock('@fe/utils', async () => {
  const crypto = await import('node:crypto')
  return {
    downloadDataURL: vi.fn(),
    encodeMarkdownLink: vi.fn((value: string) => encodeURI(value)),
    fileToBase64URL: mocks.fileToBase64URL,
    getLogger: vi.fn(() => ({ debug: vi.fn() })),
    md5: (value: string) => crypto.createHash('md5').update(value).digest('hex'),
    path: {
      extname: vi.fn((value: string) => value.includes('.') ? value.slice(value.lastIndexOf('.')) : ''),
    },
    strToBase64: vi.fn((value: string) => `base64:${value}`),
    waitCondition: vi.fn(async () => undefined),
  }
})

vi.mock('@fe/support/api', () => ({
  readFile: mocks.readFile,
}))

vi.mock('@fe/others/premium', () => ({
  getPurchased: mocks.getPurchased,
}))

vi.mock('@fe/services/document', () => ({
  isPlain: vi.fn((doc: any) => typeof doc.path === 'string' && doc.path.endsWith('.md')),
}))

import MarkdownIt from 'markdown-it'
import { Comment, Fragment, Text, h } from 'vue'
import markdownMacro from '../markdown-macro'
import markdownRenderVNode from '../markdown-render-vnode'
import markdownFootnote from '../markdown-footnote'
import editorPaste from '../editor-paste'
import markdownTable from '../markdown-table'
import floatingEditor from '../floating-editor'

function createMacroCtx (md: MarkdownIt) {
  const hooks = new Map<string, Function[]>()
  const ctx = {
    args: { HELP_REPO_NAME: 'help' },
    editor: {
      tapMarkdownMonarchLanguage: vi.fn(),
      tapSimpleCompletionItems: vi.fn(),
    },
    i18n: { t: vi.fn((key: string) => key) },
    lib: {
      lodash: {
        pick: (obj: any, ...keys: string[]) => Object.fromEntries(keys.filter(key => key in obj).map(key => [key, obj[key]])),
      },
    },
    markdown: { registerPlugin: vi.fn((plugin: any) => md.use(plugin)) },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, [...(hooks.get(name) || []), fn])),
    renderer: { getRenderCache: vi.fn(() => ({ $define: {} })) },
    setting: { changeSchema: vi.fn() },
    statusBar: { refreshMenu: vi.fn(), tapMenus: vi.fn() },
    utils: { copyText: mocks.copyText },
    view: {
      getRenderEnv: vi.fn(),
      render: vi.fn(),
    },
    hooks,
  } as any

  return ctx
}

function createRenderCtx (md: MarkdownIt) {
  return {
    markdown: { registerPlugin: vi.fn((plugin: any) => md.use(plugin)) },
    view: { addStyles: vi.fn() },
  } as any
}

function setRect (el: HTMLElement, rect: Partial<DOMRect>) {
  el.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect))
}

function createFloatingCtx () {
  const editorDom = document.createElement('div')
  const previewDom = document.createElement('div')
  const iframe = document.createElement('iframe')
  const actions = new Map<string, any>()
  const hooks = new Map<string, Function[]>()
  setRect(previewDom, { left: 100, top: 40, bottom: 640, width: 500, height: 600 })
  setRect(iframe, { top: 40 })

  const ctx = {
    action: {
      registerAction: vi.fn((action: any) => actions.set(action.name, action)),
      getActionHandler: vi.fn((name: string) => actions.get(name).handler),
    },
    actions,
    args: { FLAG_READONLY: false, MODE: 'normal' },
    editor: {
      getEditor: vi.fn(() => mocks.editor),
      getMonaco: vi.fn(() => ({ editor: { EditorOption: { lineHeight: 'lineHeight' } } })),
      highlightLine: vi.fn(),
      isDefault: vi.fn(() => true),
      whenEditorReady: vi.fn(() => Promise.resolve({ editor: mocks.editor })),
    },
    editorDom,
    hooks,
    i18n: { t: vi.fn((key: string, arg?: string) => arg ? `${key}:${arg}` : key) },
    keybinding: { Alt: 'Alt', getKeysLabel: vi.fn(() => 'Alt') },
    layout: {
      emitResize: vi.fn(),
      getContainerDom: vi.fn((name: string) => name === 'editor' ? editorDom : previewDom),
    },
    lib: { vue: { watch: vi.fn() } },
    previewDom,
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, [...(hooks.get(name) || []), fn])),
    storage: { get: vi.fn(() => 0), set: vi.fn() },
    store: {
      state: {
        currentFile: { plain: true, writeable: true, name: 'note.md' },
        presentation: false,
        previewer: 'default',
        showEditor: false,
        showView: true,
      },
    },
    theme: { addStyles: vi.fn(() => Promise.resolve()) },
    view: {
      disableSyncScrollAwhile: mocks.disableSyncScrollAwhile,
      getRenderIframe: vi.fn(() => Promise.resolve(iframe)),
    },
  } as any
  actions.set('layout.toggle-editor', { handler: vi.fn() })
  return ctx
}

function createPasteCtx () {
  return {
    base: { readFromClipboard: vi.fn() },
    editor: { whenEditorReady: vi.fn(() => Promise.resolve({ editor: mocks.editor })) },
    i18n: { t: vi.fn((key: string) => key) },
    lib: { mime: { getExtension: vi.fn(() => 'png') } },
    statusBar: { tapMenus: vi.fn((fn: any) => fn({ 'status-bar-insert': { list: [] } })) },
  } as any
}

function createTableCtx (md: MarkdownIt) {
  return {
    args: { FLAG_READONLY: false },
    editor: { getLineContent: vi.fn((line: number) => mocks.lines.get(line) || '') },
    i18n: { t: vi.fn((key: string) => key) },
    lib: { vue: { h } },
    markdown: { registerPlugin: vi.fn((plugin: any, options?: any) => md.use(plugin, options)) },
    registerHook: vi.fn(),
    theme: { addStyles: vi.fn() },
    ui: { useToast: vi.fn(() => ({ show: mocks.toastShow })) },
    view: {
      addStyles: vi.fn(),
      getViewDom: vi.fn(() => document.createElement('div')),
      tapContextMenus: vi.fn(),
    },
  } as any
}

function buildTableDom () {
  const table = document.createElement('table')
  const thead = document.createElement('thead')
  const tbody = document.createElement('tbody')
  const headRow = document.createElement('tr')
  const bodyRow = document.createElement('tr')

  for (let i = 0; i < 2; i++) {
    const th = document.createElement('th')
    th.className = 'yn-table-cell'
    th.dataset.sourceLine = '1'
    th.dataset.sourceLineEnd = '2'
    headRow.appendChild(th)
  }

  for (let i = 0; i < 2; i++) {
    const td = document.createElement('td')
    td.className = 'yn-table-cell'
    td.dataset.sourceLine = '3'
    td.dataset.sourceLineEnd = '4'
    bodyRow.appendChild(td)
  }

  thead.appendChild(headRow)
  tbody.appendChild(bodyRow)
  table.append(thead, tbody)
  document.body.appendChild(table)
  return { table, firstCell: bodyRow.children[0] as HTMLTableCellElement, secondCell: bodyRow.children[1] as HTMLTableCellElement }
}

function getTableMenus (ctx: any, target: HTMLElement) {
  const menus: any[] = []
  ctx.view.tapContextMenus.mock.calls[0][0](menus, {
    target,
    type: 'contextmenu',
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  })
  return menus
}

describe('markdown extra branch coverage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    mocks.lines.clear()
    mocks.copyText.mockClear()
    mocks.deleteLine.mockClear()
    mocks.disableSyncScrollAwhile.mockClear()
    mocks.editor.executeEdits.mockClear()
    mocks.editor.getModel.mockReset()
    mocks.editor.getSelection.mockReset()
    mocks.editor.getSelections.mockReset()
    mocks.editor.hasTextFocus.mockReset()
    mocks.editor.hasTextFocus.mockReturnValue(true)
    mocks.fileToBase64URL.mockReset()
    mocks.getPurchased.mockReset()
    mocks.getPurchased.mockReturnValue(true)
    mocks.insert.mockClear()
    mocks.isKeydown.mockReset()
    mocks.isKeydown.mockReturnValue(false)
    mocks.modalInput.mockReset()
    mocks.readFile.mockReset()
    mocks.refreshTree.mockClear()
    mocks.replaceLine.mockClear()
    mocks.toastShow.mockClear()
    mocks.triggerHook.mockReset()
    mocks.upload.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  test('macro leaves source untouched when disabled or safeMode and hides copy menu in those states', () => {
    const md = new MarkdownIt()
    const ctx = createMacroCtx(md)
    markdownMacro.register(ctx)

    const disabledEnv: any = { attributes: { enableMacro: false }, source: '[= 1 + 1 =]' }
    md.parse('[= 1 + 1 =]', disabledEnv)
    expect(disabledEnv.source).toBe('[= 1 + 1 =]')

    const safeEnv: any = { attributes: { enableMacro: true }, safeMode: true, source: '[= 1 + 1 =]' }
    md.parse('[= 1 + 1 =]', safeEnv)
    expect(safeEnv.source).toBe('[= 1 + 1 =]')

    const menus = { 'status-bar-tool': { list: [] as any[] } }
    ctx.view.getRenderEnv.mockReturnValue({ attributes: { enableMacro: true }, safeMode: true, source: 'safe' })
    ctx.hooks.get('STARTUP')![0]()
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)
    expect(menus['status-bar-tool'].list[0]).toMatchObject({
      id: 'plugin.markdown-macro.copy-markdown',
      hidden: true,
    })
  })

  test('macro falls back to literal expression on thrown or unsupported results and reports afterMacro errors', () => {
    const md = new MarkdownIt()
    const ctx = createMacroCtx(md)
    markdownMacro.register(ctx)
    const env: any = {
      attributes: { enableMacro: true },
      file: { type: 'file', repo: 'main', name: 'note.md', path: '/repo/note.md' },
    }

    md.parse('[= (() => { throw new Error("bad") })() =]\n[= ({ a: 1 }) =]\n[= $afterMacro(() => { throw new Error("boom") }) =]ok', env)

    expect(env.source).toContain('[= (() => { throw new Error("bad") })() =]')
    expect(env.source).toContain('[= ({ a: 1 }) =]')
    expect(env.source).toContain('ok')
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', expect.stringContaining('[$afterMacro]: Error: boom'))
  })

  test('render-vnode keeps safe data image src, strips invalid/event attrs, and handles comments plus html vnodes', () => {
    const md = new MarkdownIt({ html: true })
    markdownRenderVNode.register(createRenderCtx(md))
    const tokens = md.parse('<div data-ok="1">ok</div>\n\n<!-- note -->\n\n![x](data:image/png;base64,abc)', { safeMode: true })
    const nodes = md.renderer.render(tokens, md.options, { safeMode: true }) as any[]
    const htmlFragment = nodes.find(node => node.type === Fragment && node.children[0]?.type === 'div')
    const paragraph = nodes.find(node => node.type === 'p')
    const image = paragraph.children[0].children.find((child: any) => child.type === 'img')
    const attrs = (md.renderer.renderAttrs as any)({
      attrs: [['onclick', 'bad()'], ['bad attr', 'x'], ['data-ok', '1']],
    })
    const comment = (md.renderer.renderToken as any)([{ tag: '--', nesting: 0 }], 0, md.options)

    expect(htmlFragment.children[0]).toMatchObject({ type: 'div', props: { 'data-ok': '1' } })
    expect(comment.type).toBe(Comment)
    expect(image.props.src).toBe('data:image/png;base64,abc')
    expect(attrs).toEqual({ 'data-ok': '1' })
  })

  test('render-vnode applies macro line offsets to block source attrs', () => {
    const md = new MarkdownIt()
    markdownRenderVNode.register(createRenderCtx(md))
    const source = 'a\nb\n# Title'
    const env: any = {
      bMarks: [0, 2, 4],
      eMarks: [1, 3, 11],
      macroLines: [{
        matchPos: 1,
        lineOffset: 2,
        posOffset: 0,
        currentPosOffset: 0,
      }],
    }
    const nodes = md.renderer.render(md.parse(source, env), md.options, env) as any[]
    const heading = nodes.find(node => node.type === 'h1')

    expect(heading.props).toMatchObject({
      'data-source-line': '5',
      'data-source-line-end': '6',
    })
  })

  test('footnote repeated references render sub ids in captions and backlinks', () => {
    const md = new MarkdownIt()
    markdownFootnote.register(createRenderCtx(md))
    const env = { docId: 'doc-a' }
    const tokens = md.parse('A[^n] B[^n]\n\n[^n]: note', env)
    const refs = tokens.flatMap(token => token.children || []).filter(token => token.type === 'footnote_ref')
    const anchors = tokens.filter(token => token.type === 'footnote_anchor')

    expect(md.renderer.rules.footnote_ref!(refs, 1, md.options, env, md.renderer as any)).toContain('[1:1]')
    expect(md.renderer.rules.footnote_anchor!(anchors, 1, md.options, env, md.renderer as any)).toContain('href="#fnref-doc-a-1:1"')
  })

  test('editor paste ignores missing focus or clipboard data and clears selected text after non-markdown paste', async () => {
    let pasteListener: (event: any) => void = () => undefined
    vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, listener: any) => {
      if (type === 'paste') pasteListener = listener
    }) as any)
    const ctx = createPasteCtx()
    editorPaste.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    mocks.editor.hasTextFocus.mockReturnValue(false)
    pasteListener({ clipboardData: { items: [] }, preventDefault: vi.fn(), stopPropagation: vi.fn() })
    expect(mocks.editor.getSelections).not.toHaveBeenCalled()

    mocks.editor.hasTextFocus.mockReturnValue(true)
    pasteListener({ clipboardData: null, preventDefault: vi.fn(), stopPropagation: vi.fn() })
    expect(mocks.editor.getSelections).not.toHaveBeenCalled()

    const selection = { isEmpty: () => false }
    const model = {
      getLanguageId: vi.fn(() => 'plaintext'),
      getValueInRange: vi.fn((range: any) => range === selection ? 'label' : 'https://example.com'),
    }
    mocks.editor.getSelections.mockReturnValue([selection])
    mocks.editor.getSelection.mockReturnValue(selection)
    mocks.editor.getModel.mockReturnValue(model)
    pasteListener({ clipboardData: { items: [] }, preventDefault: vi.fn(), stopPropagation: vi.fn() })
    mocks.editor.onDidPaste.mock.calls[0][0]({ range: { id: 'paste' } })
    expect(mocks.editor.executeEdits).not.toHaveBeenCalled()
  })

  test('table quick edit reports an edit error when the clicked cell has no matching markdown column', async () => {
    const md = new MarkdownIt()
    const ctx = createTableCtx(md)
    markdownTable.register(ctx)
    mocks.lines.set(1, '| Name | Score |')
    mocks.lines.set(2, '| --- | --- |')
    mocks.lines.set(3, '| A |')
    const { secondCell } = buildTableDom()
    const menus = getTableMenus(ctx, secondCell)

    menus.find(menu => menu.id === 'plugin.table.cell-edit.quick-edit').onClick()
    await Promise.resolve()
    await Promise.resolve()

    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'table-cell-edit.edit-error')
    expect(mocks.replaceLine).not.toHaveBeenCalled()
  })

  test('floating editor noops when unavailable and suppresses hints after the display limit', async () => {
    vi.useFakeTimers()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn: FrameRequestCallback) => {
      fn(0)
      return 1
    })
    const ctx = createFloatingCtx()
    ctx.store.state.showEditor = true
    ctx.storage.get.mockReturnValue(5)
    floatingEditor.register(ctx)

    await ctx.actions.get('layout.show-floating-editor').handler({ line: 2, clientY: 80 })
    expect(ctx.editorDom.classList.contains('floating-editor-active')).toBe(false)

    const canShow = ctx.lib.vue.watch.mock.calls[0][0]
    const onChange = ctx.lib.vue.watch.mock.calls[0][1]
    expect(canShow()).toBe(false)
    ctx.store.state.showEditor = false
    onChange(true)
    expect(document.body.querySelector('.floating-editor-hint')).toBeNull()
  })
})
