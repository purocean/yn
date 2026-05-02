import { BrowserFindInPreview } from '@fe/others/find-in-preview'

function makeWindow (text: string, found = true) {
  const body = document.createElement('body')
  Object.defineProperty(body, 'innerText', { value: text, configurable: true })
  body.focus = vi.fn()

  return {
    document: { body },
    find: vi.fn(() => found),
  } as any as Window & { find: ReturnType<typeof vi.fn>, document: { body: HTMLElement & { focus: ReturnType<typeof vi.fn> } } }
}

describe('BrowserFindInPreview', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('counts plain-text matches with case sensitivity and navigates browser find', () => {
    const win = makeWindow('Alpha alpha ALPHA beta')
    const finder = new BrowserFindInPreview(win, { wrapAround: true })

    finder.exec('alpha', { caseSensitive: false })
    expect(finder.getStats()).toMatchObject({ count: 3, current: 0, exceed: false })

    expect(finder.next()).toBe(true)
    expect(win.document.body.focus).toHaveBeenCalled()
    expect(win.find).toHaveBeenCalledWith('alpha', false, false, true)
    expect(finder.getStats().current).toBe(1)

    finder.exec('Alpha', { caseSensitive: true })
    expect(finder.getStats()).toMatchObject({ count: 1, current: 0 })

    expect(finder.prev()).toBe(true)
    expect(win.find).toHaveBeenLastCalledWith('Alpha', true, true, true)
    expect(finder.getStats().current).toBe(0)
  })

  test('escapes non-regex patterns and keeps current index on failed plain search', () => {
    const win = makeWindow('a.b a-b', false)
    const finder = new BrowserFindInPreview(win)

    finder.exec('a.b', { regex: false })

    expect(finder.getStats()).toMatchObject({ count: 1, current: 0 })
    expect(finder.next()).toBe(false)
    expect(finder.getStats().current).toBe(0)
  })

  test('uses concrete regex matches while moving through results', () => {
    const win = makeWindow('item-1 item-22 item-333')
    const finder = new BrowserFindInPreview(win)

    finder.exec('item-\\d+', { regex: true })

    expect(finder.getStats()).toMatchObject({ count: 3, current: 0 })
    expect(finder.next()).toBe(true)
    expect(win.find).toHaveBeenLastCalledWith('item-22', false, false, false)
    expect(finder.getStats().current).toBe(1)

    expect(finder.prev()).toBe(true)
    expect(win.find).toHaveBeenLastCalledWith('item-1', false, true, false)
    expect(finder.getStats().current).toBe(0)
  })

  test('short-circuits empty searches and reports max-count/time limits', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const win = makeWindow('x x x x')
    const finder = new BrowserFindInPreview(win, { maxMatchCount: 2 })

    finder.exec('', {})
    expect(finder.getStats()).toMatchObject({ count: 0, current: 0, exceed: false })
    expect(finder.next()).toBe(true)
    expect(win.find).not.toHaveBeenCalled()

    finder.exec('x', {})
    expect(finder.getStats()).toMatchObject({ count: 2, current: 0, exceed: true })
    expect(warn).toHaveBeenCalledWith('BrowserFindInContent: Reached maximum match count of 2.')

    let tick = 0
    vi.spyOn(Date, 'now').mockImplementation(() => tick++ * 10)
    const timed = new BrowserFindInPreview(win, { maxMatchTime: 1 })
    timed.exec('x', {})
    expect(timed.getStats()).toMatchObject({ count: 0, exceed: true })
    expect(warn).toHaveBeenCalledWith('BrowserFindInContent: Reached maximum match time of 1ms.')
  })
})
