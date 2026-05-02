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
})
