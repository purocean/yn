const mocks = vi.hoisted(() => ({
  katexRenderToString: vi.fn((latex: string, options: any) => `<span class="katex">${options.displayMode ? 'block' : 'inline'}:${latex}</span>`),
  monacoLatex: vi.fn(),
  getRenderCache: vi.fn((_plugin: string, _key: string, fn: () => string) => fn()),
  triggerHook: vi.fn(),
}))

vi.mock('katex', () => ({
  default: {
    renderToString: mocks.katexRenderToString,
  },
}))

vi.mock('katex/contrib/mhchem/mhchem.js', () => ({}))

vi.mock('katex/dist/katex.min.css?inline', () => ({
  default: '.katex{}',
}))

vi.mock('@fe/others/monaco-latex', () => ({
  default: mocks.monacoLatex,
}))

vi.mock('@fe/services/renderer', () => ({
  getRenderCache: mocks.getRenderCache,
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: mocks.triggerHook,
}))

import MarkdownIt from 'markdown-it'
import markdownKatex from '../markdown-katex'

function createCtx (md: MarkdownIt) {
  const completions: any[] = []
  const mdLanguage = { tokenizer: { root: [] } } as any
  const monaco = { languages: {} }

  return {
    editor: {
      tapMarkdownMonarchLanguage: vi.fn((fn: any) => fn(mdLanguage)),
      tapSimpleCompletionItems: vi.fn((fn: any) => fn(completions)),
      whenEditorReady: vi.fn(() => Promise.resolve({ monaco })),
    },
    markdown: {
      registerPlugin: vi.fn((plugin: any, options?: any) => md.use(plugin, options)),
    },
    view: { addStyles: vi.fn() },
    _completions: completions,
    _mdLanguage: mdLanguage,
    _monaco: monaco,
  } as any
}

describe('markdown-katex plugin', () => {
  beforeEach(() => {
    mocks.katexRenderToString.mockClear()
    mocks.monacoLatex.mockClear()
    mocks.getRenderCache.mockClear()
    mocks.triggerHook.mockClear()
  })

  test('registers styles, markdown rules, latex editor setup, completions, and monarch tokens', async () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)

    markdownKatex.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('.markdown-view .markdown-body .katex'))
    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function), { throwOnError: true })
    expect(mocks.monacoLatex).toHaveBeenCalledWith(ctx._monaco)
    expect(ctx._completions.map((item: any) => item.label)).toEqual([
      '/ \\begin KaTeX Environment',
      '/ $ Inline KaTeX',
      '/ $$ Block KaTeX',
    ])
    expect(ctx._mdLanguage.tokenizer.root).toHaveLength(2)
    expect(ctx._mdLanguage.tokenizer.latexBlockEnd).toBeDefined()
    expect(ctx._mdLanguage.tokenizer.latexInlineEnd).toBeDefined()
  })

  test('parses inline and block math and renders cached vnode output', () => {
    const md = new MarkdownIt()
    markdownKatex.register(createCtx(md))

    const inlineTokens = md.parseInline('before $x + 1$ after', { attributes: { katex: { macros: { '\\RR': '\\mathbb{R}' } } } })
    const inlineMath = inlineTokens[0].children!.find(token => token.type === 'math_inline')!
    const inlineNode: any = md.renderer.rules.math_inline!([inlineMath] as any, 0, md.options, { attributes: { katex: { fleqn: true } } }, md.renderer as any)

    expect(inlineMath.content).toBe('x + 1')
    expect(inlineNode.type).toBe('span')
    expect(inlineNode.props.class).toBe('katex')
    expect(inlineNode.props.innerHTML).toBe('inline:x + 1')
    expect(mocks.triggerHook).toHaveBeenCalledWith('PLUGIN_HOOK', expect.objectContaining({
      plugin: 'markdown-katex',
      type: 'before-render',
    }))

    const blockTokens = md.parse('$$\ny = 2\n$$', {})
    const blockIndex = blockTokens.findIndex(token => token.type === 'math_block')
    const blockNode: any = md.renderer.rules.math_block!(blockTokens, blockIndex, md.options, {}, md.renderer as any)

    expect(blockTokens[blockIndex].content).toBe('y = 2\n')
    expect(blockNode.type).toBe('p')
    expect(blockNode.props.innerHTML).toBe('<span class="katex">block:y = 2\n</span>')
  })

  test('renders katex errors as code vnodes', () => {
    const md = new MarkdownIt()
    markdownKatex.register(createCtx(md))
    mocks.katexRenderToString.mockImplementationOnce(() => {
      throw new Error('bad latex')
    })

    const inlineTokens = md.parseInline('$broken$', {})
    const inlineMath = inlineTokens[0].children!.find(token => token.type === 'math_inline')!
    const node: any = md.renderer.rules.math_inline!([inlineMath] as any, 0, md.options, {}, md.renderer as any)

    expect(node.type).toBe('code')
    expect(node.children).toBe('bad latex [broken]')
  })
})
