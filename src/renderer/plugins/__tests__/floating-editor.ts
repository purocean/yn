vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: {
    SOURCE_LINE_START: 'data-source-line',
    SOURCE_LINE_END: 'data-source-line-end',
  },
}))

import floatingEditor from '../floating-editor'

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

function createCtx () {
  const editorDom = document.createElement('div')
  const previewDom = document.createElement('div')
  const iframe = document.createElement('iframe')
  const actions = new Map<string, any>()
  const hooks = new Map<string, Function[]>()
  const keyDownHandlers: Function[] = []
  const monaco = { KeyCode: { Escape: 9 }, editor: { EditorOption: { lineHeight: 'lineHeight' } } }
  setRect(previewDom, { left: 100, top: 40, bottom: 640, width: 500, height: 600 })
  setRect(iframe, { top: 40 })

  const editor = {
    focus: vi.fn(),
    getOption: vi.fn(() => 20),
    getScrollTop: vi.fn(() => 0),
    getTopForLineNumber: vi.fn((line: number) => line * 20),
    layout: vi.fn(),
    setPosition: vi.fn(),
    setScrollTop: vi.fn(),
    onDidScrollChange: vi.fn(),
    onKeyDown: vi.fn((fn: Function) => keyDownHandlers.push(fn)),
  }

  const ctx = {
    action: {
      registerAction: vi.fn((action: any) => actions.set(action.name, action)),
      getActionHandler: vi.fn((name: string) => actions.get(name).handler),
    },
    args: {
      FLAG_READONLY: false,
      MODE: 'normal',
    },
    editor: {
      getEditor: vi.fn(() => editor),
      getMonaco: vi.fn(() => monaco),
      highlightLine: vi.fn(),
      isDefault: vi.fn(() => true),
      whenEditorReady: vi.fn(() => Promise.resolve({ editor, monaco })),
    },
    i18n: { t: vi.fn((key: string, arg?: string) => arg ? `${key}:${arg}` : key) },
    keybinding: {
      Alt: 'Alt',
      getKeysLabel: vi.fn(() => 'Alt'),
    },
    layout: {
      emitResize: vi.fn(),
      getContainerDom: vi.fn((name: string) => name === 'editor' ? editorDom : previewDom),
    },
    lib: {
      vue: {
        watch: vi.fn(),
      },
    },
    registerHook: vi.fn((name: string, fn: Function) => {
      hooks.set(name, [...(hooks.get(name) || []), fn])
    }),
    storage: {
      get: vi.fn(() => 0),
      set: vi.fn(),
    },
    store: {
      state: {
        currentFile: { type: 'file', plain: true, writeable: true, name: 'note.md' },
        presentation: false,
        previewer: 'default',
        showEditor: false,
        showView: true,
      },
    },
    theme: {
      addStyles: vi.fn(() => Promise.resolve()),
    },
    view: {
      disableSyncScrollAwhile: vi.fn((fn: Function) => {
        fn()
        return Promise.resolve()
      }),
      getRenderIframe: vi.fn(() => Promise.resolve(iframe)),
    },
    actions,
    editorDom,
    hooks,
    keyDownHandlers,
    monaco,
    previewDom,
    editorInstance: editor,
  } as any

  actions.set('layout.toggle-editor', { handler: vi.fn() })

  return ctx
}

describe('floating-editor plugin', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn: FrameRequestCallback) => {
      fn(0)
      return 1
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('registers styles, actions, hooks, editor scroll listener, and capability watcher', async () => {
    const ctx = createCtx()

    floatingEditor.register(ctx)
    await Promise.resolve()

    expect(ctx.theme.addStyles).toHaveBeenCalledWith(expect.stringContaining('.floating-editor-active'))
    expect(ctx.action.registerAction.mock.calls.map(([action]: any[]) => action.name)).toEqual([
      'layout.show-floating-editor',
      'layout.hide-floating-editor',
    ])
    expect(ctx.registerHook.mock.calls.map(([name]: any[]) => name)).toEqual([
      'VIEW_ELEMENT_CLICK',
      'GLOBAL_RESIZE',
      'DOC_BEFORE_SWITCH',
      'VIEW_FILE_CHANGE',
    ])
    expect(ctx.editorInstance.onDidScrollChange).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx.editorInstance.onKeyDown).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx.lib.vue.watch).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { immediate: true })
  })

  test('show action floats editor, creates controls, highlights and focuses the source line', async () => {
    const ctx = createCtx()
    floatingEditor.register(ctx)

    await ctx.actions.get('layout.show-floating-editor').handler({ line: 5, lineEnd: 7, clientY: 120 })
    vi.runAllTimers()

    expect(ctx.editorDom.classList.contains('floating-editor-active')).toBe(true)
    expect(ctx.editorDom.style.left).toBe('124px')
    expect(ctx.editorDom.style.width).toBe('452px')
    expect(ctx.editorDom.querySelector('.floating-editor-title')?.textContent).toBe('note.md')
    expect(ctx.editor.highlightLine).toHaveBeenCalledWith([5, 6], false, 1000)
    expect(ctx.editorInstance.setPosition).toHaveBeenCalledWith({ lineNumber: 5, column: 1 })
    expect(ctx.editorInstance.setScrollTop).toHaveBeenCalledWith(40)
    expect(ctx.editorInstance.focus).toHaveBeenCalled()
  })

  test('hide action restores original editor style and emits resize', async () => {
    const ctx = createCtx()
    ctx.editorDom.setAttribute('style', 'color: red;')
    floatingEditor.register(ctx)

    await ctx.actions.get('layout.show-floating-editor').handler({ line: 1 })
    ctx.actions.get('layout.hide-floating-editor').handler()

    expect(ctx.editorDom.classList.contains('floating-editor-active')).toBe(false)
    expect(ctx.editorDom.getAttribute('style')).toBe('color: red;')
    expect(ctx.layout.emitResize).toHaveBeenCalled()
  })

  test('alt-click source line opens editor and normal click highlights visible line', async () => {
    const ctx = createCtx()
    floatingEditor.register(ctx)
    const source = document.createElement('p')
    source.setAttribute('data-source-line', '3')
    source.setAttribute('data-source-line-end', '4')
    document.body.appendChild(source)

    const altClick = new MouseEvent('click', { altKey: true, clientY: 160, bubbles: true })
    Object.defineProperty(altClick, 'target', { value: source })
    ctx.hooks.get('VIEW_ELEMENT_CLICK')[0]({ e: altClick })
    await Promise.resolve()

    expect(ctx.action.getActionHandler).toHaveBeenCalledWith('layout.show-floating-editor')
    expect(ctx.editorDom.classList.contains('floating-editor-active')).toBe(true)

    const normalClick = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(normalClick, 'target', { value: source })
    ctx.hooks.get('VIEW_ELEMENT_CLICK')[0]({ e: normalClick })

    expect(ctx.editor.highlightLine).toHaveBeenLastCalledWith([3, 3], true, 1000)
  })

  test('watcher shows a limited preview hint when floating editor is available', () => {
    const ctx = createCtx()
    floatingEditor.register(ctx)
    const canShow = ctx.lib.vue.watch.mock.calls[0][0]
    const onChange = ctx.lib.vue.watch.mock.calls[0][1]

    expect(canShow()).toBe(true)
    onChange(true)

    const hint = document.body.querySelector('.floating-editor-hint') as HTMLElement
    expect(hint.textContent).toBe('floating-editor.preview-hint:Alt')
    expect(ctx.storage.set).toHaveBeenCalledWith('plugin.floating-editor.preview-hint-count', 1)
  })

  test('titlebar and resize handles move, maximize, restore, and close the floating frame', async () => {
    const ctx = createCtx()
    floatingEditor.register(ctx)

    await ctx.actions.get('layout.show-floating-editor').handler({ line: 4, clientY: 120 })
    const titleBar = ctx.editorDom.querySelector('.floating-editor-titlebar') as HTMLElement
    const bottomResize = ctx.editorDom.querySelector('.floating-editor-resize-bottom') as HTMLElement
    const startTop = parseInt(ctx.editorDom.style.top)
    const startHeight = parseInt(ctx.editorDom.style.height)

    titleBar.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientY: 50, bubbles: true }))
    await Promise.resolve()
    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 150, bubbles: true }))
    expect(parseInt(ctx.editorDom.style.top)).toBeGreaterThan(startTop)
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(document.body.style.userSelect).toBe('')

    bottomResize.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientY: 150, bubbles: true }))
    await Promise.resolve()
    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 260, bubbles: true }))
    expect(parseInt(ctx.editorDom.style.height)).toBeGreaterThan(startHeight)
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    titleBar.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(ctx.editorDom.style.top).toBe('48px')
    expect(ctx.editorDom.style.height).toBe('584px')

    titleBar.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(ctx.editorDom.style.height).toBe('220px')

    const closeButton = ctx.editorDom.querySelectorAll('.floating-editor-button')[1] as HTMLElement
    closeButton.click()
    expect(ctx.editorDom.classList.contains('floating-editor-active')).toBe(false)
  })

  test('split button restores inline editor and reset hooks clear visible UI', async () => {
    const ctx = createCtx()
    floatingEditor.register(ctx)

    await ctx.actions.get('layout.show-floating-editor').handler({ line: 2 })
    const splitButton = ctx.editorDom.querySelector('.floating-editor-button') as HTMLElement
    splitButton.click()

    expect(ctx.editorDom.classList.contains('floating-editor-active')).toBe(false)
    expect(ctx.action.getActionHandler).toHaveBeenCalledWith('layout.toggle-editor')
    expect(ctx.actions.get('layout.toggle-editor').handler).toHaveBeenCalledWith(true)

    const canShow = ctx.lib.vue.watch.mock.calls[0][0]
    const onChange = ctx.lib.vue.watch.mock.calls[0][1]
    expect(canShow()).toBe(true)
    onChange(true)
    expect(document.body.querySelector('.floating-editor-hint')).toBeTruthy()

    ctx.hooks.get('DOC_BEFORE_SWITCH')[0]()
    expect(document.body.querySelector('.floating-editor-hint')).toBeNull()
  })

  test('escape closes floating editor from monaco keydown', async () => {
    const ctx = createCtx()
    floatingEditor.register(ctx)
    await Promise.resolve()
    const escEvent = {
      keyCode: ctx.monaco.KeyCode.Escape,
      browserEvent: { defaultPrevented: false, isComposing: false },
    }

    await ctx.actions.get('layout.show-floating-editor').handler({ line: 2 })
    ctx.keyDownHandlers[0](escEvent)
    expect(ctx.editorDom.classList.contains('floating-editor-active')).toBe(false)
  })

  test('escape stays in floating editor when a monaco escape widget is visible', async () => {
    const ctx = createCtx()
    floatingEditor.register(ctx)
    await Promise.resolve()
    const escEvent = {
      keyCode: ctx.monaco.KeyCode.Escape,
      browserEvent: { defaultPrevented: true, isComposing: false },
    }

    await ctx.actions.get('layout.show-floating-editor').handler({ line: 2 })
    const suggestWidget = document.createElement('div')
    suggestWidget.className = 'suggest-widget'
    setRect(suggestWidget, { width: 120, height: 80 })
    ctx.editorDom.appendChild(suggestWidget)
    ctx.keyDownHandlers[0](escEvent)
    expect(ctx.editorDom.classList.contains('floating-editor-active')).toBe(true)

    setRect(suggestWidget, { width: 0, height: 0 })
    ctx.keyDownHandlers[0](escEvent)
    expect(ctx.editorDom.classList.contains('floating-editor-active')).toBe(false)
  })

  test('preview click ignores form controls, text selections, presentation mode, and invalid source lines', () => {
    const ctx = createCtx()
    floatingEditor.register(ctx)
    const hook = ctx.hooks.get('VIEW_ELEMENT_CLICK')[0]
    const button = document.createElement('button')
    const text = document.createElement('span')
    text.setAttribute('data-source-line', '9')
    text.setAttribute('data-source-line-end', '11')
    document.body.append(button, text)

    const emptyClick = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(emptyClick, 'target', { value: document.body })
    hook({ e: emptyClick })
    expect(ctx.editor.highlightLine).not.toHaveBeenCalled()

    const buttonClick = new MouseEvent('click', { altKey: true, bubbles: true })
    Object.defineProperty(buttonClick, 'target', { value: button })
    hook({ e: buttonClick })
    expect(ctx.editorDom.classList.contains('floating-editor-active')).toBe(false)

    const selectionClick = new MouseEvent('click', { altKey: true, bubbles: true })
    Object.defineProperty(selectionClick, 'target', { value: text })
    vi.spyOn(text.ownerDocument.defaultView!.getSelection()!, 'toString').mockReturnValue('selected')
    hook({ e: selectionClick })
    expect(ctx.editorDom.classList.contains('floating-editor-active')).toBe(false)

    ctx.store.state.presentation = true
    const normalClick = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(normalClick, 'target', { value: text })
    hook({ e: normalClick })
    expect(ctx.editor.highlightLine).not.toHaveBeenCalled()
  })
})
