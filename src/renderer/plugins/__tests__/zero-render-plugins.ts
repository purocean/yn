import { afterEach, describe, expect, it, vi } from 'vitest'

const githubAlertMocks = vi.hoisted(() => ({
  plugin: vi.fn(),
}))

vi.mock('markdown-it-github-alerts', () => ({
  default: githubAlertMocks.plugin,
}))

vi.mock('markdown-it-github-alerts/styles/github-base.css?inline', () => ({
  default: '.base{}',
}))

vi.mock('markdown-it-github-alerts/styles/github-colors-light.css?inline', () => ({
  default: '.light{}',
}))

vi.mock('markdown-it-github-alerts/styles/github-colors-dark-class.css?inline', () => ({
  default: '.dark{--alert: dark;}',
}))

function makeMarkdown () {
  const md = {
    renderer: {
      rules: {
        fence: vi.fn(() => ({ type: 'fence-fallback', children: [] })),
        link_open: vi.fn(() => 'link-fallback'),
        list_item_open: vi.fn(() => ({ type: 'li', children: [] })),
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

function linkToken (attrs: Record<string, string | null>) {
  return {
    attrGet: vi.fn((name: string) => attrs[name] ?? null),
  }
}

describe('zero render plugins', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('registers drawio fallback link and fence renderers plus completion item', async () => {
    let initialized = true
    const statuses = new Map<string, any>()
    vi.doMock('@fe/others/extension', () => ({
      getInitialized: () => initialized,
      getLoadStatus: (id: string) => statuses.get(id) || {},
    }))
    vi.doMock('@fe/services/i18n', () => ({ t: (_key: string, name: string) => `install ${name}` }))

    const { default: plugin } = await import('../markdown-drawio')
    const md = makeMarkdown()
    const items: any[] = []
    plugin.register({
      editor: { tapSimpleCompletionItems: (fn: Function) => fn(items) },
      markdown: { registerPlugin: (fn: Function) => fn(md) },
    } as any)

    expect(items.map(item => item.label)).toEqual(['/ []() Drawio Link'])
    expect(md.renderer.rules.link_open([linkToken({ 'link-type': 'other' })], 0, {}, {}, {})).toBe('link-fallback')

    const nextToken = { type: 'text', content: 'Drawio' }
    const linkResult: any = md.renderer.rules.link_open([linkToken({ 'link-type': 'drawio' }), nextToken], 0, {}, {}, {})
    expect(nextToken.content).toBe('')
    expect(vnodeText(linkResult)).toBe('install Drawio')

    const fenceResult: any = md.renderer.rules.fence([{ info: 'xml', content: '<!-- --drawio-- -->\n<mxfile />' }], 0, {}, {}, {})
    expect(vnodeText(fenceResult)).toBe('install Drawio')
    expect(md.renderer.rules.fence([{ info: 'xml', content: '<mxfile />' }], 0, {}, {}, {})).toEqual({ type: 'fence-fallback', children: [] })

    initialized = false
    expect(md.renderer.rules.fence([{ info: 'xml', content: '<!-- --drawio-- -->' }], 0, {}, {}, {})).toBeNull()

    statuses.set('@yank-note/extension-drawio', { version: '1.0.0' })
    expect(md.renderer.rules.link_open([linkToken({ 'link-type': 'drawio' })], 0, {}, {}, {})).toBe('link-fallback')
  })

  it('registers luckysheet fallback renderer, guarded no-op branches and completion item', async () => {
    let initialized = true
    const statuses = new Map<string, any>()
    const store = { state: { currentFile: { path: 'sheet.md' } as any } }
    vi.doMock('@fe/others/extension', () => ({
      getInitialized: () => initialized,
      getLoadStatus: (id: string) => statuses.get(id) || {},
    }))
    vi.doMock('@fe/support/store', () => ({ default: store }))
    vi.doMock('@fe/services/i18n', () => ({ t: (_key: string, name: string) => `install ${name}` }))

    const { default: plugin } = await import('../markdown-luckysheet')
    const md = makeMarkdown()
    const items: any[] = []
    plugin.register({
      editor: { tapSimpleCompletionItems: (fn: Function) => fn(items) },
      markdown: { registerPlugin: (fn: Function) => fn(md) },
    } as any)

    expect(items.map(item => item.label)).toEqual(['/ []() Luckysheet Link'])
    expect(md.renderer.rules.link_open([linkToken({ 'link-type': 'other', href: 'a.json' })], 0, {}, {}, {})).toBe('link-fallback')
    store.state.currentFile = null
    expect(md.renderer.rules.link_open([linkToken({ 'link-type': 'luckysheet', href: 'a.json' })], 0, {}, {}, {})).toBe('link-fallback')

    store.state.currentFile = { path: 'sheet.md' }
    expect(md.renderer.rules.link_open([linkToken({ 'link-type': 'luckysheet', href: 'https://example.com/a.json' })], 0, {}, {}, {})).toBe('link-fallback')

    const nextToken = { type: 'text', content: 'Luckysheet' }
    const result: any = md.renderer.rules.link_open([linkToken({ 'link-type': 'luckysheet', href: 'a.json' }), nextToken], 0, {}, {}, {})
    expect(nextToken.content).toBe('')
    expect(vnodeText(result)).toBe('install Luckyseet')

    initialized = false
    expect(md.renderer.rules.link_open([linkToken({ 'link-type': 'luckysheet', href: 'a.json' })], 0, {}, {}, {})).toBeNull()

    statuses.set('@yank-note/extension-luckysheet', { version: '1.0.0' })
    expect(md.renderer.rules.link_open([linkToken({ 'link-type': 'luckysheet', href: 'a.json' })], 0, {}, {}, {})).toBe('link-fallback')
  })

  it('injects collapsible list styles, schema and renderer branches', async () => {
    const { h } = await import('vue')
    const { default: plugin } = await import('../markdown-list-collapsible')
    const md = makeMarkdown()
    const schema = { properties: {} as Record<string, any> }
    let enabled = false
    const ctx = {
      lib: { vue: { h } },
      markdown: { registerPlugin: (fn: Function) => fn(md) },
      setting: {
        changeSchema: vi.fn((fn: Function) => fn(schema)),
        getSetting: vi.fn(() => enabled),
      },
      view: { addStyles: vi.fn() },
    } as any

    plugin.register(ctx)
    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('list-collapse-icon'))
    expect(schema.properties['render.list-collapsible']).toMatchObject({
      defaultValue: false,
      type: 'boolean',
      group: 'render',
    })

    const disabledToken = { attrSet: vi.fn() }
    expect(md.renderer.rules.list_item_open([disabledToken], 0, {}, {}, {})).toEqual({ type: 'li', children: [] })
    expect(disabledToken.attrSet).not.toHaveBeenCalled()

    enabled = true
    const enabledToken = { attrSet: vi.fn() }
    const vnode: any = md.renderer.rules.list_item_open([enabledToken], 0, {}, {}, {})
    expect(enabledToken.attrSet).toHaveBeenCalledWith('data-collapsed', 'false')
    expect(vnode.children[0].props.class).toBe('list-collapse-icon')
    expect(vnode.children[0].props.onclick).toContain('data-collapsed')
  })

  it('registers github alerts markdown rule, styles and completion surroundSelection', async () => {
    const { default: plugin } = await import('../markdown-github-alerts')
    const md = { renderer: { rules: {} as Record<string, Function> } }
    const items: any[] = []
    const ctx = {
      editor: { tapSimpleCompletionItems: vi.fn((fn: Function) => fn(items)) },
      lib: { vue: { h: (type: string, props: any, children?: any) => ({ type, props, children }) } },
      markdown: { markdown: { use: vi.fn((fn: Function) => fn(md)) } },
      view: { addStyles: vi.fn() },
    } as any

    plugin.register(ctx)

    expect(githubAlertMocks.plugin).toHaveBeenCalledWith(md, { matchCaseSensitive: false })
    const alertNode: any = md.renderer.rules.alert_open([{ meta: { title: 'Note', type: 'note', icon: '<svg />' } }], 0)
    expect(alertNode.props.class).toBe('markdown-alert markdown-alert-note')
    expect(alertNode.children[0].props.class).toBe('markdown-alert-title')
    expect(alertNode.children[0].children[0].props.innerHTML).toBe('<svg />')
    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('@media screen { html[app-theme=dark] {--alert: dark;} }'))

    expect(items[0].label).toBe('/ > Github Alerts')
    expect(items[0].surroundSelection('> ${3:Content}', {}, { getValueInRange: () => 'one\ntwo' })).toBe('> one\n> two')
  })

  it('registers preview font control, syncs iframe styles and handles setting changes', async () => {
    const { default: plugin } = await import('../preview-font')
    const markdownBody = document.createElement('div')
    const hooks = new Map<string, Function>()
    const schema = { switch: { items: [] as any[] } }
    let fontFamily = 'Serif'
    const vue = await import('vue')
    const ctx = {
      args: { DOM_CLASS_NAME: { PREVIEW_MARKDOWN_BODY: 'markdown-body' } },
      lib: { vue },
      registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
      setting: { getSetting: vi.fn(() => fontFamily) },
      storage: { set: vi.fn() },
      store: { state: { showView: true, previewer: 'default' } },
      utils: { storage: { get: vi.fn(() => 18) } },
      view: {
        getRenderIframe: vi.fn(() => Promise.resolve({
          contentDocument: { querySelector: vi.fn(() => markdownBody) },
        })),
      },
      workbench: { ControlCenter: { tapSchema: vi.fn((fn: Function) => fn(schema)) } },
    } as any

    plugin.register(ctx)
    await Promise.resolve()

    expect(schema.switch.items).toHaveLength(1)
    expect(schema.switch.items[0]).toMatchObject({ type: 'custom', order: 1024, hidden: false })
    expect(ctx.storage.set).toHaveBeenCalledWith('plugin.preview-font.size', 18)
    expect(markdownBody.style.fontSize).toBe('18px')
    expect(markdownBody.style.fontFamily).toBe('Serif')

    const control: any = schema.switch.items[0].component()
    control.children[1].props.onInput({ target: { value: '24' } })
    fontFamily = ''
    hooks.get('SETTING_CHANGED')!({ changedKeys: ['other'] })
    await Promise.resolve()
    expect(markdownBody.style.fontSize).toBe('18px')

    hooks.get('SETTING_CHANGED')!({ changedKeys: ['view.default-previewer-font-family'] })
    await Promise.resolve()
    expect(markdownBody.style.fontSize).toBe('24px')
    expect(markdownBody.style.fontFamily).toBe('')

    control.children[0].props.onClick()
    hooks.get('SETTING_CHANGED')!({ changedKeys: ['view.default-previewer-font-family'] })
    await Promise.resolve()
    expect(markdownBody.style.fontSize).toBe('16px')
  })

  it('updates text autospace styles on startup and relevant setting changes only', async () => {
    const { default: plugin } = await import('../text-autospace')
    const hooks = new Map<string, Function>()
    const style = document.createElement('style')
    let enabled = true
    const ctx = {
      registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
      setting: { getSetting: vi.fn(() => enabled) },
      view: { addStyles: vi.fn(() => Promise.resolve(style)) },
    } as any

    plugin.register(ctx)
    hooks.get('STARTUP')!()
    await Promise.resolve()
    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('text-autospace: normal'))

    hooks.get('SETTING_CHANGED')!({ changedKeys: ['other'] })
    await Promise.resolve()
    expect(ctx.view.addStyles).toHaveBeenCalledTimes(1)

    enabled = false
    hooks.get('SETTING_CHANGED')!({ changedKeys: ['render.text-autospace'] })
    await Promise.resolve()
    expect(style.textContent).toBe('')

    enabled = true
    hooks.get('SETTING_CHANGED')!({ changedKeys: ['render.text-autospace'] })
    await Promise.resolve()
    expect(style.textContent).toContain('text-autospace: no-autospace')
  })
})
