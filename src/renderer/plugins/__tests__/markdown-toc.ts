vi.mock('@fe/core/keybinding', () => ({
  getKeyLabel: vi.fn(() => 'Ctrl'),
}))

vi.mock('@fe/context', () => ({
  default: {
    i18n: {
      t: vi.fn((key: string) => key),
    },
  },
  Plugin: class {},
}))

import MarkdownIt from 'markdown-it'
import markdownToc from '../markdown-toc'

function createCtx (md: MarkdownIt) {
  return {
    view: { addStyles: vi.fn() },
    markdown: {
      registerPlugin: vi.fn((plugin: any, options?: any) => md.use(plugin, options)),
    },
    editor: {
      tapSimpleCompletionItems: vi.fn((fn: any) => {
        const items: any[] = []
        fn(items)
        return items
      }),
    },
  } as any
}

describe('markdown-toc plugin', () => {
  test('registers styles, markdown-it plugin, and completion item', () => {
    const ctx = createCtx(new MarkdownIt())

    markdownToc.register(ctx)

    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('.table-of-contents'))
    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx.editor.tapSimpleCompletionItems).toHaveBeenCalledWith(expect.any(Function))
  })

  test('adds heading ids, titles, and data tags', () => {
    const md = new MarkdownIt()
    markdownToc.register(createCtx(md))

    const html = md.render('## Hello World')

    expect(html).toContain('id="Hello-World"')
    expect(html).toContain('title="Ctrl + click-to-copy-link"')
    expect(html).toContain('data-tag="h2"')
  })

  test('builds nested toc vnode html for configured heading levels', () => {
    const md = new MarkdownIt()
    markdownToc.register(createCtx(md))
    const env = {}
    const tokens = md.parse('[toc]{type: "ol", level: [2,3]}\n\n## A <B>\n### Child\n# Ignored', env)
    const tocTokenIndex = tokens.findIndex(token => token.type === 'inline' && token.children?.some(child => child.type === 'toc_body'))
    const tocToken = tokens[tocTokenIndex].children!.find(child => child.type === 'toc_body')!

    const vnode = md.renderer.rules.toc_body!([tocToken] as any, 0, md.options, env, md.renderer as any) as any

    expect(vnode.type).toBe('div')
    expect(vnode.props.class).toBe('table-of-contents')
    expect(vnode.props.innerHTML).toContain('<ol><li><a href="#A-<B>">A &lt;B&gt;</a><ol><li><a href="#Child">Child</a></li></ol></li></ol>')
    expect(vnode.props.innerHTML).not.toContain('Ignored')
  })

  test('honors custom marker options and escaped quote slugs', () => {
    const md = new MarkdownIt()
    markdownToc.register(createCtx(md))
    const env = {}
    const tokens = md.parse('[toc]{level: [2], containerClass: "toc-box"}\n\n## Say "Hi"', env)
    const tocToken = tokens.flatMap(token => token.children || []).find(token => token.type === 'toc_body')!

    const vnode = md.renderer.rules.toc_body!([tocToken] as any, 0, md.options, env, md.renderer as any) as any

    expect(vnode.props.class).toBe('toc-box')
    expect(vnode.props.innerHTML).toContain('href="#Say-&quot;Hi&quot;"')
  })

  test('keeps default options when custom params are invalid', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const md = new MarkdownIt()
    markdownToc.register(createCtx(md))
    const env = {}
    const tokens = md.parse('[toc]{bad json}\n\n## A', env)
    const tocToken = tokens.flatMap(token => token.children || []).find(token => token.type === 'toc_body')!

    const vnode = md.renderer.rules.toc_body!([tocToken] as any, 0, md.options, env, md.renderer as any) as any

    expect(log).toHaveBeenCalledWith('parse params error', ['[toc]{bad json}', '{bad json}'])
    expect(vnode.props.class).toBe('table-of-contents')
    expect(vnode.props.innerHTML).toContain('<ul><li><a href="#A">A</a></li></ul>')
    log.mockRestore()
  })

  test('handles inline toc markers and empty heading sets', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const md = new MarkdownIt()
    markdownToc.register(createCtx(md))

    expect(md.render('plain [toc] text')).toContain('[object Object]')

    const tokens = md.parse('[toc]\n\nparagraph only', {})
    const tocToken = tokens.flatMap(token => token.children || []).find(token => token.type === 'toc_body')!
    const vnode = md.renderer.rules.toc_body!([tocToken] as any, 0, md.options, {}, md.renderer as any) as any

    expect(vnode.props.innerHTML).toContain('<ul></ul>')
    log.mockRestore()
  })

  test('renders full toc chunks and preserves existing heading attrs', () => {
    const md = new MarkdownIt()
    markdownToc.register(createCtx(md))
    const env = {}
    const tokens = md.parse('[toc]{forceFullToc: true, type: "ol"}\n\n## A\n### B\n# C', env)
    const tocToken = tokens.flatMap(token => token.children || []).find(token => token.type === 'toc_body')!

    const vnode = md.renderer.rules.toc_body!([tocToken] as any, 0, md.options, env, md.renderer as any) as any

    expect(vnode.props.innerHTML).toContain('<ol><li><a href="#A">A</a><ol><li><a href="#B">B</a></li></ol></li></ol>')

    const headingOpen = tokens.findIndex(token => token.type === 'heading_open')
    tokens[headingOpen].attrSet('id', 'preset')
    tokens[headingOpen].attrSet('title', 'preset title')
    md.renderer.rules.heading_open!(tokens as any, headingOpen, md.options, env, md.renderer)
    expect(tokens[headingOpen].attrGet('id')).toBe('preset')
    expect(tokens[headingOpen].attrGet('title')).toBe('preset title')
  })

  test('returns nothing before headings are captured', () => {
    const md = new MarkdownIt()
    markdownToc.register(createCtx(md))

    expect(md.renderer.rules.toc_body!([] as any, 0, md.options, {}, md.renderer as any)).toBeUndefined()
  })
})
