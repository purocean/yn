import { DOM_ATTR_NAME } from '@fe/support/args'
import { RULE_NAME, wikiLinks } from '../lib'

function createState (src: string, pos = 0) {
  const tokens: any[] = []
  return {
    state: {
      src,
      pos,
      push: vi.fn((type: string, tag: string, nesting: number) => {
        const token = { type, tag, nesting, attrs: undefined, content: '' }
        tokens.push(token)
        return token
      }),
    } as any,
    tokens,
  }
}

describe('markdown-wiki-links lib', () => {
  test('exports the markdown-it rule name', () => {
    expect(RULE_NAME).toBe('wiki-links')
  })

  test('turns a wiki link with hash and label into link tokens', () => {
    const { state, tokens } = createState('[[docs/Page#Intro|Read it]]')

    expect(wikiLinks(state)).toBe(true)

    expect(tokens).toEqual([
      {
        type: 'link_open',
        tag: 'a',
        nesting: 1,
        attrs: [
          ['href', 'docs/Page#Intro'],
          [DOM_ATTR_NAME.WIKI_LINK, 'true'],
        ],
        content: '',
      },
      { type: 'text', tag: '', nesting: 0, attrs: undefined, content: 'Read it' },
      { type: 'link_close', tag: 'a', nesting: -1, attrs: undefined, content: '' },
    ])
    expect(state.pos).toBe('[[docs/Page#Intro|Read it]]'.length)
  })

  test('uses the file name plus position as default text for internal links', () => {
    const { state, tokens } = createState('[[folder/Page:12,3#Heading]]')

    expect(wikiLinks(state)).toBe(true)

    expect(tokens[0].attrs).toEqual([
      ['href', 'folder/Page:12,3#Heading'],
      [DOM_ATTR_NAME.WIKI_LINK, 'true'],
    ])
    expect(tokens[1].content).toBe('Page:12,3#Heading')
  })

  test('marks hash-only wiki links as anchors', () => {
    const { state, tokens } = createState('[[#Heading]]')

    expect(wikiLinks(state)).toBe(true)

    expect(tokens[0].attrs).toEqual([
      ['href', '#Heading'],
      [DOM_ATTR_NAME.WIKI_LINK, 'true'],
      [DOM_ATTR_NAME.IS_ANCHOR, 'true'],
    ])
    expect(tokens[1].content).toBe('Heading')
  })

  test('keeps external URLs as text when no label is provided', () => {
    const { state, tokens } = createState('[[https://example.com/a#part]]')

    expect(wikiLinks(state)).toBe(true)

    expect(tokens[0].attrs).toEqual([
      ['href', 'https://example.com/a#part'],
      [DOM_ATTR_NAME.WIKI_LINK, 'true'],
    ])
    expect(tokens[1].content).toBe('https://example.com/a#part')
  })

  test('turns wiki image syntax into an image token with resource metadata', () => {
    const { state, tokens } = createState('![[assets/pic.png|Alt text]]')

    expect(wikiLinks(state)).toBe(true)

    expect(tokens).toEqual([
      {
        type: 'image',
        tag: 'img',
        nesting: 0,
        attrs: [
          ['src', 'assets/pic.png'],
          [DOM_ATTR_NAME.WIKI_RESOURCE, 'true'],
          ['alt', 'Alt text'],
        ],
        content: '',
      },
    ])
  })

  test('advances without pushing tokens in silent mode', () => {
    const { state, tokens } = createState('[[Page]]')

    expect(wikiLinks(state, true)).toBe(true)

    expect(tokens).toEqual([])
    expect(state.pos).toBe(8)
  })

  test('rejects incomplete or empty wiki link syntax', () => {
    expect(wikiLinks(createState('[Page]').state)).toBe(false)
    expect(wikiLinks(createState('[[]]').state)).toBe(false)
    expect(wikiLinks(createState('[[Page').state)).toBe(false)
  })
})
