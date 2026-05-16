import { nextTick, ref } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: {
    currentRepo: { name: 'repo', path: '/repo' },
  } as any,
  search: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  switchDoc: vi.fn(),
  highlightLine: vi.fn(),
  editorHighlightLine: vi.fn(),
  setSelection: vi.fn(),
  editorFocus: vi.fn(),
  toastShow: vi.fn(),
  modalConfirm: vi.fn(),
  showSettingPanel: vi.fn(),
  registerAction: vi.fn(),
  removeAction: vi.fn(),
}))

vi.mock('@fe/support/store', () => ({
  default: { state: mocks.storeState },
}))

vi.mock('@fe/support/api', () => ({
  search: mocks.search,
  readFile: mocks.readFile,
  writeFile: mocks.writeFile,
}))

vi.mock('@fe/core/action', () => ({
  registerAction: mocks.registerAction,
  removeAction: mocks.removeAction,
}))

vi.mock('@fe/core/keybinding', () => ({
  CtrlCmd: 'Cmd',
  Shift: 'Shift',
}))

vi.mock('@fe/utils/composable', () => ({
  useLazyRef: (source: any) => source,
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => ({ debug: vi.fn(), error: vi.fn() }),
  sleep: vi.fn(() => Promise.resolve()),
}))

vi.mock('@fe/utils/path', () => ({
  basename: (path: string) => path.split('/').filter(Boolean).pop() || '',
  dirname: (path: string) => path.split('/').slice(0, -1).join('/') || '/',
  join: (...args: string[]) => args.join('/').replace(/\/+/g, '/'),
  relative: (from: string, to: string) => to.replace(new RegExp(`^${from}/?`), ''),
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow }),
}))

vi.mock('@fe/support/ui/modal', () => ({
  useModal: () => ({ confirm: mocks.modalConfirm }),
}))

vi.mock('@fe/services/document', () => ({
  switchDoc: mocks.switchDoc,
}))

vi.mock('@fe/services/editor', () => ({
  isDefault: () => true,
  highlightLine: mocks.editorHighlightLine,
  getEditor: () => ({
    setSelection: mocks.setSelection,
    focus: mocks.editorFocus,
  }),
}))

vi.mock('@fe/services/view', () => ({
  highlightLine: mocks.highlightLine,
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({ t: (key: string, value?: string) => value ? `${key}:${value}` : key }),
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: (_key: string, fallback: any) => fallback,
  showSettingPanel: mocks.showSettingPanel,
}))

vi.mock('@fe/services/layout', () => ({
  toggleSide: vi.fn(),
}))

vi.mock('@share/misc', () => ({
  isEncryptedMarkdownFile: (path: string) => path.endsWith('.enc.md'),
  isMarkdownFile: (path: string | { path: string }) => (typeof path === 'string' ? path : path.path).endsWith('.md'),
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', template: '<i class="svg-icon" />' },
}))

import SearchPanel from '../SearchPanel.vue'

const mountPanel = () => shallowMount(SearchPanel, {
  global: {
    mocks: { $t: (key: string) => key },
    directives: {
      upDownHistory: {},
      placeholder: {},
      autoResize: {},
      textareaOnEnter: {},
    },
    stubs: { transition: false },
  },
})

beforeEach(() => {
  vi.useRealTimers()
  mocks.storeState.currentRepo = { name: 'repo', path: '/repo' }
  mocks.search.mockReset()
  mocks.readFile.mockReset()
  mocks.writeFile.mockReset()
  mocks.switchDoc.mockReset()
  mocks.highlightLine.mockReset()
  mocks.editorHighlightLine.mockReset()
  mocks.setSelection.mockReset()
  mocks.editorFocus.mockReset()
  mocks.toastShow.mockReset()
  mocks.modalConfirm.mockReset()
  mocks.registerAction.mockClear()
  mocks.removeAction.mockClear()
})

describe('SearchPanel', () => {
  test('searches current repository and renders grouped matches', async () => {
    mocks.search.mockResolvedValue(async (onData: any) => {
      onData([
        {
          path: '/repo/docs/a.md',
          numMatches: 1,
          results: [
            {
              preview: {
                text: 'hello world',
                matches: [{ startLineNumber: 0, endLineNumber: 0, startColumn: 0, endColumn: 5 }],
              },
              ranges: [{ startLineNumber: 2, endLineNumber: 2, startColumn: 1, endColumn: 6 }],
            },
          ],
        },
      ])
      return { limitHit: false }
    })

    const wrapper = mountPanel()
    ;(wrapper.vm as any).visible = true
    ;(wrapper.vm as any).pattern = 'hello'
    ;(wrapper.vm as any).include = 'docs'
    ;(wrapper.vm as any).exclude = 'drafts'

    await (wrapper.vm as any).search()
    await nextTick()

    expect(mocks.search).toHaveBeenCalledTimes(1)
    const query = mocks.search.mock.calls[0][1]
    expect(query.contentPattern.pattern).toBe('hello')
    expect(query.folderQueries[0].includePattern).toEqual({
      '**/docs/**': true,
      '**/docs': true,
    })
    expect(query.folderQueries[0].excludePattern).toEqual({
      '**/drafts/**': true,
      '**/drafts': true,
    })
    await nextTick()
    expect(wrapper.find('.item-name').text()).toBe('a.md')
    expect(wrapper.find('.item-badge').text()).toBe('1')
    expect(wrapper.text()).toContain('1 results in 1 files')
  })

  test('toggles options, handles missing repositories, and opens matches', async () => {
    const wrapper = mountPanel()
    ;(wrapper.vm as any).visible = true
    ;(wrapper.vm as any).pattern = 'hello'
    await nextTick()

    await wrapper.findAll('.option-btn')[0].trigger('click')
    expect((wrapper.vm as any).option.isCaseSensitive).toBe(true)
    expect(mocks.search).toHaveBeenCalled()

    mocks.storeState.currentRepo = undefined
    await (wrapper.vm as any).search()
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'Please choose a repository first')

    await (wrapper.vm as any).chooseMatch(
      { repo: 'repo', path: '/docs/a.md' },
      { key: 'k1', ranges: [{ startLineNumber: 0, endLineNumber: 0, startColumn: 2, endColumn: 7 }] },
      0,
    )

    expect(mocks.switchDoc).toHaveBeenCalledWith({ type: 'file', repo: 'repo', path: '/docs/a.md', name: 'a.md' })
    expect(mocks.setSelection).toHaveBeenCalledWith({
      startLineNumber: 1,
      startColumn: 3,
      endLineNumber: 1,
      endColumn: 8,
    })
    expect(mocks.highlightLine).toHaveBeenCalledWith(1, true, 1000)
  })

  test('replaces all markdown matches and records per-file statuses', async () => {
    mocks.search.mockResolvedValue(async (onData: any) => {
      onData([
        { path: '/repo/a.md', numMatches: 1, results: [{ preview: { text: 'a', matches: [] }, ranges: [] }] },
        { path: '/repo/b.txt', numMatches: 1, results: [{ preview: { text: 'b', matches: [] }, ranges: [] }] },
      ])
      return { limitHit: false }
    })
    mocks.modalConfirm.mockResolvedValue(true)
    mocks.readFile.mockResolvedValue({ writeable: true, content: 'hello hello', hash: 'h1' })

    const wrapper = mountPanel()
    ;(wrapper.vm as any).visible = true
    ;(wrapper.vm as any).isReplaceVisible = true
    ;(wrapper.vm as any).option.isCaseSensitive = true
    ;(wrapper.vm as any).pattern = 'hello'
    ;(wrapper.vm as any).replaceText = 'bye'
    await nextTick()

    await (wrapper.vm as any).replaceAll()
    await nextTick()

    expect(mocks.writeFile).toHaveBeenCalledWith({ repo: 'repo', path: '/a.md', contentHash: 'h1' }, 'bye bye')
    expect((wrapper.vm as any).replaceResult['/a.md'].status).toBe('done')
    expect((wrapper.vm as any).replaceResult['/b.txt'].status).toBe('error')
  })

  test('opens from registered action, reports regex messages, limit hits, and expand state', async () => {
    mocks.search.mockResolvedValue(async (onData: any, onMessage: any) => {
      onMessage({ message: 'regex engine error\n~~~~~~~~~~~~' })
      onData([
        {
          path: '/repo/docs/nested/a.md',
          numMatches: 2,
          results: [
            {
              preview: {
                text: 'first\nhello world\nlast',
                matches: [{ startLineNumber: 1, endLineNumber: 1, startColumn: 0, endColumn: 5 }],
              },
              ranges: [{ startLineNumber: 1, endLineNumber: 1, startColumn: 0, endColumn: 5 }],
            },
          ],
        },
      ])
      return { limitHit: true }
    })

    const wrapper = mountPanel()
    const action = mocks.registerAction.mock.calls.find(([item]) => item.name === 'base.find-in-repository')![0]

    action.handler({
      pattern: 'hello\\Wworld',
      caseSensitive: false,
      wholeWord: true,
      regExp: true,
      include: './docs\\nested/',
      exclude: '/tmp/',
    })
    await nextTick()
    await flushPromises()

    expect(mocks.search).toHaveBeenCalled()
    const query = mocks.search.mock.calls[0][1]
    expect(query.contentPattern).toMatchObject({
      pattern: 'hello\\Wworld',
      isRegExp: true,
      isWordMatch: true,
      isCaseSensitive: false,
      isMultiline: true,
    })
    expect(query.folderQueries[0].includePattern).toEqual({
      '**/docs/nested/**': true,
      '**/docs/nested': true,
    })
    expect(query.folderQueries[0].excludePattern).toEqual({
      '**/tmp/**': true,
      '**/tmp': true,
    })
    expect(wrapper.find('.message').text()).toContain('regex engine error')

    ;(wrapper.vm as any).toggleExpandAll(false)
    expect((wrapper.vm as any).result.every((item: any) => !item.open)).toBe(true)
    ;(wrapper.vm as any).toggleExpandAll()
    expect((wrapper.vm as any).result.every((item: any) => item.open)).toBe(true)

  })

  test('handles empty search, replacement previews, no-result replace, cancel, and invalid regex', async () => {
    const wrapper = mountPanel()
    ;(wrapper.vm as any).visible = true
    ;(wrapper.vm as any).pattern = ''
    await (wrapper.vm as any).search()
    expect((wrapper.vm as any).result).toEqual([])

    ;(wrapper.vm as any).isReplaceVisible = true
    ;(wrapper.vm as any).pattern = '['
    ;(wrapper.vm as any).option.isRegExp = true
    await nextTick()
    await (wrapper.vm as any).replaceAll()
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'No files to replace')

    mocks.search.mockResolvedValue(async (onData: any) => {
      onData([
        {
          path: '/repo/a.md',
          numMatches: 1,
          results: [{
            preview: {
              text: 'prefix hello suffix',
              matches: [{ startLineNumber: 0, endLineNumber: 0, startColumn: 7, endColumn: 12 }],
            },
            ranges: [{ startLineNumber: 0, endLineNumber: 0, startColumn: 7, endColumn: 12 }],
          }],
        },
      ])
      return { limitHit: false }
    })
    mocks.modalConfirm.mockResolvedValue(false)
    ;(wrapper.vm as any).pattern = 'hello'
    ;(wrapper.vm as any).replaceText = 'bye'
    ;(wrapper.vm as any).option.isRegExp = false
    ;(wrapper.vm as any).option.isWordMatch = false
    ;(wrapper.vm as any).option.isCaseSensitive = true
    await (wrapper.vm as any).replaceAll()
    expect(mocks.modalConfirm).toHaveBeenCalled()
    expect(mocks.writeFile).not.toHaveBeenCalled()

    const fragments = (wrapper.vm as any).markText('prefix hello suffix', [
      { startLineNumber: 0, endLineNumber: 0, startColumn: 7, endColumn: 12 },
    ])
    expect(fragments).toEqual(expect.arrayContaining([
      { type: 'del', value: 'hello' },
      { type: 'ins', value: 'bye' },
    ]))

    ;(wrapper.vm as any).replacing = true
    ;(wrapper.vm as any).close()
    expect((wrapper.vm as any).visible).toBe(true)
    ;(wrapper.vm as any).replacing = false
    ;(wrapper.vm as any).close()
    expect((wrapper.vm as any).visible).toBe(false)
  })
})
