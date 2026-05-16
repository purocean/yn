vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: {
    ONLY_CHILD: 'data-only-child',
    TOKEN_IDX: 'data-token-idx',
  },
}))

import MarkdownIt from 'markdown-it'
import markdownPlantuml from '../markdown-plantuml'

function createCtx (md = new MarkdownIt()) {
  const hooks = new Map<string, Function>()
  const simpleItems: any[] = []
  const language = { tokenizer: { root: [] as any[] } }
  const ctx = {
    api: {
      fetchHttp: vi.fn(async () => new Response(new Blob(['image'], { type: 'image/png' }))),
    },
    editor: {
      tapMarkdownMonarchLanguage: vi.fn((fn: Function) => fn(language)),
      tapSimpleCompletionItems: vi.fn((fn: Function) => fn(simpleItems)),
    },
    markdown: {
      registerPlugin: vi.fn((plugin: any, options?: any) => md.use(plugin, options)),
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    utils: {
      fileToBase64URL: vi.fn(async () => 'data:image/png;base64,cGlj'),
    },
    hooks,
    language,
    simpleItems,
  } as any

  return ctx
}

describe('markdown-plantuml plugin extra branches', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('keeps plantuml export src remote when png inlining is not requested', async () => {
    const ctx = createCtx()
    markdownPlantuml.register(ctx)
    const hook = ctx.hooks.get('VIEW_ON_GET_HTML_FILTER_NODE')!
    const node = document.createElement('img')
    const src = `${location.origin}/api/plantuml?data=abc`
    node.setAttribute('src', src)
    node.setAttribute('style', 'width: 32px')

    await hook({ node, options: { preferPng: false, inlineLocalImage: false } })

    expect(node.getAttribute('style')).toBe(null)
    expect(node.getAttribute('src')).toBe(src)
    expect(ctx.api.fetchHttp).not.toHaveBeenCalled()
  })

  test('default uml renderer falls back to markdown-it image rule when no custom renderer is passed', () => {
    const ctx = createCtx()
    markdownPlantuml.register(ctx)
    const registered = ctx.markdown.registerPlugin
    const plugin = registered.mock.calls[0]?.[0]
    const md = new MarkdownIt()

    plugin(md, { openMarker: '@startuml', closeMarker: '@enduml' })
    const html = md.render('@startuml Diagram *alt*\nA -> B\n@enduml')

    expect(html).toContain('<img src=')
    expect(html).toContain('alt="Diagram alt"')
    expect(html).toContain(`${location.origin}/api/plantuml?data=`)
  })

  test('rejects invalid closing markers and delegates non-plantuml fences', () => {
    const md = new MarkdownIt()
    markdownPlantuml.register(createCtx(md))

    const tokens = md.parse('@startuml\nA -> B\n@enduml trailing\ntext', {})
    const umlToken = tokens.find(token => token.type === 'uml_diagram')!
    expect(umlToken.map).toEqual([0, 4])

    const codeTokens = md.parse('```mermaid\ngraph TD\n```', {})
    const idx = codeTokens.findIndex(token => token.type === 'fence')
    const html = md.renderer.rules.fence!(codeTokens, idx, md.options, {}, md.renderer as any)
    expect(html).toContain('language-mermaid')
  })
})
