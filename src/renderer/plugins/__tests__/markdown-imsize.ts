vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

import MarkdownIt from 'markdown-it'
import markdownImsize from '../markdown-imsize'

function createCtx (md: MarkdownIt) {
  return {
    markdown: {
      registerPlugin: vi.fn((plugin: any, options?: any) => md.use(plugin, options)),
    },
  } as any
}

describe('markdown-imsize plugin', () => {
  test('registers an image parser that adds width and height attributes', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)

    markdownImsize.register(ctx)

    expect(ctx.markdown.registerPlugin).toHaveBeenCalledTimes(1)
    expect(md.render('![alt](photo.png =120x80)')).toContain('<img src="photo.png" alt="alt" width="120" height="80">')
  })

  test('supports single-dimension and percentage image sizes', () => {
    const md = new MarkdownIt()
    markdownImsize.register(createCtx(md))

    const html = md.render('![wide](wide.png =50%x)\n![tall](tall.png =x240)')

    expect(html).toContain('<img src="wide.png" alt="wide" width="50%">')
    expect(html).toContain('<img src="tall.png" alt="tall" height="240">')
  })

  test('falls back to normal image parsing when size syntax is invalid', () => {
    const md = new MarkdownIt()
    markdownImsize.register(createCtx(md))

    const html = md.render('![alt](photo.png =abcx80)')

    expect(html).toContain('<p>![alt](photo.png =abcx80)</p>')
    expect(html).not.toContain('width=')
    expect(html).not.toContain('height=')
  })

  test('keeps reference image behavior while installing the custom rule', () => {
    const md = new MarkdownIt()
    markdownImsize.register(createCtx(md))

    const html = md.render('![Alt][photo]\n\n[photo]: /img.png "Title"')

    expect(html).toContain('<img src="/img.png" alt="Alt" title="Title">')
  })
})
