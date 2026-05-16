vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: {
    SOURCE_LINE_START: 'data-source-line',
    SOURCE_LINE_END: 'data-source-line-end',
    TOKEN_IDX: 'data-token-idx',
  },
}))

import MarkdownIt from 'markdown-it'
import { Fragment } from 'vue'
import markdownRenderVNode from '../markdown-render-vnode'

function createCtx (md: MarkdownIt) {
  return {
    markdown: {
      registerPlugin: vi.fn((plugin: any) => md.use(plugin)),
    },
  } as any
}

describe('markdown-render-vnode plugin', () => {
  test('registers vnode renderer methods and default rules', () => {
    const md = new MarkdownIt({ html: true })
    const ctx = createCtx(md)

    markdownRenderVNode.register(ctx)

    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
    expect(md.renderer.render).toEqual(expect.any(Function))
    expect(md.renderer.renderInline).toEqual(expect.any(Function))
    expect(md.renderer.renderAttrs).toEqual(expect.any(Function))
    expect(md.renderer.rules.code_inline).toEqual(expect.any(Function))
  })

  test('renders nested markdown tokens as vnodes with source line attrs', () => {
    const md = new MarkdownIt()
    markdownRenderVNode.register(createCtx(md))
    const nodes = md.renderer.render(md.parse('# Title\n\nParagraph with `code`.', {}), md.options, {}) as any[]
    const heading = nodes.find(node => node.type === 'h1')
    const paragraph = nodes.find(node => node.type === 'p')
    const inlineCode = paragraph.children.find((node: any) => node.type === Fragment)
      .children.find((node: any) => node.type === 'code')

    expect(heading.props).toMatchObject({
      'data-source-line': '1',
      'data-source-line-end': '2',
      'data-token-idx': expect.any(String),
    })
    expect(inlineCode.children).toBe('code')
  })

  test('sanitizes dangerous attrs in safe mode and filters event attrs', () => {
    const md = new MarkdownIt({ html: true })
    markdownRenderVNode.register(createCtx(md))
    const env = { safeMode: true }
    const tokens = md.parse('[bad](https://example.com)\n\n![x](https://example.com/a.png)', env)
    const inlineTokens = tokens.filter(token => token.type === 'inline')
    const linkOpen = inlineTokens[0].children!.find(token => token.type === 'link_open')!
    const image = inlineTokens[1].children!.find(token => token.type === 'image')!

    linkOpen.attrSet('href', 'javascript:alert(1)')
    linkOpen.attrSet('onclick', 'bad()')
    image.attrSet('src', 'file:///tmp/a.png')
    image.attrSet('onerror', 'bad()')
    md.renderer.render(tokens, md.options, env) as any[]

    expect(linkOpen.attrGet('href')).toBe('')
    expect((md.renderer.renderAttrs as any)(linkOpen).onclick).toBeUndefined()
    expect(image.attrGet('src')).toBe('')
    expect((md.renderer.renderAttrs as any)(image).onerror).toBeUndefined()
  })

  test('renders fences with highlighted code vnode props instead of raw html strings', () => {
    const md = new MarkdownIt()
    markdownRenderVNode.register(createCtx(md))
    const nodes = md.renderer.render(md.parse('```ts\nconst x = 1\n```', {}), md.options, {}) as any[]
    const pre = nodes.find(node => node.type === 'pre')
    const code = pre.children[0]

    expect(code.type).toBe('code')
    expect(code.props.innerHTML).toBe('const x = 1\n')
    expect(code.children).toEqual([])
  })

  test('renders block code, image alt text, and softbreak variants', () => {
    const md = new MarkdownIt({ breaks: true })
    markdownRenderVNode.register(createCtx(md))
    const nodes = md.renderer.render(md.parse('    indented\n\n![alt *text*](pic.png)\n\na\nb', {}), md.options, {}) as any[]
    const codeBlock = nodes.find(node => node.type === 'pre' && node.children[0]?.type === 'code')
    const paragraphWithImage = nodes.find(node => node.type === 'p' && node.children[0]?.children?.some((child: any) => child.type === 'img'))
    const image = paragraphWithImage.children[0].children.find((child: any) => child.type === 'img')
    const paragraphWithBreak = nodes.find(node => node.type === 'p' && node.children[0]?.children?.some((child: any) => child.type === 'br'))

    expect(codeBlock.children[0].children[0].children).toBe('indented\n')
    expect(image.props).toMatchObject({ src: 'pic.png', alt: 'alt text' })
    expect(paragraphWithBreak.children[0].children.map((child: any) => child.type || child.children)).toEqual([
      Symbol.for('v-txt'),
      'br',
      Symbol.for('v-txt'),
    ])

    md.options.breaks = false
    const softBreakNodes = md.renderer.render(md.parse('a\nb', {}), md.options, {}) as any[]
    expect(softBreakNodes[0].children[0].children).not.toContainEqual(expect.objectContaining({ type: 'br' }))
  })

  test('wraps highlighted pre html strings as html vnodes', () => {
    const md = new MarkdownIt({
      highlight: () => '<pre class="hl"><code>ok</code></pre>',
    })
    markdownRenderVNode.register(createCtx(md))

    const nodes = md.renderer.render(md.parse('```js\nok\n```', {}), md.options, {}) as any[]
    const fragment = nodes[0]

    expect(fragment.type).toBe(Fragment)
    expect(fragment.children[0]).toMatchObject({
      type: 'pre',
      props: expect.objectContaining({ class: 'hl', innerHTML: '<code>ok</code>' }),
    })
  })
})
