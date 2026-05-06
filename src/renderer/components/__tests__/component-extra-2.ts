import { nextTick } from 'vue'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'

const extension = (overrides: any = {}) => ({
  id: 'extra-two',
  displayName: 'Extra Two',
  version: '1.0.0',
  description: 'Extra branch extension',
  icon: '',
  origin: 'official',
  author: { name: 'Yank Note' },
  installed: false,
  enabled: false,
  compatible: { value: true, reason: '' },
  requirements: { premium: false, terminal: false },
  dist: { unpackedSize: 0 },
  homepage: 'https://example.test/extra-two',
  license: '',
  readmeUrl: 'https://example.test/readme.md',
  changelogUrl: 'https://example.test/changelog.md',
  isDev: false,
  ...overrides,
})

const mocks = vi.hoisted(() => ({
  actions: new Map<string, Function>(),
  storeState: undefined as any,
  search: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  toggleSide: vi.fn(),
  showSettingPanel: vi.fn(),
  switchDoc: vi.fn(),
  editorHighlightLine: vi.fn(),
  viewHighlightLine: vi.fn(),
  setSelection: vi.fn(),
  editorFocus: vi.fn(),
  toastShow: vi.fn(),
  modalConfirm: vi.fn(),
  registryExtensions: [] as any[],
  installedExtensions: [] as any[],
  registryVersions: [] as any[],
  loadStatus: {} as Record<string, any>,
  getRegistryExtensions: vi.fn(),
  getInstalledExtensions: vi.fn(),
  getRegistryExtensionVersions: vi.fn(),
  installExtension: vi.fn(),
  uninstallExtension: vi.fn(),
  enableExtension: vi.fn(),
  disableExtension: vi.fn(),
  abortInstallation: vi.fn(),
  proxyFetch: vi.fn(),
  contextMenuShow: vi.fn(),
  reloadMainWindow: vi.fn(),
  getPurchased: vi.fn(),
  showPremium: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
  open: vi.fn(),
}))

vi.mock('lodash-es', async () => {
  const actual: any = await vi.importActual('lodash-es')
  return {
    ...actual,
    debounce: (fn: any) => fn,
    throttle: (fn: any) => fn,
  }
})

vi.mock('@fe/services/i18n', () => ({
  getCurrentLanguage: () => 'en',
  useI18n: () => ({
    t: (key: string, value?: string) => value ? `${key}:${value}` : key,
    $t: { value: (key: string, value?: string) => value ? `${key}:${value}` : key },
  }),
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  sleep: vi.fn(() => Promise.resolve()),
}))

vi.mock('@fe/utils/path', () => ({
  basename: (path: string) => path.split('/').filter(Boolean).pop() || '',
  dirname: (path: string) => path.split('/').slice(0, -1).join('/') || '/',
  join: (...args: string[]) => args.join('/').replace(/\/+/g, '/'),
  relative: (from: string, to: string) => to.replace(new RegExp(`^${from}/?`), ''),
}))

vi.mock('@fe/support/store', () => ({
  default: { get state () { return mocks.storeState } },
}))

vi.mock('@fe/support/api', () => ({
  search: mocks.search,
  readFile: mocks.readFile,
  writeFile: mocks.writeFile,
  proxyFetch: mocks.proxyFetch,
}))

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action.handler),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/core/keybinding', () => ({ CtrlCmd: 'Cmd', Shift: 'Shift' }))
vi.mock('@fe/utils/composable', () => ({ useLazyRef: (source: any) => source }))

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
  highlightLine: mocks.viewHighlightLine,
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: mocks.getSetting,
  setSetting: mocks.setSetting,
  showSettingPanel: mocks.showSettingPanel,
}))

vi.mock('@fe/services/layout', () => ({
  toggleSide: mocks.toggleSide,
}))

vi.mock('@share/misc', () => ({
  isEncryptedMarkdownFile: (path: string) => path.endsWith('.enc.md'),
  isMarkdownFile: (path: string | { path: string }) => (typeof path === 'string' ? path : path.path).endsWith('.md'),
}))

vi.mock('@fe/others/extension', () => ({
  registries: ['registry.npmjs.org', 'registry.npmmirror.com'],
  getRegistryExtensions: mocks.getRegistryExtensions,
  getInstalledExtensions: mocks.getInstalledExtensions,
  getRegistryExtensionVersions: mocks.getRegistryExtensionVersions,
  getLoadStatus: (id: string) => mocks.loadStatus[id] || {},
  install: mocks.installExtension,
  uninstall: mocks.uninstallExtension,
  enable: mocks.enableExtension,
  disable: mocks.disableExtension,
  abortInstallation: mocks.abortInstallation,
}))

vi.mock('@fe/services/base', () => ({
  reloadMainWindow: mocks.reloadMainWindow,
}))

vi.mock('@fe/support/ui/context-menu', () => ({
  useContextMenu: () => ({ show: mocks.contextMenuShow }),
}))

vi.mock('@fe/others/premium', () => ({
  getPurchased: mocks.getPurchased,
  showPremium: mocks.showPremium,
}))

vi.mock('@fe/support/args', () => ({
  FLAG_DISABLE_XTERM: true,
  FLAG_MAS: false,
  URL_MAS_LIMITATION: 'https://example.test/mas',
}))

vi.mock('../Mask.vue', () => ({
  default: { name: 'XMask', props: ['show'], emits: ['close'], template: '<div v-if="show !== false"><slot /></div>' },
}))

vi.mock('../GroupTabs.vue', () => ({
  default: {
    name: 'GroupTabs',
    props: ['tabs', 'modelValue'],
    emits: ['update:modelValue'],
    template: '<div><button v-for="tab in tabs" class="tab" @click="$emit(\'update:modelValue\', tab.value)">{{tab.label}}</button></div>',
  },
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i class="svg-icon">{{name}}</i>' },
}))

import SearchPanel from '../SearchPanel.vue'
import ExtensionManager from '../ExtensionManager.vue'

const mountSearch = (full = false) => (full ? mount : shallowMount)(SearchPanel, {
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

const mountManager = () => mount(ExtensionManager, {
  global: {
    mocks: { $t: (key: string, value?: string) => value ? `${key}:${value}` : key },
  },
})

beforeEach(() => {
  vi.useRealTimers()
  Element.prototype.scrollIntoViewIfNeeded = vi.fn()
  window.open = mocks.open
  mocks.storeState = {
    currentRepo: { name: 'repo', path: '/repo' },
  }
  mocks.actions.clear()
  Object.values(mocks).forEach((value: any) => {
    if (value?.mockReset) value.mockReset()
  })
  mocks.search.mockResolvedValue(async () => ({ limitHit: false }))
  mocks.readFile.mockResolvedValue({ writeable: true, content: '', hash: 'hash' })
  mocks.writeFile.mockResolvedValue(undefined)
  mocks.modalConfirm.mockResolvedValue(true)
  mocks.registryExtensions = []
  mocks.installedExtensions = []
  mocks.registryVersions = []
  mocks.loadStatus = {}
  mocks.getRegistryExtensions.mockImplementation(() => Promise.resolve(mocks.registryExtensions))
  mocks.getInstalledExtensions.mockImplementation(() => Promise.resolve(mocks.installedExtensions))
  mocks.getRegistryExtensionVersions.mockImplementation(() => Promise.resolve(mocks.registryVersions))
  mocks.installExtension.mockResolvedValue(undefined)
  mocks.uninstallExtension.mockResolvedValue(undefined)
  mocks.enableExtension.mockResolvedValue(undefined)
  mocks.disableExtension.mockResolvedValue(undefined)
  mocks.abortInstallation.mockResolvedValue(undefined)
  mocks.proxyFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('# ok') })
  mocks.getPurchased.mockReturnValue(false)
  mocks.getSetting.mockImplementation((key: string, fallback: any) => {
    if (key === 'extension.auto-upgrade') return false
    return fallback
  })
})

describe('component-extra-2 branch coverage', () => {
  test('SearchPanel builds multiline limited regex queries and opens limit settings', async () => {
    mocks.getSetting.mockImplementation((key: string, fallback: any) => {
      if (key === 'search.number-limit') return 5000
      return fallback
    })
    mocks.search.mockResolvedValue(async (onData: any, onMessage: any) => {
      onMessage({ message: 'regex engine error\n~~~~~~~~~~~~' })
      onData([
        {
          path: '/repo/docs/a.md',
          numMatches: 1,
          results: [{
            preview: {
              text: 'before\nfoo\nbar\nafter',
              matches: [{ startLineNumber: 1, endLineNumber: 2, startColumn: 0, endColumn: 3 }],
            },
            ranges: [{ startLineNumber: 1, endLineNumber: 2, startColumn: 0, endColumn: 3 }],
          }],
        },
      ])
      return { limitHit: true }
    })

    const wrapper = mountSearch(true)
    ;(wrapper.vm as any).visible = true
    ;(wrapper.vm as any).option.isRegExp = true
    ;(wrapper.vm as any).pattern = 'foo\nbar'
    ;(wrapper.vm as any).include = './docs/, /notes\\daily'
    ;(wrapper.vm as any).exclude = 'tmp/'

    await (wrapper.vm as any).search()
    await nextTick()

    const query = mocks.search.mock.calls[0][1]
    expect(query.contentPattern).toMatchObject({
      pattern: 'foo\\nbar',
      isRegExp: true,
      isMultiline: true,
    })
    expect(query.maxResults).toBe(2000)
    expect(query.folderQueries[0].includePattern).toEqual({
      '**/docs/**': true,
      '**/docs': true,
      '**/notes/daily/**': true,
      '**/notes/daily': true,
    })
    expect(query.folderQueries[0].excludePattern).toEqual({
      '**/tmp/**': true,
      '**/tmp': true,
    })
    expect(wrapper.text()).toContain('regex engine error')

    ;(wrapper.vm as any).outputMessage = ''
    await nextTick()
    expect(wrapper.text()).toContain('limited')

    await wrapper.find('.message a').trigger('click')
    expect(mocks.showSettingPanel).toHaveBeenCalledWith('search.number-limit')
  })

  test('SearchPanel catches search failures, handles empty pattern, and renders replace previews', async () => {
    const wrapper = mountSearch()
    ;(wrapper.vm as any).visible = true
    ;(wrapper.vm as any).pattern = ''
    ;(wrapper.vm as any).result = [{ path: '/old.md', open: true, numMatches: 1, results: [] }]

    await (wrapper.vm as any).search()
    expect((wrapper.vm as any).result).toEqual([])

    mocks.search.mockRejectedValueOnce(new Error('ripgrep failed'))
    ;(wrapper.vm as any).pattern = 'x'
    await expect((wrapper.vm as any).search()).resolves.toBeUndefined()
    expect((wrapper.vm as any).loading).toBe(false)

    ;(wrapper.vm as any).isReplaceVisible = true
    ;(wrapper.vm as any).option.isCaseSensitive = false
    ;(wrapper.vm as any).pattern = 'hello'
    ;(wrapper.vm as any).replaceText = 'bye'
    await (wrapper.vm as any).buildReplaceRegex()
    ;(wrapper.vm as any).result = [{
      repo: 'repo',
      path: '/preview.md',
      open: true,
      numMatches: 1,
      results: [{
        key: 'preview',
        preview: {
          text: `${'a'.repeat(40)}\nhello world\n${'b'.repeat(320)}`,
          matches: [{ startLineNumber: 1, endLineNumber: 1, startColumn: 0, endColumn: 5 }],
        },
        ranges: [{ startLineNumber: 1, endLineNumber: 1, startColumn: 0, endColumn: 5 }],
      }],
    }]
    await nextTick()
    expect(wrapper.find('del').text()).toBe('hello')
    expect(wrapper.find('ins').text()).toBe('bye')
  })

  test('SearchPanel replace all covers no files, confirm cancel, invalid regex, and case-insensitive replacements', async () => {
    const wrapper = mountSearch()
    ;(wrapper.vm as any).visible = true
    ;(wrapper.vm as any).isReplaceVisible = true
    ;(wrapper.vm as any).pattern = 'missing'
    mocks.search.mockResolvedValueOnce(async () => ({ limitHit: false }))

    await (wrapper.vm as any).replaceAll()
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'No files to replace')

    mocks.search.mockResolvedValueOnce(async (onData: any) => {
      onData([{ path: '/repo/a.md', numMatches: 1, results: [{ preview: { text: 'a', matches: [] }, ranges: [] }] }])
      return { limitHit: false }
    })
    mocks.modalConfirm.mockResolvedValueOnce(false)
    await (wrapper.vm as any).replaceAll()
    expect(mocks.readFile).not.toHaveBeenCalled()

    ;(wrapper.vm as any).option.isRegExp = true
    ;(wrapper.vm as any).pattern = '['
    mocks.search.mockResolvedValueOnce(async (onData: any) => {
      onData([{ path: '/repo/a.md', numMatches: 1, results: [{ preview: { text: 'a', matches: [] }, ranges: [] }] }])
      return { limitHit: false }
    })
    mocks.modalConfirm.mockResolvedValueOnce(true)
    await (wrapper.vm as any).replaceAll()
    expect(mocks.readFile).not.toHaveBeenCalled()

    ;(wrapper.vm as any).option.isRegExp = false
    ;(wrapper.vm as any).option.isCaseSensitive = false
    ;(wrapper.vm as any).pattern = 'hello'
    ;(wrapper.vm as any).replaceText = 'bye'
    mocks.search.mockResolvedValueOnce(async (onData: any) => {
      onData([{ path: '/repo/a.md', numMatches: 2, results: [{ preview: { text: 'Hello hello', matches: [] }, ranges: [] }] }])
      return { limitHit: false }
    })
    mocks.modalConfirm.mockResolvedValueOnce(true)
    mocks.readFile.mockResolvedValueOnce({ writeable: true, content: 'Hello hello', hash: 'h1' })

    await (wrapper.vm as any).replaceAll()
    expect(mocks.writeFile).toHaveBeenCalledWith({ repo: 'repo', path: '/a.md', contentHash: 'h1' }, 'bye bye')

    ;(wrapper.vm as any).loading = true
    await (wrapper.vm as any).replaceAll()
    expect(mocks.search).toHaveBeenCalledTimes(4)
  })

  test('ExtensionManager handles content fallbacks, terminal requirements, and error toasts', async () => {
    mocks.registryExtensions = [
      extension({
        id: 'terminal-ext',
        displayName: 'Terminal Extension',
        requirements: { premium: false, terminal: true },
        dist: { unpackedSize: 2097152 },
      }),
    ]
    const wrapper = mountManager()
    await mocks.actions.get('extension.show-manager')?.('terminal-ext')
    await flushPromises()

    mocks.modalConfirm.mockResolvedValueOnce(true)
    await expect((wrapper.vm as any).installLatest((wrapper.vm as any).currentExtension)).rejects.toThrow('Extension requires xterm')
    expect(mocks.open).toHaveBeenCalledWith('https://example.test/mas')
    expect(mocks.installExtension).not.toHaveBeenCalled()

    ;(wrapper.vm as any).contentMap.readme = {}
    mocks.proxyFetch.mockResolvedValueOnce({ ok: false, statusText: 'missing', text: () => Promise.resolve('ignored') })
    await (wrapper.vm as any).fetchContent('readme', (wrapper.vm as any).currentExtension)
    expect((wrapper.vm as any).contentMap.readme['terminal-ext']).toContain('No Content')

    ;(wrapper.vm as any).contentMap.readme = {}
    mocks.proxyFetch.mockRejectedValueOnce(new Error('readme down'))
    await expect((wrapper.vm as any).fetchContent('readme', (wrapper.vm as any).currentExtension)).rejects.toThrow('readme down')
    expect((wrapper.vm as any).contentMap.readme['terminal-ext']).toBeNull()
    await nextTick()
    expect(wrapper.text()).toContain('https://www.npmjs.com/package/terminal-ext')

    ;(wrapper.vm as any).contentMap.changelog = {}
    mocks.proxyFetch.mockRejectedValueOnce(new Error('changelog down'))
    await expect((wrapper.vm as any).fetchContent('changelog', (wrapper.vm as any).currentExtension)).rejects.toThrow('changelog down')
    expect((wrapper.vm as any).contentMap.changelog['terminal-ext']).toBe('changelog down')

    mocks.installExtension.mockRejectedValueOnce(new Error('install failed'))
    await expect((wrapper.vm as any).install(extension())).rejects.toThrow('install failed')
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'install failed')

    mocks.uninstallExtension.mockRejectedValueOnce(new Error('remove failed'))
    await expect((wrapper.vm as any).uninstall(extension({ installed: true, enabled: true }))).rejects.toThrow('remove failed')
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'remove failed')

    mocks.enableExtension.mockClear()
    await (wrapper.vm as any).enable()
    await (wrapper.vm as any).disable()
    await (wrapper.vm as any).install()
    await (wrapper.vm as any).showInstallVersionMenu(new MouseEvent('contextmenu'))
    expect(mocks.enableExtension).not.toHaveBeenCalled()
  })

  test('ExtensionManager auto-upgrades compatible installed extensions and skips guarded candidates', async () => {
    mocks.getSetting.mockImplementation((key: string, fallback: any) => {
      if (key === 'extension.auto-upgrade') return true
      return fallback
    })
    mocks.registryExtensions = [
      extension({ id: 'updatable', version: '2.0.0' }),
      extension({ id: 'dev-ext', version: '2.0.0' }),
      extension({ id: 'blocked-ext', version: '2.0.0', compatible: { value: false, reason: 'blocked' } }),
    ]
    mocks.installedExtensions = [
      extension({ id: 'updatable', version: '1.0.0', installed: true, enabled: true }),
      extension({ id: 'dev-ext', version: '1.0.0', installed: true, enabled: true, isDev: true }),
      extension({ id: 'blocked-ext', version: '1.0.0', installed: true, enabled: true }),
    ]

    const wrapper = mountManager()
    await flushPromises()

    expect(mocks.installExtension).toHaveBeenCalledTimes(1)
    expect(mocks.installExtension).toHaveBeenCalledWith(expect.objectContaining({ id: 'updatable' }), 'registry.npmjs.org')
    expect(mocks.toastShow).toHaveBeenCalledWith('info', 'extension.extensions-auto-upgraded:1')
    expect((wrapper.vm as any).currentExtension.id).toBe('updatable')

    await (wrapper.vm as any).triggerAutoUpgrade()
    expect(mocks.installExtension).toHaveBeenCalledTimes(2)
  })
})
