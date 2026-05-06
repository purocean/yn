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

describe('markdown-plantuml plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('registers marker plugins, export hook, editor completions, and monarch rules', () => {
    const ctx = createCtx()

    markdownPlantuml.register(ctx)

    expect(ctx.markdown.registerPlugin).toHaveBeenCalledTimes(7)
    expect(ctx.markdown.registerPlugin.mock.calls.map(([, options]: any[]) => options.openMarker)).toEqual([
      '@startuml',
      '@startsalt',
      '@startmindmap',
      '@startgantt',
      '@startwbs',
      '@startjson',
      '@startyaml',
    ])
    expect(ctx.registerHook).toHaveBeenCalledWith('VIEW_ON_GET_HTML_FILTER_NODE', expect.any(Function))
    expect(ctx.simpleItems.map((item: any) => item.label)).toContain('/ ``` PlantUML')
    expect(ctx.simpleItems.map((item: any) => item.label)).toContain('/ @startyaml PlantUML Yaml')
    expect(ctx.language.tokenizer.root[0][0].toString()).toContain('@@start')
    expect(ctx.language.tokenizer.plantuml[0][0].toString()).toContain('@@end')
  })

  test('parses plantuml marker blocks into image tokens and keeps unmatched markers closed by document end', () => {
    const md = new MarkdownIt()
    createCtx(md)
    markdownPlantuml.register(createCtx(md))

    const closed = md.parse('@startuml Sequence\nA -> B\n@enduml', {})
    const unclosed = md.parse('@startjson\n{"a": 1}', {})
    const ignored = md.parse('plain text', {})

    const umlToken = closed.find(token => token.type === 'uml_diagram')!
    const jsonToken = unclosed.find(token => token.type === 'uml_diagram')!
    expect(umlToken.attrs?.find(([name]) => name === 'src')?.[1]).toContain(`${location.origin}/api/plantuml?data=`)
    expect(umlToken.info).toBe(' Sequence')
    expect(umlToken.map).toEqual([0, 2])
    expect(jsonToken.map).toEqual([0, 2])
    expect(ignored.some(token => token.type === 'uml_diagram')).toBe(false)
  })

  test('renders plantuml fences as a vnode component and delegates non-plantuml fences', () => {
    const md = new MarkdownIt()
    markdownPlantuml.register(createCtx(md))
    const fence = md.renderer.rules.fence!
    const tokens = [
      { info: 'plantuml', content: '@startuml\nA -> B\n@enduml', meta: { attrs: { id: 'uml' } } },
    ] as any[]
    const codeTokens = md.parse('```ts\nconst x = 1\n```', {})
    const codeIndex = codeTokens.findIndex(token => token.type === 'fence')

    const vnode: any = fence(tokens, 0, md.options, {}, md.renderer as any)
    const fallback = fence(codeTokens, codeIndex, md.options, {}, md.renderer as any)

    expect(vnode.type.name).toBe('plantuml-image')
    expect(vnode.props.attrs).toEqual({ id: 'uml' })
    expect(vnode.props.src).toContain(`${location.origin}/api/plantuml?data=`)
    expect(fallback).toContain('<code class="language-ts">')
  })

  test('inlines plantuml image source during html export and ignores failed fetches', async () => {
    const ctx = createCtx()
    markdownPlantuml.register(ctx)
    const hook = ctx.hooks.get('VIEW_ON_GET_HTML_FILTER_NODE')
    const node = document.createElement('img')
    node.setAttribute('src', `${location.origin}/api/plantuml?data=abc`)
    node.setAttribute('style', 'width: 32px')

    await hook({ node, options: { inlineLocalImage: true } })

    expect(node.getAttribute('style')).toBe(null)
    expect(ctx.api.fetchHttp).toHaveBeenCalledWith(`${location.origin}/api/plantuml?data=abc`)
    expect(node.getAttribute('src')).toBe('data:image/png;base64,cGlj')

    ctx.api.fetchHttp.mockRejectedValueOnce(new Error('offline'))
    node.setAttribute('src', `${location.origin}/api/plantuml?data=bad`)
    await expect(hook({ node, options: { preferPng: true } })).resolves.toBeUndefined()
    expect(node.getAttribute('src')).toBe(`${location.origin}/api/plantuml?data=bad`)
  })

  test('leaves non-plantuml export nodes untouched', async () => {
    const ctx = createCtx()
    markdownPlantuml.register(ctx)
    const hook = ctx.hooks.get('VIEW_ON_GET_HTML_FILTER_NODE')
    const node = document.createElement('img')
    node.setAttribute('src', 'https://example.com/image.png')
    node.setAttribute('style', 'width: 32px')

    await hook({ node, options: { inlineLocalImage: true } })

    expect(ctx.api.fetchHttp).not.toHaveBeenCalled()
    expect(node.getAttribute('style')).toBe('width: 32px')
  })
})
