vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

import MarkdownIt from 'markdown-it'
import markdownHtml from '../markdown-html'

function createCtx (md: MarkdownIt) {
  return {
    markdown: {
      registerPlugin: vi.fn((plugin: any) => md.use(plugin)),
    },
  } as any
}

describe('markdown-html plugin', () => {
  test('registers custom html parser hooks', () => {
    const md = new MarkdownIt({ html: true })
    const originalParse = md.parse
    const originalInlineParse = md.inline.parse
    const ctx = createCtx(md)

    markdownHtml.register(ctx)

    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
    expect(md.parse).not.toBe(originalParse)
    expect(md.inline.parse).not.toBe(originalInlineParse)
  })

  test('parses balanced inline html into open, text, and close tokens', () => {
    const md = new MarkdownIt({ html: true })
    markdownHtml.register(createCtx(md))
    const tokens = md.parse('before <span title="x">inside</span> after', {})
    const children = tokens.find(token => token.type === 'inline')!.children!

    expect(children.map(token => token.type)).toEqual([
      'text',
      'html_open',
      'text',
      'html_close',
      'text',
    ])
    expect(children[1].tag).toBe('span')
    expect(children[1].attrs).toEqual([['title', 'x']])
  })

  test('blocks unsafe tags and attributes in safe mode', () => {
    const md = new MarkdownIt({ html: true })
    markdownHtml.register(createCtx(md))
    const scriptTokens = md.parse('<script>alert(1)</script>', { safeMode: true })
    const spanTokens = md.parse('<span onclick="bad()" aria-label="x" data-id="ok">safe</span>', { safeMode: true })
    const spanOpen = spanTokens.find(token => token.type === 'html_open')

    expect(scriptTokens.some(token => token.type === 'html_open' && token.tag === 'script')).toBe(false)
    expect(spanOpen?.attrs).toEqual([['data-id', 'ok']])
  })

  test('rejects script tags, incomplete comments, and unsupported safe-mode tags', () => {
    const md = new MarkdownIt({ html: true })
    markdownHtml.register(createCtx(md))

    expect(md.parse('<script>alert(1)</script>', {}).some(token => token.tag === 'script')).toBe(false)
    expect(md.parse('<!-- missing close', {}).some(token => token.type === 'comment')).toBe(false)
    expect(md.parse('<custom>x</custom>', { safeMode: true }).some(token => token.type === 'html_open')).toBe(false)
  })

  test('hides complete multi-line html comments', () => {
    const md = new MarkdownIt({ html: true })
    markdownHtml.register(createCtx(md))
    const tokens = md.parse('<!--\nsecret\n-->\n\nvisible', {})

    expect(tokens[0].type).toBe('comment')
    expect(tokens[0].hidden).toBe(true)
    expect(tokens[0].map).toEqual([0, 3])
  })

  test('parses self-closing inline tags and rejects mismatched closing tags', () => {
    const md = new MarkdownIt({ html: true })
    markdownHtml.register(createCtx(md))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const tokens = md.parse('x <br> y </span>', {})
    const children = tokens.find(token => token.type === 'inline')!.children!

    expect(children.some(token => token.type === 'html_self' && token.tag === 'br')).toBe(true)
    expect(children.some(token => token.type === 'html_close' && token.tag === 'span')).toBe(false)
    expect(warn).toHaveBeenCalledWith('html tag not match', undefined, 'span')
  })

  test('parses multi-line html blocks and stops on disabled html or code indentation', () => {
    const md = new MarkdownIt({ html: true })
    markdownHtml.register(createCtx(md))
    const tokens = md.parse('<div\nclass="note">\n<span>ok</span>\n</div>\n\nnext', {})

    expect(tokens.map(token => token.type)).toContain('html_open')
    expect(tokens.find(token => token.type === 'html_end')).toMatchObject({
      hidden: true,
      map: [0, 4],
    })

    const htmlDisabled = new MarkdownIt({ html: false })
    markdownHtml.register(createCtx(htmlDisabled))
    expect(htmlDisabled.parse('<div>off</div>', {}).some(token => token.type === 'html_open')).toBe(false)

    const indented = md.parse('    <div>code</div>', {})
    expect(indented.some(token => token.type === 'html_open')).toBe(false)
  })

  test('rejects incomplete multi-line blocks and blocks with interrupted indentation', () => {
    const md = new MarkdownIt({ html: true })
    markdownHtml.register(createCtx(md))

    expect(md.parse('<div\nclass="note"', {}).some(token => token.type === 'html_end')).toBe(false)
    expect(md.parse('<div>\n\n</div>', {}).some(token => token.type === 'html_end')).toBe(true)
    expect(md.parse('<div\n  class="note"\n</div>', {}).some(token => token.type === 'html_end')).toBe(true)
  })
})
