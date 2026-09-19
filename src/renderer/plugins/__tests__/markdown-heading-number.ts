vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: vi.fn(),
}))

import MarkdownIt from 'markdown-it'
import markdownHeadingNumber from '../markdown-heading-number'
import { getSetting } from '@fe/services/setting'

function createCtx (md: MarkdownIt) {
  md.renderer.rules.heading_open = function (tokens, idx, options, _env, slf) {
    return slf.renderToken(tokens, idx, options)
  }

  return {
    theme: { addStyles: vi.fn() },
    view: { addStyles: vi.fn() },
    markdown: {
      registerPlugin: vi.fn((plugin: any, options?: any) => md.use(plugin, options)),
    },
  } as any
}

const mockedGetSetting = vi.mocked(getSetting)

beforeEach(() => {
  mockedGetSetting.mockReset()
})

describe('markdown-heading-number plugin', () => {
  test('registers theme/view styles and markdown renderer plugin', () => {
    const ctx = createCtx(new MarkdownIt())

    markdownHeadingNumber.register(ctx)

    expect(ctx.theme.addStyles).toHaveBeenCalledWith(expect.stringContaining('.outline-toc'))
    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('h2.show-number:before'))
    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
  })

  test('adds show-number class when front matter enables heading numbers', () => {
    mockedGetSetting.mockReturnValue(false)
    const md = new MarkdownIt()
    markdownHeadingNumber.register(createCtx(md))

    expect(md.render('## Numbered', { attributes: { headingNumber: true } })).toContain('<h2 class="show-number">Numbered</h2>')
  })

  test('falls back to global setting when front matter does not set heading number', () => {
    mockedGetSetting.mockReturnValue(true)
    const md = new MarkdownIt()
    markdownHeadingNumber.register(createCtx(md))

    expect(md.render('## Fallback', {})).toContain('<h2 class="show-number">Fallback</h2>')
  })

  test('leaves headings unchanged when heading numbers are disabled', () => {
    mockedGetSetting.mockReturnValue(false)
    const md = new MarkdownIt()
    markdownHeadingNumber.register(createCtx(md))

    expect(md.render('## Plain', { attributes: { headingNumber: false } })).toContain('<h2>Plain</h2>')
  })

  test('preserves existing heading classes while adding numbering class', () => {
    const md = new MarkdownIt({ html: true })
    markdownHeadingNumber.register(createCtx(md))

    const token = new md.core.State('## Title', md, { attributes: { headingNumber: true } }).Token
    const tokens = [new token('heading_open', 'h2', 1)]
    tokens[0].attrSet('class', 'existing')
    const slf = { renderToken: vi.fn(() => '<h2 class="existing show-number">') }

    md.renderer.rules.heading_open!(tokens as any, 0, {}, { attributes: { headingNumber: true } }, slf as any)

    expect(tokens[0].attrGet('class')).toBe('existing show-number')
  })
})
