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
  } as any
}

describe('markdown-katex plugin extra branches', () => {
  beforeEach(() => {
    mocks.katexRenderToString.mockClear()
    mocks.monacoLatex.mockClear()
    mocks.getRenderCache.mockClear()
    mocks.triggerHook.mockReset()
  })

  test('leaves invalid inline delimiters as text', () => {
    const md = new MarkdownIt()
    markdownKatex.register(createCtx(md))

    const noClose = md.parseInline('price $x', {})[0].children!
    const empty = md.parseInline('empty $$ value', {})[0].children!
    const spaced = md.parseInline('$ x $', {})[0].children!
    const beforeNumber = md.parseInline('$x$5', {})[0].children!

    expect(noClose.some(token => token.type === 'math_inline')).toBe(false)
    expect(empty.some(token => token.type === 'math_inline')).toBe(false)
    expect(spaced.some(token => token.type === 'math_inline')).toBe(false)
    expect(beforeNumber.some(token => token.type === 'math_inline')).toBe(false)
  })

  test('parses single-line and unclosed block math', () => {
    const md = new MarkdownIt()
    markdownKatex.register(createCtx(md))

    const singleLine = md.parse('$$x + 1$$', {})
    const unclosed = md.parse('$$\ny + 1', {})

    expect(singleLine.find(token => token.type === 'math_block')?.content).toBe('x + 1\n')
    expect(unclosed.find(token => token.type === 'math_block')?.content).toBe('y + 1')
  })

  test('before-render hook can mutate latex and options before katex render', () => {
    const md = new MarkdownIt()
    markdownKatex.register(createCtx(md))
    mocks.triggerHook.mockImplementationOnce((_name: string, event: any) => {
      event.payload.latex = 'mutated'
      event.payload.options.displayMode = true
    })

    const inlineTokens = md.parseInline('$original$', {})
    const inlineMath = inlineTokens[0].children!.find(token => token.type === 'math_inline')!
    const node: any = md.renderer.rules.math_inline!([inlineMath] as any, 0, md.options, {}, md.renderer as any)

    expect(mocks.katexRenderToString).toHaveBeenCalledWith('mutated', { displayMode: true })
    expect(node.props.innerHTML).toBe('<span class="katex">block:mutated</span>')
  })

  test('renders block katex errors as code vnodes', () => {
    const md = new MarkdownIt()
    markdownKatex.register(createCtx(md))
    mocks.katexRenderToString.mockImplementationOnce(() => {
      throw new Error('block failed')
    })

    const tokens = md.parse('$$\nbad\n$$', {})
    const idx = tokens.findIndex(token => token.type === 'math_block')
    const node: any = md.renderer.rules.math_block!(tokens, idx, md.options, {}, md.renderer as any)

    expect(node.type).toBe('code')
    expect(node.children).toBe('block failed [bad\n]')
  })
})
