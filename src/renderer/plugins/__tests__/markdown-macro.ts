const mocks = vi.hoisted(() => ({
  render: vi.fn(),
  copyText: vi.fn(),
  getPurchased: vi.fn(() => true),
  readFile: vi.fn(),
  toastShow: vi.fn(),
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

vi.mock('@fe/services/view', () => ({
  render: mocks.render,
}))

vi.mock('@fe/services/i18n', () => ({
  t: vi.fn((key: string, value?: string) => value ? `${key}:${value}` : key),
}))

vi.mock('@fe/support/api', () => ({
  readFile: mocks.readFile,
}))

vi.mock('@fe/utils', async () => {
  const crypto = await import('node:crypto')
  return {
    getLogger: vi.fn(() => ({ debug: vi.fn() })),
    md5: (value: string) => crypto.createHash('md5').update(value).digest('hex'),
  }
})

vi.mock('@fe/others/premium', () => ({
  getPurchased: mocks.getPurchased,
}))

vi.mock('@fe/services/document', () => ({
  isPlain: vi.fn((doc: any) => typeof doc.path === 'string' && doc.path.endsWith('.md')),
}))

import MarkdownIt from 'markdown-it'
import markdownMacro from '../markdown-macro'

function createCtx (md: MarkdownIt) {
  const hooks = new Map<string, Function[]>()
  const cache = { $define: {} }
  const ctx = {
    args: { HELP_REPO_NAME: 'help' },
    editor: {
      tapSimpleCompletionItems: vi.fn((fn: Function) => {
        const items: any[] = []
        fn(items)
        ;(ctx.editor.tapSimpleCompletionItems as any).items = items
      }),
      tapMarkdownMonarchLanguage: vi.fn((fn: Function) => {
        const language = { tokenizer: { root: [], monacoEnd: [] } }
        fn(language)
        ;(ctx.editor.tapMarkdownMonarchLanguage as any).language = language
      }),
    },
    i18n: { t: vi.fn((key: string) => key) },
    lib: {
      lodash: {
        pick: (obj: any, ...keys: string[]) => Object.fromEntries(keys.filter(key => key in obj).map(key => [key, obj[key]])),
      },
    },
    markdown: {
      registerPlugin: vi.fn((plugin: any) => md.use(plugin)),
    },
    registerHook: vi.fn((name: string, fn: Function) => {
      hooks.set(name, [...(hooks.get(name) || []), fn])
    }),
    renderer: {
      getRenderCache: vi.fn(() => cache),
    },
    setting: {
      changeSchema: vi.fn((fn: Function) => {
        const schema = { groups: [], properties: {} }
        fn(schema)
        ;(ctx.setting.changeSchema as any).schema = schema
      }),
    },
    statusBar: {
      tapMenus: vi.fn(),
      refreshMenu: vi.fn(),
    },
    utils: {
      copyText: mocks.copyText,
    },
    view: {
      getRenderEnv: vi.fn(() => ({ attributes: { enableMacro: true }, safeMode: false, source: 'rendered source' })),
      render: vi.fn(),
    },
    hooks,
  } as any

  return ctx
}

describe('markdown-macro plugin', () => {
  beforeEach(() => {
    mocks.render.mockClear()
    mocks.copyText.mockClear()
    mocks.getPurchased.mockReturnValue(true)
    mocks.readFile.mockReset()
  })

  test('registers markdown core rule, hooks, completions, monarch tokens, and settings schema', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)

    markdownMacro.register(ctx)

    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx.registerHook.mock.calls.map(([name]: any[]) => name)).toEqual([
      'STARTUP',
      'VIEW_RENDERED',
      'SETTING_BEFORE_WRITE',
      'SETTING_FETCHED',
      'SETTING_CHANGED',
    ])
    expect(ctx.editor.tapSimpleCompletionItems.items.map((item: any) => item.insertText)).toContain('[= ${1:1+1} =]')
    expect(ctx.editor.tapMarkdownMonarchLanguage.language.tokenizer.root[0][0].test('[=')).toBe(true)
    expect(ctx.setting.changeSchema.schema.properties.macros.type).toBe('array')
  })

  test('evaluates enabled macros and records line offsets', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownMacro.register(ctx)
    const env: any = {
      attributes: { enableMacro: true, name: 'Ada' },
      file: { type: 'file', repo: 'main', name: 'note.md', path: '/repo/note.md' },
      source: 'before',
    }

    const tokens = md.parse('Hello [= name.toUpperCase() =]\n[= "a\\nb" =]', env)

    expect(env.source).toBe('Hello ADA\na\nb')
    expect(env.originSource).toBe('before')
    expect(env.macroLines).toHaveLength(1)
    expect(tokens.map(token => token.content).join('\n')).toContain('Hello ADA')
  })

  test('applies configured replacements and after-macro hook', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownMacro.register(ctx)
    ctx.hooks.get('SETTING_FETCHED')[0]({ settings: { macros: [{ match: '{{name}}', replace: '[= who =]' }] } })
    const env: any = {
      attributes: { enableMacro: true, who: 'ada' },
      file: { type: 'file', repo: 'main', name: 'note.md', path: '/repo/note.md' },
    }

    md.parse('[= $afterMacro(src => src.toUpperCase()) =]{{name}}', env)

    expect(env.source).toBe('ADA')
  })

  test('resolves included markdown with front matter vars through the render cache', async () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownMacro.register(ctx)
    mocks.readFile.mockResolvedValue({
      content: '---\ntitle: Child\n---\nHello [= title =] [= name =]',
    })
    const env: any = {
      attributes: { enableMacro: true, name: 'Ada' },
      file: { type: 'file', repo: 'main', name: 'note.md', path: '/repo/note.md' },
    }

    md.parse('[= await $include("child.md", true) =]', env)
    expect(env.source).toBe('running...')

    await vi.waitFor(() => expect(mocks.readFile).toHaveBeenCalled())

    const envAfterCache: any = {
      attributes: { enableMacro: true, name: 'Ada' },
      file: { type: 'file', repo: 'main', name: 'note.md', path: '/repo/note.md' },
    }
    md.parse('[= await $include("child.md", true) =]', envAfterCache)

    expect(mocks.readFile).toHaveBeenCalledWith({
      type: 'file',
      repo: 'main',
      name: 'child.md',
      path: '/repo/child.md',
    })
    expect(envAfterCache.source).toBeTruthy()
  })

  test('shows premium placeholder when macro support is not purchased', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownMacro.register(ctx)
    mocks.getPurchased.mockReturnValue(false)
    const env: any = {
      attributes: { enableMacro: true },
      file: { type: 'file', repo: 'main', name: 'note.md', path: '/repo/note.md' },
    }

    md.parse('[= 1 + 1 =]', env)

    expect(env.source).toContain('premium.need-purchase:Macro')
    expect(env.source).toContain('premium.buy-license')
  })

  test('updates status menu copy action and filters invalid macro settings', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownMacro.register(ctx)
    const menus = { 'status-bar-tool': { list: [] as any[] } }

    ctx.hooks.get('STARTUP')[0]()
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)
    menus['status-bar-tool'].list[0].onClick()
    const settings = { macros: [{ match: 'x', replace: 'y' }, { match: '', replace: 'z' }] }
    ctx.hooks.get('SETTING_BEFORE_WRITE')[0]({ settings })
    ctx.hooks.get('SETTING_CHANGED')[0]({ changedKeys: ['macros'], settings: { macros: [] } })

    expect(menus['status-bar-tool'].list[0]).toMatchObject({
      id: 'plugin.markdown-macro.copy-markdown',
      hidden: false,
    })
    expect(mocks.copyText).toHaveBeenCalledWith('rendered source')
    expect(settings.macros).toEqual([{ match: 'x', replace: 'y' }])
    expect(ctx.view.render).toHaveBeenCalled()
  })
})
