import { fuzzyMatch } from '@fe/others/fuzzy-match'

describe('fuzzyMatch', () => {
  test('matches a contiguous pattern case-insensitively', () => {
    expect(fuzzyMatch('abc', 'abc')).toStrictEqual({
      matched: true,
      score: 145,
    })

    expect(fuzzyMatch('yn', 'Yank Note').matched).toBe(true)
  })

  test('returns an unmatched zero score when the pattern cannot be found in order', () => {
    expect(fuzzyMatch('acb', 'abc')).toStrictEqual({
      matched: false,
      score: 0,
    })
  })

  test('scores better matches higher than sparse matches', () => {
    const contiguous = fuzzyMatch('abc', 'abc')
    const sparse = fuzzyMatch('abc', 'a---b---c')

    expect(contiguous.matched).toBe(true)
    expect(sparse.matched).toBe(true)
    expect(contiguous.score).toBeGreaterThan(sparse.score)
  })

  test('rewards separator and camel-case boundaries', () => {
    const separated = fuzzyMatch('bc', 'foo_bar cat')
    const camel = fuzzyMatch('fb', 'fooBar')
    const flat = fuzzyMatch('fb', 'foobaz')

    expect(separated.matched).toBe(true)
    expect(camel.matched).toBe(true)
    expect(flat.matched).toBe(true)
    expect(separated.score).toBeGreaterThan(flat.score)
    expect(camel.score).toBeGreaterThan(flat.score)
  })

  test('caps leading-letter penalty after the first few unmatched characters', () => {
    const shortPrefix = fuzzyMatch('abc', 'xxxabc')
    const longPrefix = fuzzyMatch('abc', 'xxxxxxxxabc')

    expect(shortPrefix.score).toBe(112)
    expect(longPrefix.score).toBe(107)
  })
})
