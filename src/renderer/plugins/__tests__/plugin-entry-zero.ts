import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../markdown-front-matter/worker-indexer?worker&url', () => ({ default: '/front-matter-worker.js' }))
vi.mock('../markdown-hashtags/worker-indexer?worker&url', () => ({ default: '/hashtags-worker.js' }))
vi.mock('../markdown-wiki-links/worker-indexer?worker&url', () => ({ default: '/wiki-links-worker.js' }))

function makeHookCtx () {
  const hooks = new Map<string, Function[]>()
  return {
    hooks,
    registerHook: vi.fn((name: string, fn: Function) => {
      hooks.set(name, [...(hooks.get(name) || []), fn])
    }),
  }
}

function makeMarkdown () {
  const md: any = {
    options: { html: true },
    render: vi.fn(function (this: any) {
      return this.options.linkify ? 'linkified' : 'plain'
    }),
    block: {
      ruler: {
        __rules__: [{ name: 'paragraph' }],
        before: vi.fn(),
      },
    },
    inline: {
      ruler: {
        push: vi.fn(),
        after: vi.fn(),
      },
    },
    renderer: {
      rules: {},
    },
  }
  return md
}

describe('zero coverage plugin entries', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('build-in-renderers handles markdown, plain text, html, and saved html refresh branches', async () => {
    const { default: plugin } = await import('../build-in-renderers')
    const renderers: any[] = []
    const base = makeHookCtx()
    const ctx = {
      ...base,
      args: { CSS_VAR_NAME: { PREVIEWER_HEIGHT: '--preview-height' } },
      base: { getAttachmentURL: vi.fn(() => '/attachment/page.html') },
      doc: { isMarkdownFile: vi.fn((file: any) => file.path.endsWith('.md')) },
      embed: { IFrame: { name: 'IFrame' } },
      lib: { vue: { h: vi.fn((tag: any, props?: any, children?: any) => ({ tag, props, children })) } },
      markdown: { markdown: { render: vi.fn(() => '<p>md</p>') } },
      renderer: { registerRenderer: vi.fn((renderer: any) => renderers.push(renderer)) },
      view: { render: vi.fn() },
    } as any

    plugin.register(ctx)

    const notMarkdown = renderers.find(renderer => renderer.name === 'not-markdown-file')
    const markdown = renderers.find(renderer => renderer.name === 'markdown')
    const plainText = renderers.find(renderer => renderer.name === 'plain-text')
    const html = renderers.find(renderer => renderer.name === 'html')

    expect(notMarkdown.when({ file: undefined })).toBe(true)
    expect(notMarkdown.when({ file: { path: '/note.md' } })).toBe(false)
    expect(notMarkdown.render('', { file: undefined })[0].children).toBeUndefined()
    expect(notMarkdown.render('', { file: { name: 'data.csv' } })[1].props[0].props).toBe('Not a markdown file.')

    expect(markdown.when({ file: { path: '/note.md' } })).toBe(true)
    expect(markdown.when({ file: null })).toBe(false)
    expect(markdown.render('# hi', { file: { path: '/note.md' } })).toBe('<p>md</p>')

    expect(plainText.when({ file: { path: '/README.TXT' } })).toBe(true)
    expect(plainText.when({ file: null })).toBe(false)
    expect(plainText.render('plain').children).toBe('plain')

    expect(html.when({ file: { type: 'file', path: '/page.html' }, safeMode: false })).toBe(true)
    expect(html.when({ file: { type: 'file', path: '/page.html' }, safeMode: true })).toBe(false)
    expect(html.when({ file: { type: 'file', path: '/page.txt' }, safeMode: false })).toBe(false)
    expect(html.render('<main />', { file: { type: 'file', path: '/page.html' } }).props.html).toContain('/attachment/page.html?_t=0')
    expect(html.render('<main />', { file: undefined }).props.html).toBe('<main />')

    base.hooks.get('DOC_SAVED')![0]({ doc: { type: 'file', path: '/note.md' } })
    expect(ctx.view.render).not.toHaveBeenCalled()
    const now = vi.spyOn(Date, 'now').mockReturnValue(1234)
    base.hooks.get('DOC_SAVED')![0]({ doc: { type: 'file', path: '/page.html' } })
    expect(ctx.view.render).toHaveBeenCalledTimes(1)
    expect(html.render('<main />', { file: { type: 'file', path: '/page.html' } }).props.html).toContain('/attachment/page.html?_t=1234')
    now.mockRestore()
  })

  it('sync-scroll registers editor scroll, model, and preview click sync hooks', async () => {
    vi.useFakeTimers()
    const { default: plugin } = await import('../sync-scroll')
    const base = makeHookCtx()
    let scrollHandler: Function = () => undefined
    let modelHandler: Function = () => undefined
    const editor = {
      getVisibleRanges: vi.fn(() => [{ startLineNumber: 8 }]),
      onDidScrollChange: vi.fn((fn: Function) => { scrollHandler = fn }),
      onDidChangeModel: vi.fn((fn: Function) => { modelHandler = fn }),
    }
    const ctx = {
      ...base,
      editor: {
        getEditor: vi.fn(() => editor),
        highlightLine: vi.fn(),
        whenEditorReady: vi.fn(async () => ({ editor })),
      },
      store: { state: { showEditor: true, presentation: false } },
      view: {
        disableSyncScrollAwhile: vi.fn((fn: Function) => fn()),
        getEnableSyncScroll: vi.fn(() => true),
        revealLine: vi.fn(),
      },
    } as any

    plugin.register(ctx)
    await Promise.resolve()

    scrollHandler()
    expect(ctx.view.revealLine).toHaveBeenCalledWith(7)

    ctx.view.getEnableSyncScroll.mockReturnValue(false)
    scrollHandler()
    expect(ctx.view.revealLine).toHaveBeenCalledTimes(1)

    editor.getVisibleRanges.mockReturnValue([])
    scrollHandler()
    expect(ctx.view.revealLine).toHaveBeenCalledTimes(1)

    modelHandler()
    expect(ctx.registerHook).toHaveBeenCalledWith('VIEW_RENDERED', expect.any(Function), true)

    const target = document.createElement('p')
    target.dataset.sourceLine = '3'
    target.dataset.sourceLineEnd = '6'
    const clickHook = base.hooks.get('VIEW_ELEMENT_CLICK')![0]
    clickHook({ e: { target } })
    vi.advanceTimersByTime(200)
    expect(ctx.editor.highlightLine).toHaveBeenCalledWith([3, 5], true, 1000)

    const button = document.createElement('button')
    button.dataset.sourceLine = '9'
    clickHook({ e: { target: button } })
    vi.advanceTimersByTime(200)
    expect(ctx.editor.highlightLine).toHaveBeenCalledTimes(1)

    const selectionSpy = vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'selected' } as any)
    clickHook({ e: { target } })
    vi.advanceTimersByTime(200)
    expect(ctx.editor.highlightLine).toHaveBeenCalledTimes(1)
    selectionSpy.mockRestore()

    clickHook({ e: { target } })
    clickHook({ e: { target } })
    vi.advanceTimersByTime(200)
    expect(ctx.editor.highlightLine).toHaveBeenCalledTimes(1)

    target.dataset.sourceLineEnd = ''
    clickHook({ e: { target } })
    vi.advanceTimersByTime(200)
    expect(ctx.editor.highlightLine).toHaveBeenLastCalledWith(3, true, 1000)
  })

  it('text-comparator registers its custom editor, action, and status menu item', async () => {
    const { default: plugin } = await import('../text-comparator')
    let resolveExtension = () => undefined
    const extensionReady = new Promise<void>(resolve => { resolveExtension = resolve })
    const actions: any[] = []
    const customEditors: any[] = []
    const menuTappers: Function[] = []
    const currentFile = { type: 'file', plain: true, repo: 'repo', path: '/a.md' }
    const ctx = {
      action: {
        getActionHandler: vi.fn((name: string) => actions.find(action => action.name === name).handler),
        registerAction: vi.fn((action: any) => actions.push(action)),
      },
      doc: {
        cloneDoc: vi.fn((doc: any) => ({ ...doc, cloned: true })),
        switchDoc: vi.fn(),
      },
      editor: {
        registerCustomEditor: vi.fn((editor: any) => customEditors.push(editor)),
      },
      getExtensionInitialized: vi.fn(() => false),
      i18n: { t: vi.fn((key: string, value?: string) => value ? `${key}:${value}` : key) },
      keybinding: { getKeysLabel: vi.fn((name: string) => `<${name}>`) },
      lib: {
        vue: {
          defineComponent: vi.fn((component: any) => component),
          h: vi.fn((tag: string, props: any, children: any) => ({ tag, props, children })),
          ref: vi.fn((value: any) => ({ value })),
        },
      },
      repo: { isNormalRepo: vi.fn(() => true) },
      showExtensionManager: vi.fn(),
      statusBar: { tapMenus: vi.fn((fn: Function) => menuTappers.push(fn)) },
      store: { state: { currentFile } },
      whenExtensionInitialized: vi.fn(() => extensionReady),
    } as any

    plugin.register(ctx)

    expect(customEditors[0].when({ doc: { type: '__comparator' } })).toBe(true)
    const render = customEditors[0].component.setup()
    expect(render()).toBeNull()
    resolveExtension()
    await extensionReady
    const vnode = render()
    vnode.children[0].props.onClick()
    expect(ctx.showExtensionManager).toHaveBeenCalledWith('@yank-note/extension-text-comparator')

    actions[0].handler(undefined, { type: 'file', plain: true, repo: 'repo', path: '/b.md' })
    expect(ctx.doc.switchDoc).toHaveBeenCalledWith(expect.objectContaining({
      type: '__comparator',
      extra: {
        original: { ...currentFile, cloned: true },
        modified: { type: 'file', plain: true, repo: 'repo', path: '/b.md', cloned: true },
      },
    }))

    expect(() => actions[0].handler({ type: 'file', plain: false })).toThrow('Original doc is not a text file')
    expect(() => actions[0].handler(null, { type: 'file', plain: false })).toThrow('Modified doc is not a text file')

    const menus = { 'status-bar-tool': { list: [] as any[] } }
    menuTappers[0](menus)
    menus['status-bar-tool'].list[0].onClick()
    expect(ctx.action.getActionHandler).toHaveBeenCalledWith('plugin.text-comparator.open-text-comparator')

    const initializedCtx = {
      ...ctx,
      action: { registerAction: vi.fn((action: any) => actions.push(action)) },
      editor: { registerCustomEditor: vi.fn((editor: any) => customEditors.push(editor)) },
      getExtensionInitialized: vi.fn(() => true),
      statusBar: { tapMenus: vi.fn((fn: Function) => fn({})) },
      store: { state: { currentFile: null } },
      whenExtensionInitialized: vi.fn(),
    } as any
    plugin.register(initializedCtx)
    const initializedRender = customEditors.at(-1).component.setup()
    expect(initializedRender().tag).toBe('div')
    actions.at(-1).handler()
    expect(ctx.doc.switchDoc).toHaveBeenLastCalledWith(expect.objectContaining({ extra: null }))
    expect(initializedCtx.whenExtensionInitialized).not.toHaveBeenCalled()
  })

  it('record-recent-document records saved markdown files only in electron', async () => {
    vi.useFakeTimers()
    const { default: plugin } = await import('../record-recent-document')
    const nonElectron = makeHookCtx()
    plugin.register({ ...nonElectron, env: { isElectron: false } } as any)
    expect(nonElectron.registerHook).not.toHaveBeenCalled()

    const electron = makeHookCtx()
    const addRecentDocument = vi.fn()
    plugin.register({
      ...electron,
      doc: { isMarkdownFile: vi.fn((doc: any) => doc.path.endsWith('.md')) },
      env: {
        getElectronRemote: vi.fn(() => ({ app: { addRecentDocument } })),
        isElectron: true,
        isWindows: true,
      },
    } as any)

    const hook = electron.hooks.get('DOC_SAVED')![0]
    hook({ doc: { path: 'a.txt', absolutePath: '/repo/a.txt' } })
    hook({ doc: { path: 'missing.md' } })
    hook({ doc: { path: 'a.md', absolutePath: '/repo/a.md' } })
    vi.runAllTimers()
    expect(addRecentDocument).toHaveBeenCalledWith('\\repo\\a.md')
    expect(addRecentDocument).toHaveBeenCalledTimes(1)
  })

  it('code-syntax-highlight-font loads fonts when supported and skips old Windows builds', async () => {
    const { default: plugin } = await import('../code-syntax-highlight-font')
    const supported = makeHookCtx()
    const addStyles = vi.fn()
    plugin.register({
      ...supported,
      args: { DOM_CLASS_NAME: { CODE_SYNTAX_HIGHLIGHT_FONT: 'syntax-font' } },
      env: { isWindows: false },
      theme: { addStyles },
    } as any)
    supported.hooks.get('STARTUP')![0]()
    expect(addStyles.mock.calls[0][0]).toContain('.syntax-font')

    const oldWindows = makeHookCtx()
    const oldStyles = vi.fn()
    plugin.register({
      ...oldWindows,
      args: { DOM_CLASS_NAME: { CODE_SYNTAX_HIGHLIGHT_FONT: 'syntax-font' } },
      env: { isWindows: true, nodeRequire: vi.fn(() => ({ release: () => '10.0.19045' })) },
      theme: { addStyles: oldStyles },
    } as any)
    oldWindows.hooks.get('STARTUP')![0]()
    expect(oldStyles).not.toHaveBeenCalled()

    const noNodeRequire = makeHookCtx()
    plugin.register({
      ...noNodeRequire,
      args: { DOM_CLASS_NAME: { CODE_SYNTAX_HIGHLIGHT_FONT: 'syntax-font' } },
      env: { isWindows: true },
      theme: { addStyles: vi.fn() },
    } as any)
    noNodeRequire.hooks.get('STARTUP')![0]()
    expect(noNodeRequire.registerHook).toHaveBeenCalledWith('STARTUP', expect.any(Function))

    const throwingRequire = makeHookCtx()
    const throwingStyles = vi.fn()
    plugin.register({
      ...throwingRequire,
      args: { DOM_CLASS_NAME: { CODE_SYNTAX_HIGHLIGHT_FONT: 'syntax-font' } },
      env: { isWindows: true, nodeRequire: vi.fn(() => { throw new Error('no os') }) },
      theme: { addStyles: throwingStyles },
    } as any)
    throwingRequire.hooks.get('STARTUP')![0]()
    expect(throwingStyles).not.toHaveBeenCalled()
  })

  it('markdown-front-matter registers render wrapper, completion, rule, and indexer worker', async () => {
    const { default: plugin } = await import('../markdown-front-matter')
    const md = makeMarkdown()
    const completions: any[] = []
    const ctx = {
      editor: { tapSimpleCompletionItems: vi.fn((fn: Function) => fn(completions)) },
      indexer: { importScriptsToWorker: vi.fn() },
      markdown: { registerPlugin: vi.fn((fn: Function) => fn(md)) },
      utils: { getLogger: vi.fn(() => ({ debug: vi.fn() })) },
    } as any

    plugin.register(ctx)
    const env: any = {}
    expect(md.render('---\nmdOptions:\n  linkify: true\n---\nbody', env)).toBe('linkified')
    expect(md.options).toEqual({ html: true })
    expect(env.attributes.mdOptions).toEqual({ linkify: true })
    expect(completions[0].label).toBe('/ --- Front Matter')
    expect(md.block.ruler.before).toHaveBeenCalledWith('paragraph', 'front-matter', expect.any(Function))
    expect(ctx.indexer.importScriptsToWorker).toHaveBeenCalledWith(expect.any(URL))
  })

  it('markdown-hashtags registers renderer, syntax, settings, click action, and worker import', async () => {
    const { default: plugin } = await import('../markdown-hashtags')
    const base = makeHookCtx()
    const md = makeMarkdown()
    const root: any[] = []
    const quickOpen = vi.fn()
    const ctx = {
      ...base,
      action: { getActionHandler: vi.fn(() => quickOpen) },
      args: { DOM_ATTR_NAME: { DATA_HASHTAG: 'data-hashtag' }, DOM_CLASS_NAME: { HASH_TAG: 'hash-tag' } },
      editor: { tapMarkdownMonarchLanguage: vi.fn((fn: Function) => fn({ tokenizer: { root } })) },
      indexer: { importScriptsToWorker: vi.fn(), rebuildCurrentRepo: vi.fn() },
      lib: { vue: { h: vi.fn((tag: string, props: any, children: any) => ({ tag, props, children })) } },
      markdown: { registerPlugin: vi.fn((fn: Function) => fn(md)) },
      view: { addStyles: vi.fn() },
    } as any

    plugin.register(ctx)
    expect(md.inline.ruler.push).toHaveBeenCalledWith('hash-tags', expect.any(Function))
    expect(md.renderer.rules.hash_tag([{ content: '#tag' }], 0).props['data-hashtag']).toBe('#tag')
    expect(root).toHaveLength(2)
    base.hooks.get('SETTING_CHANGED')![0]({ changedKeys: ['render.md-hash-tags'] })
    expect(ctx.indexer.rebuildCurrentRepo).toHaveBeenCalled()
    base.hooks.get('SETTING_CHANGED')![0]({ changedKeys: ['other'] })
    expect(ctx.indexer.rebuildCurrentRepo).toHaveBeenCalledTimes(1)

    const span = document.createElement('span')
    span.className = 'hash-tag'
    span.setAttribute('data-hashtag', '#tag')
    base.hooks.get('VIEW_ELEMENT_CLICK')![0]({ e: { target: span } })
    expect(quickOpen).toHaveBeenCalledWith({ query: '#tag ', tab: 'file' })
    span.removeAttribute('data-hashtag')
    base.hooks.get('VIEW_ELEMENT_CLICK')![0]({ e: { target: span } })
    expect(quickOpen).toHaveBeenCalledTimes(1)
    expect(ctx.indexer.importScriptsToWorker).toHaveBeenCalledWith(expect.any(URL))
  })

  it('markdown-wiki-links registers markdown rule, completion, setting hook, and bracket conversion', async () => {
    const { default: plugin } = await import('../markdown-wiki-links')
    const base = makeHookCtx()
    const md = makeMarkdown()
    const completions: any[] = []
    let cursorHandler: Function = () => undefined
    const editor = {
      executeEdits: vi.fn(),
      getModel: vi.fn(() => ({ getValueInRange: vi.fn().mockReturnValueOnce('【【').mockReturnValueOnce('】】') })),
      onDidChangeCursorPosition: vi.fn((fn: Function) => { cursorHandler = fn }),
      pushUndoStop: vi.fn(),
      trigger: vi.fn(),
    }
    const ctx = {
      ...base,
      editor: {
        tapSimpleCompletionItems: vi.fn((fn: Function) => fn(completions)),
        whenEditorReady: vi.fn(async () => ({
          editor,
          monaco: { Selection: class Selection { constructor (...args: any[]) { return { args } } } },
        })),
      },
      indexer: { importScriptsToWorker: vi.fn(), rebuildCurrentRepo: vi.fn() },
      markdown: { registerPlugin: vi.fn((fn: Function) => fn(md)) },
      utils: { sleep: vi.fn(async () => undefined) },
    } as any

    const exposed = plugin.register(ctx)
    await Promise.resolve()
    expect(exposed).toEqual({ mdRuleWikiLinks: expect.any(Function) })
    expect(md.inline.ruler.after).toHaveBeenCalledWith('link', 'wiki-links', expect.any(Function))
    expect(completions[0].insertText).toBe('[[$1]]')
    base.hooks.get('SETTING_CHANGED')![0]({ changedKeys: ['render.md-wiki-links'] })
    expect(ctx.indexer.rebuildCurrentRepo).toHaveBeenCalled()
    base.hooks.get('SETTING_CHANGED')![0]({ changedKeys: ['other'] })
    expect(ctx.indexer.rebuildCurrentRepo).toHaveBeenCalledTimes(1)

    await cursorHandler({ source: 'keyboard', reason: 0, position: { lineNumber: 2, column: 4 } })
    expect(editor.executeEdits).toHaveBeenCalledWith('wiki-links', [expect.objectContaining({ text: '[[]]' })], [expect.any(Object)])
    expect(editor.trigger).toHaveBeenCalledWith('wiki-links', 'editor.action.triggerSuggest', {})
    await cursorHandler({ source: 'mouse', reason: 0, position: { lineNumber: 2, column: 4 } })
    expect(editor.executeEdits).toHaveBeenCalledTimes(1)
    expect(ctx.indexer.importScriptsToWorker).toHaveBeenCalledWith(expect.any(URL))
  })
})
