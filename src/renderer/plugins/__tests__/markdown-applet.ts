const mocks = vi.hoisted(() => ({
  hooks: new Map<string, Function[]>(),
  md5: vi.fn(() => 'hash123'),
  removeHook: vi.fn(),
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: vi.fn((name: string, fn: Function) => {
    mocks.hooks.set(name, [...(mocks.hooks.get(name) || []), fn])
  }),
  removeHook: mocks.removeHook,
}))

vi.mock('@fe/support/embed', () => ({
  IFrame: { name: 'IFrame' },
}))

vi.mock('@fe/utils', () => ({
  md5: mocks.md5,
}))

import MarkdownIt from 'markdown-it'
import markdownApplet from '../markdown-applet'

function createCtx (md = new MarkdownIt()) {
  const completions: any[] = []
  return {
    editor: {
      tapSimpleCompletionItems: vi.fn((fn: Function) => fn(completions)),
    },
    markdown: {
      registerPlugin: vi.fn((plugin: any) => md.use(plugin)),
    },
    _completions: completions,
    _md: md,
  } as any
}

describe('markdown-applet plugin', () => {
  beforeEach(() => {
    mocks.hooks.clear()
    mocks.md5.mockClear()
    mocks.removeHook.mockClear()
  })

  test('registers markdown renderer plugin and applet completion item', () => {
    const ctx = createCtx()

    markdownApplet.register(ctx)

    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx._completions).toEqual([
      expect.objectContaining({
        language: 'markdown',
        label: '/ ``` Applet',
        block: true,
      }),
    ])
  })

  test('renders html applet fences as a titled fieldset vnode', () => {
    const ctx = createCtx()
    markdownApplet.register(ctx)
    const fence = ctx._md.renderer.rules.fence

    const vnode = fence([
      {
        info: 'html',
        content: '<!-- --applet-- Demo -->\n<button>OK</button>',
        meta: { attrs: { sandbox: 'allow-scripts' } },
      },
    ], 0, {}, { safeMode: false }, {}) as any

    expect(mocks.md5).toHaveBeenCalledWith('<!-- --applet-- Demo -->\n<button>OK</button>')
    expect(vnode.type).toBe('fieldset')
    expect(vnode.children[0].children).toBe('Applet: Demo')
    expect(vnode.children[1].props).toEqual({ class: 'applet' })
    expect(vnode.children[1].children[0].props).toMatchObject({
      appletId: 'applet-hash123-0',
      attrs: { sandbox: 'allow-scripts' },
    })
    expect(vnode.children[1].children[0].props.html).toContain('<button>OK</button>')
  })

  test('renders untitled applet fences directly as the applet vnode', () => {
    const ctx = createCtx()
    markdownApplet.register(ctx)
    const fence = ctx._md.renderer.rules.fence

    const vnode = fence([
      {
        info: 'html',
        content: '<!-- --applet-- -->\n<input>',
        meta: undefined,
      },
    ], 0, {}, { safeMode: false }, {}) as any

    expect(vnode.props).toMatchObject({
      appletId: 'applet-hash123-0',
      attrs: undefined,
    })
    expect(vnode.props.html).toContain('<input>')
  })

  test('falls back to the default fence renderer for non applet, non-html, or safe-mode fences', () => {
    const ctx = createCtx()
    markdownApplet.register(ctx)
    const fence = ctx._md.renderer.rules.fence
    const renderFence = (source: string, env: any) => {
      const tokens = ctx._md.parse(source, env)
      const idx = tokens.findIndex((token: any) => token.type === 'fence')
      return fence(tokens, idx, {}, env, ctx._md.renderer)
    }

    expect(renderFence('```js\n<!-- --applet-- Demo -->\n```', { safeMode: false })).toContain('<code')
    expect(renderFence('```html\n<div>Plain</div>\n```', { safeMode: false })).toContain('&lt;div&gt;Plain')
    expect(renderFence('```html\n<!-- --applet-- Demo -->\n```', { safeMode: true })).toContain('applet')
  })
})
