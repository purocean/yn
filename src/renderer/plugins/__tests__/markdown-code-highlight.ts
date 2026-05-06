const mocks = vi.hoisted(() => ({
  highlight: vi.fn((code: string, _grammar: any, lang: string) => `<span class="token ${lang}">${code}</span>`),
  juice: vi.fn((html: string) => `<inlined>${html}</inlined>`),
  loggerWarn: vi.fn(),
}))

vi.mock('prismjs', () => ({
  default: {
    languages: {
      javascript: {},
      markup: {},
      python: {},
      typescript: {},
    },
    highlight: mocks.highlight,
  },
}))

vi.mock('prismjs/themes/prism.css?inline', () => ({
  default: '/* prism default */',
}))

vi.mock('@fe/others/prism-style.scss?inline', () => ({
  default: '/* prism custom */',
}))

vi.mock('@fe/others/prism-languages-all', () => ({}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/utils', () => ({
  getLogger: vi.fn(() => ({
    warn: mocks.loggerWarn,
  })),
}))

import MarkdownIt from 'markdown-it'
import markdownCodeHighlight from '../markdown-code-highlight'

function createCtx (md = new MarkdownIt()) {
  const hooks = new Map<string, Function>()
  const completionItems: any[] = []

  return {
    args: {
      DOM_CLASS_NAME: {
        WRAP_CODE: 'wrap-code',
      },
    },
    editor: {
      tapSimpleCompletionItems: vi.fn((fn: Function) => fn(completionItems)),
    },
    lib: {
      juice: mocks.juice,
      lodash: {
        escape: (value: string) => value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;'),
      },
    },
    markdown: {
      registerPlugin: vi.fn((plugin: any) => md.use(plugin)),
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    view: {
      addStyles: vi.fn(),
    },
    completionItems,
    hooks,
    md,
  } as any
}

function createExportTable (code: string, lang = 'ts') {
  const root = document.createElement('div')
  const pre = document.createElement('pre')
  const button = document.createElement('button')
  const codeWrap = document.createElement('code')
  const table = document.createElement('table')

  button.className = 'p-mcc-copy-btn copy-text'
  button.dataset.text = code
  table.dataset.lang = lang
  codeWrap.appendChild(table)
  pre.append(button, codeWrap)
  root.appendChild(pre)

  return { root, table }
}

describe('markdown-code-highlight plugin', () => {
  beforeEach(() => {
    mocks.highlight.mockClear()
    mocks.juice.mockClear()
    mocks.loggerWarn.mockClear()
    document.body.innerHTML = ''
  })

  test('registers styles, markdown highlighter, export hook, and code completion list', () => {
    const ctx = createCtx()

    markdownCodeHighlight.register(ctx)

    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('table.hljs-ln'))
    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx.registerHook).toHaveBeenCalledWith('VIEW_ON_GET_HTML_FILTER_NODE', expect.any(Function))
    expect(ctx.completionItems).toHaveLength(1)
    expect(ctx.completionItems[0]).toMatchObject({
      language: 'markdown',
      label: '/ ``` Code',
      block: true,
    })
    expect(ctx.completionItems[0].insertText).toContain('typescript')
    expect(ctx.md.options.highlight).toEqual(expect.any(Function))
  })

  test('highlights mapped languages, duplicates multiline token spans, and escapes plain code', () => {
    const ctx = createCtx()
    markdownCodeHighlight.register(ctx)

    const numbered = ctx.md.options.highlight('const a = 1\nconst b = 2\n', 'ts')
    const escaped = ctx.md.options.highlight('<b>x</b>', '')
    const fallback = ctx.md.options.highlight('<x>\n', 'unknown')

    expect(mocks.highlight).toHaveBeenCalledWith('const a = 1\nconst b = 2\n', {}, 'typescript')
    expect(numbered).toContain('<table class="hljs-ln" data-lang="ts">')
    expect(numbered).toContain('data-line-number="1"')
    expect(numbered).toContain('data-line-number="2"')
    expect(numbered).toContain('<span class="token typescript">const a = 1</span>')
    expect(escaped).toBe('&lt;b&gt;x&lt;/b&gt;')
    expect(fallback).toContain('&lt;x&gt;')
    expect(mocks.loggerWarn).toHaveBeenCalledWith('Syntax highlight for language "unknown" is not supported.')
  })

  test('export hook keeps line-number tables, embeds copy code, and regenerates plain numbered output', () => {
    const ctx = createCtx()
    markdownCodeHighlight.register(ctx)
    const hook = ctx.hooks.get('VIEW_ON_GET_HTML_FILTER_NODE')!

    const numbered = createExportTable('let a = 1\nlet b = 2', 'js')
    hook({ node: numbered.table, options: { codeCopyButton: true, codeLineNumbers: true, highlightCode: true } })
    expect(numbered.table.dataset.code).toBe('let a = 1\nlet b = 2')

    const plainNumbered = createExportTable('let a = 1\nlet b = 2', 'js')
    hook({ node: plainNumbered.table, options: { codeCopyButton: true, codeLineNumbers: true, highlightCode: false } })
    expect(plainNumbered.root.innerHTML).toContain('data-lang="text"')
    expect(plainNumbered.root.innerHTML).toContain('data-code="let a = 1')
    expect(plainNumbered.root.innerHTML).toContain('data-line-number="2"')
  })

  test('export hook emits highlighted inline styles or escaped raw code when line numbers are disabled', () => {
    const ctx = createCtx()
    markdownCodeHighlight.register(ctx)
    const hook = ctx.hooks.get('VIEW_ON_GET_HTML_FILTER_NODE')!

    const highlighted = createExportTable('console.log(1)', 'javascript')
    hook({ node: highlighted.table, options: { codeLineNumbers: false, highlightCode: true, inlineStyle: true } })
    expect(mocks.juice).toHaveBeenCalledWith(
      expect.stringContaining('<span class="token javascript">console.log(1)</span>'),
      { extraCss: expect.stringContaining('prism default') },
    )
    expect(highlighted.root.innerHTML).toContain('<inlined>')

    const raw = createExportTable('<script>', 'js')
    hook({ node: raw.table, options: { codeLineNumbers: false, highlightCode: false } })
    expect(raw.root.innerHTML).toContain('&lt;script&gt;')
  })
})
