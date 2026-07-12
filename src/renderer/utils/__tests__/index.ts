import {
  binMd5,
  copyText,
  createTextHighlighter,
  downloadContent,
  downloadDataURL,
  md5,
  strToBase64,
} from '@fe/utils'

const { toastShow } = vi.hoisted(() => ({
  toastShow: vi.fn(),
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: toastShow }),
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string) => `translated:${key}`,
}))

vi.mock('@fe/support/args', () => ({
  FLAG_DEMO: false,
  FLAG_DEBUG: false,
}))

describe('utils index utilities', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    toastShow.mockClear()
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  })

  describe('hash and encoding helpers', () => {
    test('hashes text and binary strings', () => {
      expect(md5('hello')).toBe('5d41402abc4b2a76b9719d911017c592')
      expect(binMd5('hello')).toBe('5d41402abc4b2a76b9719d911017c592')
    })

    test('converts UTF-8 text to base64', () => {
      expect(strToBase64('Yank Note')).toBe('WWFuayBOb3Rl')
      expect(strToBase64('你好')).toBe('5L2g5aW9')
    })
  })

  describe('download helpers', () => {
    test('downloads string content through an anchor and revokes the object URL later', () => {
      vi.useFakeTimers()
      const createObjectURL = vi.fn().mockReturnValue('blob:download')
      const revokeObjectURL = vi.fn()
      Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: createObjectURL })
      Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

      downloadContent('note.txt', 'hello', 'text/plain')

      const blob = createObjectURL.mock.calls[0][0] as Blob
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('text/plain')
      expect(click).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(19999)
      expect(revokeObjectURL).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:download')
    })

    test('converts data URLs before downloading', () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:data-url')
      Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: createObjectURL })
      Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

      downloadDataURL('hello.txt', 'data:text/plain;base64,SGVsbG8=')

      const blob = createObjectURL.mock.calls[0][0] as Blob
      expect(blob.type).toBe('text/plain')
      expect(blob.size).toBe(5)
    })
  })

  describe('copyText', () => {
    test('does nothing for undefined text', () => {
      Object.defineProperty(document, 'execCommand', { configurable: true, value: () => true })
      const execCommand = vi.spyOn(document, 'execCommand').mockReturnValue(true)

      copyText(undefined)

      expect(execCommand).not.toHaveBeenCalled()
      expect(toastShow).not.toHaveBeenCalled()
    })

    test('copies text with a temporary textarea and shows a toast', () => {
      Object.defineProperty(document, 'execCommand', { configurable: true, value: () => true })
      const execCommand = vi.spyOn(document, 'execCommand').mockReturnValue(true)

      copyText('copied text')

      expect(execCommand).toHaveBeenCalledWith('copy')
      expect(document.querySelector('textarea')).toBeNull()
      expect(toastShow).toHaveBeenCalledWith('info', 'translated:copied')
    })
  })

  describe('createTextHighlighter', () => {
    const highlightStore = new Map<string, unknown>()

    const installHighlightApi = (target: typeof globalThis, store: Map<string, unknown>) => {
      const deleteHighlight = vi.fn((name: string) => store.delete(name))
      const setHighlight = vi.fn((name: string, value: unknown) => store.set(name, value))

      Object.defineProperty(target, 'Highlight', {
        configurable: true,
        value: class {
          ranges: Range[]

          constructor (...ranges: Range[]) {
            this.ranges = ranges
          }
        },
      })
      Object.defineProperty(target, 'CSS', {
        configurable: true,
        value: {
          highlights: {
            delete: deleteHighlight,
            set: setHighlight,
          },
        },
      })

      return { deleteHighlight, setHighlight }
    }

    beforeEach(() => {
      highlightStore.clear()
      installHighlightApi(globalThis, highlightStore)
    })

    test('installs styles, highlights text matches, and disposes cleanly', () => {
      const container = document.createElement('div')
      container.textContent = 'Yank Note and yank-note'
      document.body.appendChild(container)

      const highlighter = createTextHighlighter(container, 'search', color => `color: ${color}`)
      const remove = highlighter.highlight('yank')

      const style = document.querySelector('style[data-highlight-name="search"]')
      expect(style?.textContent).toContain('color: light')
      expect(style?.textContent).toContain('color: dark')
      expect((CSS as any).highlights.set).toHaveBeenCalledWith('search', expect.any((globalThis as any).Highlight))
      expect((highlightStore.get('search') as { ranges: Range[] }).ranges).toHaveLength(2)

      remove?.()
      expect((CSS as any).highlights.delete).toHaveBeenLastCalledWith('search')

      highlighter.dispose()
      expect(document.querySelector('style[data-highlight-name="search"]')).toBeNull()
    })

    test('replaces existing styles and skips empty or missing containers', () => {
      document.head.innerHTML = '<style data-highlight-name="search">old</style>'

      const highlighter = createTextHighlighter(() => null, 'search', 'background: yellow')

      expect(document.querySelectorAll('style[data-highlight-name="search"]')).toHaveLength(1)
      highlighter.highlight('   ')
      highlighter.highlight('term')

      expect((CSS as any).highlights.set).not.toHaveBeenCalled()
    })

    test('accepts regular expressions for matching', () => {
      const container = document.createElement('div')
      container.textContent = 'one two three'
      document.body.appendChild(container)

      createTextHighlighter(container, 'words', null).highlight(/t\w+/g)

      expect((highlightStore.get('words') as { ranges: Range[] }).ranges).toHaveLength(2)
    })

    test('moves styles and range highlights to the container document', () => {
      const container = document.createElement('div')
      document.body.appendChild(container)

      const iframe = document.createElement('iframe')
      document.body.appendChild(iframe)
      const iframeWindow = iframe.contentWindow!
      const iframeDocument = iframe.contentDocument!
      const iframeHighlightStore = new Map<string, unknown>()
      const iframeHighlightApi = installHighlightApi(iframeWindow as unknown as typeof globalThis, iframeHighlightStore)
      const iframeContainer = iframeDocument.createElement('div')
      iframeContainer.textContent = 'review text'
      iframeDocument.body.appendChild(iframeContainer)

      let currentContainer = container
      const highlighter = createTextHighlighter(() => currentContainer, 'review', 'background: yellow')
      expect(document.querySelector('style[data-highlight-name="review"]')).not.toBeNull()

      const range = iframeDocument.createRange()
      range.selectNodeContents(iframeContainer)
      currentContainer = iframeContainer
      highlighter.highlightRanges([range])

      expect(document.querySelector('style[data-highlight-name="review"]')).toBeNull()
      expect(iframeDocument.querySelector('style[data-highlight-name="review"]')).not.toBeNull()
      expect(iframeHighlightApi.setHighlight).toHaveBeenCalledWith('review', expect.any((iframeWindow as any).Highlight))
      expect((iframeHighlightStore.get('review') as { ranges: Range[] }).ranges).toEqual([range])

      highlighter.dispose()
      expect(iframeHighlightApi.deleteHighlight).toHaveBeenLastCalledWith('review')
      expect(iframeDocument.querySelector('style[data-highlight-name="review"]')).toBeNull()
      iframe.remove()
      container.remove()
    })
  })
})
