import { describe, expect, it, vi } from 'vitest'

function makeMarkdown () {
  const md = {
    renderer: {
      rules: {
        paragraph_open: vi.fn(() => 'paragraph'),
        fence: vi.fn(() => ({ children: [] })),
        code_inline: vi.fn(() => 'inline'),
      },
    },
    use: vi.fn((plugin: any) => plugin(md)),
  }
  return md
}

function vnodeText (node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(vnodeText).join('')
  return vnodeText(node.children)
}

describe('small zero-coverage plugins', () => {
  it('copies headings, explicit text and inner text from preview clicks', async () => {
    const copyText = vi.fn()
    vi.doMock('@fe/utils', () => ({
      copyText,
      encodeMarkdownLink: (value: string) => `encoded(${value})`,
    }))
    vi.doMock('@fe/core/keybinding', () => ({ hasCtrlCmd: (event: any) => !!event.ctrlKey }))
    vi.doMock('@fe/support/store', () => ({ default: { state: { currentFile: { path: 'docs/a b.md' } } } }))

    const { default: plugin } = await import('../copy-text')
    const hooks = new Map<string, Function>()
    plugin.register({ registerHook: (name: string, fn: Function) => hooks.set(name, fn) } as any)
    const handler = hooks.get('VIEW_ELEMENT_CLICK')!

    const heading = document.createElement('h2')
    heading.id = 'A B'
    const headingEvent = { target: heading, ctrlKey: true, preventDefault: vi.fn(), stopPropagation: vi.fn() }
    await expect(handler({ e: headingEvent })).resolves.toBe(true)
    expect(copyText).toHaveBeenCalledWith('encoded(/docs/a b.md)#encoded(A B)')

    const explicit = document.createElement('button')
    explicit.className = 'copy-text'
    explicit.dataset.text = 'copy me'
    const explicitEvent = { target: explicit, preventDefault: vi.fn(), stopPropagation: vi.fn() }
    await expect(handler({ e: explicitEvent })).resolves.toBe(true)
    expect(copyText).toHaveBeenCalledWith('copy me')

    const inner = document.createElement('span')
    inner.className = 'copy-inner-text'
    Object.defineProperty(inner, 'innerText', { value: 'inner text' })
    const innerEvent = { target: inner, ctrlKey: true, preventDefault: vi.fn(), stopPropagation: vi.fn() }
    await expect(handler({ e: innerEvent })).resolves.toBe(true)
    expect(copyText).toHaveBeenCalledWith('inner text')
  })

  it('marks single-image paragraphs in misc markdown plugin', async () => {
    const { default: plugin } = await import('../misc')
    const md = makeMarkdown()
    plugin.register({
      args: { DOM_ATTR_NAME: { ONLY_CHILD: 'data-only-child' } },
      markdown: { registerPlugin: (fn: Function) => fn(md) },
    } as any)

    const image = { type: 'image', attrSet: vi.fn() }
    const tokens = [
      {},
      { type: 'inline', children: [image] },
      { type: 'paragraph_close' },
    ]

    expect(md.renderer.rules.paragraph_open(tokens, 0, {}, {}, { renderToken: () => 'token' })).toBe('token')
    expect(image.attrSet).toHaveBeenCalledWith('data-only-child', 'true')

    const media = { type: 'media', attrSet: vi.fn() }
    md.renderer.rules.paragraph_open([
      {},
      { type: 'inline', children: [media] },
      { type: 'paragraph_close' },
    ], 0, {}, {}, { renderToken: () => 'token' })
    expect(media.attrSet).toHaveBeenCalledWith('data-only-child', 'true')

    const text = { type: 'text', attrSet: vi.fn() }
    md.renderer.rules.paragraph_open([
      {},
      { type: 'inline', children: [text, { type: 'image' }] },
      { type: 'paragraph_close' },
    ], 0, {}, {}, { renderToken: () => 'token' })
    expect(text.attrSet).not.toHaveBeenCalled()
  })

  it('adds code copy wrappers and inline copy titles', async () => {
    const { default: plugin } = await import('../markdown-code-copy')
    const md = makeMarkdown()
    const addStyles = vi.fn()
    plugin.register({
      args: { DOM_CLASS_NAME: { COPY_INNER_TEXT: 'copy-inner-text' } },
      i18n: { t: (key: string) => key },
      keybinding: { getKeyLabel: () => 'Ctrl' },
      markdown: { registerPlugin: (fn: Function) => fn(md) },
      view: { addStyles },
    } as any)

    const inlineToken = {
      attrIndex: vi.fn(() => -1),
      attrJoin: vi.fn(),
      attrPush: vi.fn(),
    }
    expect(md.renderer.rules.code_inline([inlineToken], 0, {}, {}, {})).toBe('inline')
    expect(inlineToken.attrJoin).toHaveBeenCalledWith('class', 'copy-inner-text')
    expect(inlineToken.attrPush).toHaveBeenCalledWith(['title', 'Ctrl + click-to-copy'])

    const fenceToken = { content: 'console.log(1)\n', info: 'js' }
    const vnode: any = md.renderer.rules.fence([fenceToken], 0, {}, {}, {})
    expect(vnode.children[0].props.class).toBe('p-mcc-copy-btn-wrapper skip-print')
    expect(vnode.children[0].children[1].props['data-text']).toBe('console.log(1)')
    expect(addStyles).toHaveBeenCalledWith(expect.stringContaining('p-mcc-copy-btn'), true)

    const titledInline = {
      attrIndex: vi.fn(() => 0),
      attrJoin: vi.fn(),
      attrPush: vi.fn(),
    }
    expect(md.renderer.rules.code_inline([titledInline], 0, {}, {}, {})).toBe('inline')
    expect(titledInline.attrJoin).not.toHaveBeenCalled()

    const emptyFence: any = md.renderer.rules.fence([{ content: '   ', info: '' }], 0, {}, {}, {})
    expect(emptyFence.children).toEqual([])

    md.renderer.rules.fence = vi.fn(() => 'plain')
    plugin.register({
      args: { DOM_CLASS_NAME: { COPY_INNER_TEXT: 'copy-inner-text' } },
      i18n: { t: (key: string) => key },
      keybinding: { getKeyLabel: () => 'Ctrl' },
      markdown: { registerPlugin: (fn: Function) => fn(md) },
      view: { addStyles },
    } as any)
    expect(md.renderer.rules.fence([{ content: 'x', info: '' }], 0, {}, {}, {})).toBe('plain')
  })

  it('wraps code fences when front matter enables wrapCode', async () => {
    const { default: plugin } = await import('../markdown-code-wrap')
    const md = makeMarkdown()
    plugin.register({
      args: { DOM_CLASS_NAME: { WRAP_CODE: 'wrap-code', AVOID_PAGE_BREAK: 'avoid-page-break' } },
      markdown: { registerPlugin: (fn: Function) => fn(md) },
      view: { addStyles: vi.fn() },
    } as any)

    const token = { attrJoin: vi.fn() }
    md.renderer.rules.fence([token], 0, {}, { attributes: { wrapCode: true } }, {})
    expect(token.attrJoin).toHaveBeenCalledWith('class', 'wrap-code')
  })

  it('registers mermaid and echarts extension fallback fences and completions', async () => {
    let initialized = true
    const statuses = new Map<string, any>()
    vi.doMock('@fe/others/extension', () => ({
      getInitialized: () => initialized,
      getLoadStatus: (id: string) => statuses.get(id) || {},
    }))
    vi.doMock('@fe/services/i18n', () => ({ t: (_key: string, name: string) => `install ${name}` }))

    const mermaid = (await import('../markdown-mermaid')).default
    const echarts = (await import('../markdown-echarts')).default
    const md = makeMarkdown()
    const items: any[] = []
    const ctx = {
      editor: { tapSimpleCompletionItems: (fn: Function) => fn(items) },
      markdown: { registerPlugin: (fn: Function) => fn(md) },
    } as any

    mermaid.register(ctx)
    const mermaidResult: any = md.renderer.rules.fence([{ info: 'mermaid', content: 'graph LR' }], 0, {}, {}, {})
    expect(vnodeText(mermaidResult)).toBe('install Mermaid')

    statuses.set('@yank-note/extension-mermaid', { version: '1.0.0' })
    expect(md.renderer.rules.fence([{ info: 'mermaid', content: 'graph LR' }], 0, {}, {}, {})).toEqual({ children: [] })

    echarts.register(ctx)
    statuses.delete('@yank-note/extension-echarts')
    const echartsResult: any = md.renderer.rules.fence([{ info: 'js', content: '// --echarts--\nchart.setOption({})' }], 0, {}, { safeMode: false }, {})
    expect(vnodeText(echartsResult)).toBe('install ECharts')

    initialized = false
    expect(md.renderer.rules.fence([{ info: 'js', content: '// --echarts--' }], 0, {}, { safeMode: false }, {})).toBeNull()
    expect(items.map(item => item.label)).toEqual(['/ ``` Mermaid', '/ ``` ECharts'])
  })

  it('registers built-in renderers and rerenders html docs after save', async () => {
    const { h } = await import('vue')
    const { default: plugin } = await import('../build-in-renderers')
    const renderers: any[] = []
    const hooks = new Map<string, Function>()
    const render = vi.fn()
    plugin.register({
      args: { CSS_VAR_NAME: { PREVIEWER_HEIGHT: '--previewer-height' } },
      base: { getAttachmentURL: () => 'yn://attachment' },
      doc: { isMarkdownFile: (file: any) => file.path.endsWith('.md') },
      embed: { IFrame: { name: 'IFrame' } },
      lib: { vue: { h } },
      markdown: { markdown: { render: vi.fn(() => 'markdown') } },
      registerHook: (name: string, fn: Function) => hooks.set(name, fn),
      renderer: { registerRenderer: (renderer: any) => renderers.push(renderer) },
      view: { render },
    } as any)

    expect(renderers).toHaveLength(4)
    expect(renderers[0].when({ file: { path: 'a.txt' } })).toBe(true)
    expect(renderers[1].render('# hi', { file: { path: 'a.md' } })).toBe('markdown')
    expect(renderers[2].when({ file: { path: 'a.txt' } })).toBe(true)
    expect(renderers[3].when({ file: { type: 'file', path: 'a.html' }, safeMode: false })).toBe(true)

    hooks.get('DOC_SAVED')!({ doc: { type: 'file', path: 'a.html' } })
    expect(render).toHaveBeenCalledTimes(1)
  })

  it('registers electron zoom actions and status menu only in electron', async () => {
    const { default: plugin } = await import('../electron-zoom')
    const actions: any[] = []
    const hooks = new Map<string, Function>()
    const menuTappers: Function[] = []
    const webContents = {
      factor: 1,
      getZoomFactor: vi.fn(function (this: any) { return this.factor }),
      setZoomFactor: vi.fn(function (this: any, factor: number) { this.factor = factor }),
    }
    const ctx = {
      action: {
        registerAction: (action: any) => actions.push(action),
        getActionHandler: (name: string) => actions.find(action => action.name === name).handler,
      },
      env: { isElectron: true, getElectronRemote: () => ({ getCurrentWebContents: () => webContents }) },
      i18n: { t: (key: string) => key },
      keybinding: { CtrlCmd: 'CtrlCmd', getKeysLabel: (id: string) => id },
      registerHook: (name: string, fn: Function) => hooks.set(name, fn),
      statusBar: { refreshMenu: vi.fn(), tapMenus: (fn: Function) => menuTappers.push(fn) },
    }

    plugin.register(ctx as any)
    hooks.get('STARTUP')!()
    expect(actions.map(action => action.name)).toEqual([
      'plugin.electron-zoom.zoom-in',
      'plugin.electron-zoom.zoom-out',
      'plugin.electron-zoom.zoom-reset',
    ])

    actions[0].handler()
    expect(webContents.setZoomFactor).toHaveBeenCalledWith(1.1)
    actions[1].handler()
    actions[2].handler()
    expect(webContents.setZoomFactor).toHaveBeenLastCalledWith(1)

    const menus = { 'status-bar-view': { list: [] as any[] } }
    menuTappers[0](menus)
    expect(menus['status-bar-view'].list.map((item: any) => item.id).filter(Boolean)).toEqual(actions.map(action => action.name))
  })
})
