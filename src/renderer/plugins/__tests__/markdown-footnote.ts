vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

import MarkdownIt from 'markdown-it'
import markdownFootnote from '../markdown-footnote'

function createCtx (md: MarkdownIt) {
  return {
    markdown: {
      registerPlugin: vi.fn((plugin: any) => md.use(plugin)),
    },
    view: {
      addStyles: vi.fn(),
    },
  } as any
}

describe('markdown-footnote plugin', () => {
  test('registers preview styles and markdown-it footnote rules', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)

    markdownFootnote.register(ctx)

    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('.footnote-backref'))
    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
    expect(md.renderer.rules.footnote_ref).toEqual(expect.any(Function))
    expect(md.renderer.rules.footnote_anchor_name).toEqual(expect.any(Function))
  })

  test('parses referenced footnotes and renders document-scoped anchors', () => {
    const md = new MarkdownIt()
    markdownFootnote.register(createCtx(md))
    const env = { docId: 'doc-a' }
    const tokens = md.parse('Hello[^one]\n\n[^one]: Footnote text', env)

    expect(tokens.map(token => token.type)).toContain('footnote_block_open')
    expect(tokens.map(token => token.type)).toContain('footnote_anchor')

    const refIdx = tokens.findIndex(token => token.type === 'inline')
    const refToken = tokens[refIdx].children!.find(token => token.type === 'footnote_ref')!
    const html = md.renderer.rules.footnote_ref!([refToken], 0, md.options, env, md.renderer as any)

    expect(html).toContain('href="#fn-doc-a-1"')
    expect(html).toContain('id="fnref-doc-a-1"')
  })

  test('supports inline footnotes and vnode footnote list wrappers', () => {
    const md = new MarkdownIt()
    markdownFootnote.register(createCtx(md))
    const tokens = md.parse('Text ^[inline note]', {})
    const blockOpenIdx = tokens.findIndex(token => token.type === 'footnote_block_open')
    const footnoteOpenIdx = tokens.findIndex(token => token.type === 'footnote_open')

    const block = md.renderer.rules.footnote_block_open!(tokens, blockOpenIdx, md.options, {}, md.renderer as any) as any
    const item = md.renderer.rules.footnote_open!(tokens, footnoteOpenIdx, md.options, {}, md.renderer as any) as any

    expect(block.parent.type).toBe('ol')
    expect(block.parent.props.class).toBe('footnotes-list')
    expect(block.node.children[0].type).toBe('hr')
    expect(item.type).toBe('li')
    expect(item.props).toMatchObject({ id: 'fn1', class: 'footnote-item' })
  })
})
