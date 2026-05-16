import { hashTags, isTagToken, RE_MATCH, RULE_NAME } from '../lib'

function createState (src: string, pos = 0) {
  const tokens: any[] = []
  return {
    state: {
      src,
      pos,
      push: vi.fn((type: string, tag: string, nesting: number) => {
        const token = { type, tag, nesting, markup: '', content: '' }
        tokens.push(token)
        return token
      }),
    } as any,
    tokens,
  }
}

describe('markdown-hashtags lib', () => {
  test('exports the markdown-it rule name and reusable match pattern', () => {
    expect(RULE_NAME).toBe('hash-tags')
    expect('#tag'.match(RE_MATCH)?.[1]).toBe('#tag')
    expect('#中文/a_1'.match(RE_MATCH)?.[1]).toBe('#中文/a_1')
  })

  test('pushes a hash_tag token and advances parser position for a valid tag', () => {
    const { state, tokens } = createState('hello #tag-name/rest next', 6)

    expect(hashTags(state)).toBe(true)

    expect(state.push).toHaveBeenCalledWith('hash_tag', 'span', 0)
    expect(tokens).toEqual([
      {
        type: 'hash_tag',
        tag: 'span',
        nesting: 0,
        markup: '#',
        content: '#tag-name/rest',
      },
    ])
    expect(state.pos).toBe(20)
    expect(isTagToken(tokens[0])).toBe(true)
  })

  test('accepts tags after whitespace and does not push tokens in silent mode', () => {
    const { state, tokens } = createState('line\n#中文_1', 5)

    expect(hashTags(state, true)).toBe(true)

    expect(tokens).toEqual([])
    expect(state.pos).toBe(10)
  })

  test('rejects non-tags, embedded tags, and tags without a letter-like first character', () => {
    expect(hashTags(createState('plain text').state)).toBe(false)
    expect(hashTags(createState('word#tag', 4).state)).toBe(false)
    expect(hashTags(createState('#123').state)).toBe(false)
    expect(isTagToken({ type: 'text' } as any)).toBe(false)
  })
})
