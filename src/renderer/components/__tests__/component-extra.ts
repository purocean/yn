import { nextTick, reactive } from 'vue'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'

const extension = (overrides: any = {}) => ({
  id: 'ext-extra',
  displayName: 'Extra Extension',
  version: '1.0.0',
  description: 'Extra extension',
  icon: '',
  origin: 'official',
  author: { name: 'Yank Note' },
  installed: false,
  enabled: false,
  compatible: { value: true, reason: '' },
  requirements: { premium: false, terminal: false },
  dist: { unpackedSize: 0 },
  homepage: '',
  license: '',
  readmeUrl: 'https://example.test/readme.md',
  changelogUrl: 'https://example.test/changelog.md',
  isDev: false,
  ...overrides,
})

const mocks = vi.hoisted(() => ({
  actions: new Map<string, Function>(),
  storeState: undefined as any,
  registryExtensions: [] as any[],
  installedExtensions: [] as any[],
  registryVersions: [] as any[],
  getRegistryExtensions: vi.fn(),
  getInstalledExtensions: vi.fn(),
  getRegistryExtensionVersions: vi.fn(),
  installExtension: vi.fn(),
  uninstallExtension: vi.fn(),
  enableExtension: vi.fn(),
  disableExtension: vi.fn(),
  abortInstallation: vi.fn(),
  getLoadStatus: vi.fn(),
  proxyFetch: vi.fn(),
  search: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  fetchHistoryList: vi.fn(),
  fetchHistoryContent: vi.fn(),
  commentHistoryVersion: vi.fn(),
  deleteHistoryVersion: vi.fn(),
  toastShow: vi.fn(),
  toastHide: vi.fn(),
  modalConfirm: vi.fn(),
  modalInput: vi.fn(),
  modalAlert: vi.fn(),
  contextMenuShow: vi.fn(),
  showSettingPanel: vi.fn(),
  reloadMainWindow: vi.fn(),
  openWindow: vi.fn(),
  open: vi.fn(),
  triggerHook: vi.fn(),
  getContextMenuItems: vi.fn(),
  getNodeActionButtons: vi.fn(),
  refreshTree: vi.fn(),
  switchDoc: vi.fn(),
  moveDoc: vi.fn(),
  duplicateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  upload: vi.fn(),
  setContainerDom: vi.fn(),
  emitResize: vi.fn(),
  toggleEditor: vi.fn((val: boolean) => { mocks.storeState.showEditor = val }),
  toggleSide: vi.fn((val: boolean) => { mocks.storeState.showSide = val }),
  toggleView: vi.fn((val: boolean) => { mocks.storeState.showView = val }),
  toggleContentRightSide: vi.fn((val: boolean) => { mocks.storeState.showContentRightSide = val }),
  toggleXterm: vi.fn((val: boolean) => { mocks.storeState.showXterm = val }),
  registerHook: vi.fn(),
  removeHook: vi.fn(),
  setValue: vi.fn(),
  createEditor: vi.fn(),
  createDiffEditor: vi.fn(),
  createModel: vi.fn(),
  inputPassword: vi.fn(),
  decrypt: vi.fn(),
  copyText: vi.fn(),
  confetti: vi.fn(),
  qrcodeToDataURL: vi.fn(),
  random: vi.fn(() => 321),
  activateLicense: vi.fn(),
  activateByTokenString: vi.fn(),
  getPurchased: vi.fn(),
  getLicenseToken: vi.fn(),
  refreshLicense: vi.fn(),
  requestApi: vi.fn(),
  decodeDevice: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
  args: new Map<string, string>(),
}))

vi.mock('dayjs', () => ({ default: () => ({ to: () => 'relative time' }) }))
vi.mock('canvas-confetti', () => ({ default: mocks.confetti }))
vi.mock('qrcode', () => ({ default: { toDataURL: mocks.qrcodeToDataURL } }))
vi.mock('app-license', () => ({
  decodeDevice: mocks.decodeDevice,
  LicenseToken: class {},
}))
vi.mock('lodash-es', async () => {
  const actual: any = await vi.importActual('lodash-es')
  return { ...actual, debounce: (fn: any) => fn, throttle: (fn: any) => fn, random: mocks.random }
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
  encodeMarkdownLink: (path: string) => encodeURI(path),
  escapeMd: (text: string) => text.replace('[', '\\[').replace(']', '\\]'),
  fileToBase64URL: vi.fn(async (file: File) => `data:${file.name}`),
  copyText: mocks.copyText,
}))
vi.mock('@fe/utils/path', () => ({
  basename: (path: string) => path.split('/').filter(Boolean).pop() || '',
  dirname: (path: string) => path.split('/').slice(0, -1).join('/') || '/',
  extname: (path: string) => (path.match(/\.[^.]+$/)?.[0] || ''),
  isBelongTo: (a: string, b: string) => b.startsWith(`${a}/`),
  join: (...args: string[]) => args.join('/').replace(/\/+/g, '/'),
  relative: (from: string, to: string) => to.replace(new RegExp(`^${from}/?`), ''),
}))
vi.mock('@fe/support/store', () => ({
  default: { get state () { return mocks.storeState } },
}))
vi.mock('@fe/support/api', () => ({
  proxyFetch: mocks.proxyFetch,
  search: mocks.search,
  readFile: mocks.readFile,
  writeFile: mocks.writeFile,
  upload: mocks.upload,
  fetchHistoryList: mocks.fetchHistoryList,
  fetchHistoryContent: mocks.fetchHistoryContent,
  commentHistoryVersion: mocks.commentHistoryVersion,
  deleteHistoryVersion: mocks.deleteHistoryVersion,
}))
vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action.handler),
  removeAction: (name: string) => mocks.actions.delete(name),
}))
vi.mock('@fe/core/hook', () => ({
  triggerHook: mocks.triggerHook,
  registerHook: mocks.registerHook,
  removeHook: mocks.removeHook,
}))
vi.mock('@fe/core/keybinding', () => ({ Alt: 'Alt', CtrlCmd: 'Cmd', Shift: 'Shift' }))
vi.mock('@fe/utils/composable', () => ({ useLazyRef: (source: any) => source }))
vi.mock('@fe/others/extension', () => ({
  registries: ['registry.npmjs.org'],
  getRegistryExtensions: mocks.getRegistryExtensions,
  getInstalledExtensions: mocks.getInstalledExtensions,
  getRegistryExtensionVersions: mocks.getRegistryExtensionVersions,
  getLoadStatus: mocks.getLoadStatus,
  install: mocks.installExtension,
  uninstall: mocks.uninstallExtension,
  enable: mocks.enableExtension,
  disable: mocks.disableExtension,
  abortInstallation: mocks.abortInstallation,
}))
vi.mock('@fe/services/base', () => ({
  reloadMainWindow: mocks.reloadMainWindow,
  inputPassword: mocks.inputPassword,
}))
vi.mock('@fe/services/setting', () => ({
  getSetting: mocks.getSetting,
  setSetting: mocks.setSetting,
  showSettingPanel: mocks.showSettingPanel,
}))
vi.mock('@fe/support/ui/modal', () => ({
  useModal: () => ({ confirm: mocks.modalConfirm, input: mocks.modalInput, alert: mocks.modalAlert }),
}))
vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow, hide: mocks.toastHide }),
}))
vi.mock('@fe/support/ui/context-menu', () => ({
  useContextMenu: () => ({ show: mocks.contextMenuShow }),
}))
vi.mock('@fe/others/premium', () => ({
  getPurchased: mocks.getPurchased,
  showPremium: vi.fn(),
  activateByTokenString: mocks.activateByTokenString,
  activateLicense: mocks.activateLicense,
  getLicenseToken: mocks.getLicenseToken,
  refreshLicense: mocks.refreshLicense,
  requestApi: mocks.requestApi,
  tokenAvailableDays: () => 7,
  tokenIsExpiredSoon: (token: any) => token?.status === 'expires-soon',
  tokenIsStaleSoon: (token: any) => token?.status === 'stale-soon',
}))
vi.mock('@fe/support/args', () => ({
  FLAG_DISABLE_XTERM: false,
  FLAG_MAS: false,
  FLAG_READONLY: false,
  FLAG_DEMO: false,
  URL_MAS_LIMITATION: 'https://example.test/mas',
  $args: () => ({ get: (key: string) => mocks.args.get(key) }),
}))
vi.mock('@fe/support/env', () => ({
  isElectron: true,
  openWindow: mocks.openWindow,
}))
vi.mock('@fe/services/layout', () => ({
  setContainerDom: mocks.setContainerDom,
  emitResize: mocks.emitResize,
  toggleEditor: mocks.toggleEditor,
  toggleSide: mocks.toggleSide,
  toggleView: mocks.toggleView,
  toggleContentRightSide: mocks.toggleContentRightSide,
  toggleXterm: mocks.toggleXterm,
}))
vi.mock('@fe/services/tree', () => ({
  getContextMenuItems: mocks.getContextMenuItems,
  getNodeActionButtons: mocks.getNodeActionButtons,
  refreshTree: mocks.refreshTree,
}))
vi.mock('@fe/services/document', () => ({
  deleteDoc: mocks.deleteDoc,
  duplicateDoc: mocks.duplicateDoc,
  isMarkdownFile: (node: any) => String(node.path || node).endsWith('.md'),
  isMarked: (node: any) => !!node.marked,
  moveDoc: mocks.moveDoc,
  switchDoc: mocks.switchDoc,
  isEncrypted: (doc: any) => String(doc.path).includes('encrypted'),
  isSameFile: (a: any, b: any) => a?.repo === b?.repo && a?.path === b?.path,
}))
vi.mock('@fe/services/editor', () => ({
  isDefault: () => true,
  highlightLine: vi.fn(),
  getEditor: () => ({ setSelection: vi.fn(), focus: vi.fn() }),
  getDefaultOptions: () => ({ fontSize: 12 }),
  getMonaco: () => ({
    editor: {
      create: mocks.createEditor,
      createDiffEditor: mocks.createDiffEditor,
      createModel: mocks.createModel,
    },
  }),
  setValue: mocks.setValue,
  whenEditorReady: vi.fn(() => Promise.resolve()),
}))
vi.mock('@fe/services/view', () => ({ highlightLine: vi.fn() }))
vi.mock('@share/misc', () => ({
  DOC_HISTORY_MAX_CONTENT_LENGTH: 10,
  HOMEPAGE_URL: 'https://example.test',
  isEncryptedMarkdownFile: (path: string) => path.endsWith('.enc.md'),
  isMarkdownFile: (path: string | { path: string }) => (typeof path === 'string' ? path : path.path).endsWith('.md'),
}))
vi.mock('@fe/utils/crypto', () => ({ decrypt: mocks.decrypt }))
vi.mock('../Mask.vue', () => ({
  default: { name: 'XMask', props: ['show'], emits: ['close'], template: '<div v-if="show !== false"><slot /></div>' },
}))
vi.mock('../GroupTabs.vue', () => ({
  default: {
    name: 'GroupTabs',
    props: ['tabs', 'modelValue'],
    emits: ['update:modelValue'],
    template: '<div><button v-for="tab in tabs" :key="tab.value" class="tab" @click="$emit(\'update:modelValue\', tab.value)">{{tab.label}}</button></div>',
  },
}))
vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'title'], emits: ['click'], template: '<button class="svg-icon" @click="$emit(\'click\', $event)">{{name}}</button>' },
}))
vi.mock('./SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i class="svg-icon">{{name}}</i>' },
}))

import ExtensionManager from '../ExtensionManager.vue'
import SearchPanel from '../SearchPanel.vue'
import Layout from '../Layout.vue'
import TreeNode from '../TreeNode.vue'
import DocHistory from '../DocHistory.vue'
import Premium from '../Premium.vue'

const editorMock = () => ({
  layout: vi.fn(),
  dispose: vi.fn(),
  getModel: vi.fn(() => ({ dispose: vi.fn(), original: { dispose: vi.fn() }, modified: { dispose: vi.fn() } })),
  setModel: vi.fn(),
})

const mountSearch = () => shallowMount(SearchPanel, {
  global: {
    mocks: { $t: (key: string) => key },
    directives: { upDownHistory: {}, placeholder: {}, autoResize: {}, textareaOnEnter: {} },
    stubs: { transition: false },
  },
})

beforeEach(() => {
  vi.useRealTimers()
  Element.prototype.scrollIntoViewIfNeeded = vi.fn()
  window.open = mocks.open
  mocks.storeState = reactive({
    currentRepo: { name: 'repo', path: '/repo' },
    currentFile: { type: 'file', repo: 'repo', path: '/a.md', name: 'a.md' },
    currentContent: 'current',
    showView: true,
    showXterm: true,
    showSide: true,
    showEditor: true,
    presentation: false,
    isFullscreen: false,
    showContentRightSide: true,
  })
  mocks.actions.clear()
  mocks.args.clear()
  Object.values(mocks).forEach((value: any) => {
    if (value?.mockReset) value.mockReset()
  })
  mocks.getRegistryExtensions.mockResolvedValue(mocks.registryExtensions)
  mocks.getInstalledExtensions.mockResolvedValue(mocks.installedExtensions)
  mocks.getRegistryExtensionVersions.mockResolvedValue(mocks.registryVersions)
  mocks.installExtension.mockResolvedValue(undefined)
  mocks.uninstallExtension.mockResolvedValue(undefined)
  mocks.enableExtension.mockResolvedValue(undefined)
  mocks.disableExtension.mockResolvedValue(undefined)
  mocks.abortInstallation.mockResolvedValue(undefined)
  mocks.getLoadStatus.mockReturnValue({})
  mocks.proxyFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('# ok') })
  mocks.search.mockResolvedValue(async () => ({ limitHit: false }))
  mocks.modalConfirm.mockResolvedValue(true)
  mocks.modalInput.mockResolvedValue('note')
  mocks.fetchHistoryList.mockResolvedValue({ size: 0, list: [] })
  mocks.fetchHistoryContent.mockResolvedValue('history')
  mocks.commentHistoryVersion.mockResolvedValue(undefined)
  mocks.deleteHistoryVersion.mockResolvedValue(undefined)
  mocks.triggerHook.mockResolvedValue(false)
  mocks.getContextMenuItems.mockReturnValue([])
  mocks.getNodeActionButtons.mockReturnValue([])
  mocks.upload.mockResolvedValue(undefined)
  mocks.createEditor.mockReturnValue(editorMock())
  mocks.createDiffEditor.mockReturnValue({ ...editorMock(), onDidUpdateDiff: vi.fn() })
  mocks.createModel.mockImplementation((content: string) => ({ content, dispose: vi.fn() }))
  mocks.inputPassword.mockResolvedValue('pw')
  mocks.decrypt.mockReturnValue({ content: 'decrypted' })
  mocks.getPurchased.mockReturnValue(false)
  mocks.getLicenseToken.mockReturnValue(null)
  mocks.refreshLicense.mockResolvedValue(undefined)
  mocks.requestApi.mockResolvedValue([])
  mocks.activateLicense.mockResolvedValue(undefined)
  mocks.activateByTokenString.mockResolvedValue(undefined)
  mocks.qrcodeToDataURL.mockResolvedValue('data:image/png;base64,qrcode')
  mocks.decodeDevice.mockImplementation((val: string) => {
    const [id, platform, hostname] = val.split(':')
    return { id, platform, hostname }
  })
  mocks.getSetting.mockImplementation((_key: string, fallback: any) => fallback)
  mocks.registryExtensions = []
  mocks.installedExtensions = []
  mocks.registryVersions = []
})

describe('component-extra branch coverage', () => {
  test('ExtensionManager renders empty state, skips incompatible installs, and handles cancel/error branches', async () => {
    const wrapper = mount(ExtensionManager, {
      global: { mocks: { $t: (key: string, value?: string) => value ? `${key}:${value}` : key } },
    })

    await mocks.actions.get('extension.show-manager')?.()
    await flushPromises()
    expect(wrapper.text()).toContain('extension.no-extension')

    const incompatible = extension({ compatible: { value: false, reason: 'bad version' } })
    await (wrapper.vm as any).installLatest(incompatible)
    expect(mocks.installExtension).not.toHaveBeenCalled()

    mocks.modalConfirm.mockResolvedValueOnce(false)
    await (wrapper.vm as any).uninstall(extension({ installed: true }))
    expect(mocks.uninstallExtension).not.toHaveBeenCalled()

    mocks.abortInstallation.mockRejectedValueOnce(new Error('stop failed'))
    await expect((wrapper.vm as any).abortInstallation()).rejects.toThrow('stop failed')
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'stop failed')

    mocks.getRegistryExtensionVersions.mockResolvedValueOnce([])
    await (wrapper.vm as any).showInstallVersionMenu(new MouseEvent('contextmenu'), extension())
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'No historical version')
  })

  test('SearchPanel resets on repository changes, preserves close while replacing, and records replace errors', async () => {
    const wrapper = mountSearch()
    ;(wrapper.vm as any).visible = true
    ;(wrapper.vm as any).result = [{ path: '/a.md', open: true, numMatches: 1, results: [] }]
    ;(wrapper.vm as any).replaceResult = { '/a.md': { status: 'done', msg: 'ok' } }

    mocks.storeState.currentRepo = { name: 'other', path: '/other' }
    await nextTick()
    expect((wrapper.vm as any).result).toEqual([])
    expect((wrapper.vm as any).replaceResult).toEqual({})

    ;(wrapper.vm as any).replacing = true
    ;(wrapper.vm as any).close()
    expect((wrapper.vm as any).visible).toBe(true)

    mocks.search.mockResolvedValue(async (onData: any) => {
      onData([{ path: '/other/a.md', numMatches: 1, results: [{ preview: { text: 'a', matches: [] }, ranges: [] }] }])
      return { limitHit: false }
    })
    mocks.modalConfirm.mockResolvedValueOnce(true)
    mocks.readFile.mockResolvedValueOnce({ writeable: false, content: 'a', hash: 'h' })
    ;(wrapper.vm as any).replacing = false
    ;(wrapper.vm as any).visible = true
    ;(wrapper.vm as any).isReplaceVisible = true
    ;(wrapper.vm as any).option.isCaseSensitive = true
    ;(wrapper.vm as any).pattern = 'a'
    ;(wrapper.vm as any).replaceText = 'b'
    await (wrapper.vm as any).replaceAll()
    expect((wrapper.vm as any).replaceResult['/a.md'].status).toBe('error')

    await (wrapper.vm as any).chooseMatch({ repo: 'repo', path: '/a.md' }, { key: 'x', ranges: [] }, 0)
    expect(mocks.switchDoc).not.toHaveBeenCalled()
  })

  test('Layout toggles editor, preview, terminal, and content right side from resize limits', async () => {
    const wrapper = mount(Layout)
    const terminal = wrapper.find('.terminal').element as HTMLElement
    Object.defineProperty(terminal, 'clientHeight', { configurable: true, value: 100 })

    await wrapper.find('.sash-top').trigger('mousedown', { clientX: 0, clientY: 100 })
    window.document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 200, buttons: 1 }))
    window.document.dispatchEvent(new MouseEvent('mouseup'))
    expect(mocks.toggleXterm).toHaveBeenCalledWith(false)

    const content = wrapper.find('.content').element as HTMLElement
    const editor = wrapper.find('.editor').element as HTMLElement
    const contentRightSide = wrapper.find('.content-right-side').element as HTMLElement
    Object.defineProperty(content, 'clientWidth', { configurable: true, value: 900 })
    Object.defineProperty(editor, 'clientWidth', { configurable: true, value: 300 })
    Object.defineProperty(contentRightSide, 'clientWidth', { configurable: true, value: 250 })

    await wrapper.find('.content-right-side .sash-left').trigger('mousedown', { clientX: 100, clientY: 0 })
    window.document.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, clientY: 0, buttons: 1 }))
    window.document.dispatchEvent(new MouseEvent('mouseup'))
    expect(mocks.toggleContentRightSide).toHaveBeenCalledWith(false)

    const maxWrapper = mount(Layout)
    const maxContent = maxWrapper.find('.content').element as HTMLElement
    const maxEditor = maxWrapper.find('.editor').element as HTMLElement
    const maxContentRightSide = maxWrapper.find('.content-right-side').element as HTMLElement
    Object.defineProperty(maxContent, 'clientWidth', { configurable: true, value: 900 })
    Object.defineProperty(maxEditor, 'clientWidth', { configurable: true, value: 300 })
    Object.defineProperty(maxContentRightSide, 'clientWidth', { configurable: true, value: 250 })
    await maxWrapper.find('.preview .sash-left').trigger('mousedown', { clientX: 100, clientY: 0 })
    window.document.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 0, buttons: 1 }))
    window.document.dispatchEvent(new MouseEvent('mouseup'))
    expect(mocks.toggleView).toHaveBeenCalledWith(false)

    mocks.storeState.showView = true
    mocks.storeState.showEditor = true
    mocks.storeState.showContentRightSide = true
    const minWrapper = mount(Layout)
    const minContent = minWrapper.find('.content').element as HTMLElement
    const minEditor = minWrapper.find('.editor').element as HTMLElement
    const minContentRightSide = minWrapper.find('.content-right-side').element as HTMLElement
    Object.defineProperty(minContent, 'clientWidth', { configurable: true, value: 900 })
    Object.defineProperty(minEditor, 'clientWidth', { configurable: true, value: 300 })
    Object.defineProperty(minContentRightSide, 'clientWidth', { configurable: true, value: 250 })
    await minWrapper.find('.preview .sash-left').trigger('mousedown', { clientX: 100, clientY: 0 })
    window.document.dispatchEvent(new MouseEvent('mousemove', { clientX: -500, clientY: 0, buttons: 1 }))
    window.document.dispatchEvent(new MouseEvent('mouseup'))
    expect(mocks.toggleEditor).toHaveBeenCalledWith(false)
  })

  test('TreeNode respects handled selection hooks, copy-folder guards, upload errors, and dragleave target checks', async () => {
    vi.useFakeTimers()
    const side = document.createElement('aside')
    side.className = 'side'
    document.body.appendChild(side)
    const fileNode = { type: 'file', name: 'a.md', path: '/docs/a.md', repo: 'repo', level: 1 }
    mocks.triggerHook.mockResolvedValueOnce(true)
    const fileWrapper = shallowMount(TreeNode, {
      props: { item: fileNode },
      global: { stubs: { SvgIcon: true } },
    })
    await fileWrapper.find('.file-name').trigger('click')
    expect(mocks.switchDoc).not.toHaveBeenCalled()

    const dirNode = { type: 'dir', name: 'docs', path: '/docs', repo: 'repo', level: 1, children: [] }
    const wrapper = shallowMount(TreeNode, {
      props: { item: dirNode },
      global: { stubs: { TreeNode: true, SvgIcon: true } },
    })
    await wrapper.find('details').trigger('drop', {
      altKey: true,
      dataTransfer: { getData: vi.fn(() => JSON.stringify({ ...dirNode, path: '/other' })) },
    })
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'Cannot copy folder')

    mocks.upload.mockRejectedValueOnce(new Error('upload failed'))
    const files = [new File(['x'], 'bad.md')] as any
    files.item = (idx: number) => files[idx]
    await wrapper.find('details').trigger('drop', {
      dataTransfer: { getData: vi.fn(() => ''), items: [{ kind: 'file' }], files },
    })
    await flushPromises()
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'upload failed')
    expect(mocks.refreshTree).toHaveBeenCalled()

    await wrapper.find('details').trigger('dragenter')
    vi.advanceTimersByTime(61)
    expect((wrapper.vm as any).dragOver).toBe(true)
    ;(wrapper.vm as any).onDragLeave({
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      target: document.createElement('div'),
    })
    expect((wrapper.vm as any).dragOver).toBe(true)
    side.remove()
    vi.useRealTimers()
  })

  test('DocHistory handles long-content alert, encrypted content fallback, no history, and cancel branches', async () => {
    mocks.storeState.currentContent = '01234567890'
    mocks.fetchHistoryList.mockResolvedValueOnce({
      size: 2048,
      list: [{ name: '2024-01-02 03-04-05.encrypted', comment: '' }],
    })
    mocks.inputPassword.mockRejectedValueOnce(new Error('bad password'))

    const wrapper = shallowMount(DocHistory, {
      global: { mocks: { $t: (key: string) => key } },
    })
    mocks.actions.get('doc.show-history')?.()
    await flushPromises()
    expect(mocks.modalAlert).toHaveBeenCalled()
    expect((wrapper.vm as any).content).toBe('document.wrong-password')

    mocks.modalConfirm.mockResolvedValueOnce(false)
    await (wrapper.vm as any).deleteVersion((wrapper.vm as any).versions[0])
    expect(mocks.deleteHistoryVersion).not.toHaveBeenCalled()

    mocks.fetchHistoryList.mockResolvedValueOnce({ size: 0, list: [] })
    await (wrapper.vm as any).fetchVersions()
    await flushPromises()
    expect((wrapper.vm as any).versions).toEqual([])

    mocks.getPurchased.mockReturnValueOnce(false)
    await (wrapper.vm as any).markVersion({ value: 'x.md', label: 'x', title: 'x', encrypted: false, comment: '' })
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'premium.need-purchase:Mark')
  })

  test('Premium covers activation errors, remove-device cancel/error, tab watch reset, and confetti guard', async () => {
    const token = {
      licenseId: 'license-1',
      name: 'Ada',
      email: 'ada@example.test',
      displayName: 'Premium',
      expires: new Date('2030-01-01T00:00:00Z'),
      device: 'dev1:darwin:mac',
      devices: ['dev1:darwin:mac'],
      status: 'stale-soon',
    }
    mocks.getPurchased.mockReturnValue(true)
    mocks.getLicenseToken.mockReturnValue(token)
    mocks.requestApi.mockResolvedValue(['dev1:darwin:mac', 'dev2:win32:pc'])

    const wrapper = mount(Premium, {
      global: { mocks: { $t: (key: string, value?: string) => value ? `${key}:${value}` : key } },
    })
    await flushPromises()

    ;(wrapper.vm as any).doConfetti()
    expect(mocks.confetti).toHaveBeenCalled()
    ;(wrapper.vm as any).purchased = false
    ;(wrapper.vm as any).doConfetti()
    expect(mocks.confetti).toHaveBeenCalledTimes(1)

    mocks.activateLicense.mockRejectedValueOnce(new Error('bad license'))
    ;(wrapper.vm as any).license = '12345678-1234-1234-1234-123456789abc'
    await (wrapper.vm as any).activate()
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'bad license')

    mocks.modalConfirm.mockResolvedValueOnce(false)
    await (wrapper.vm as any).removeDevice((wrapper.vm as any).devices[1])
    expect(mocks.requestApi).toHaveBeenCalledTimes(1)

    mocks.modalConfirm.mockResolvedValueOnce(true)
    mocks.requestApi.mockRejectedValueOnce(new Error('remove failed'))
    await expect((wrapper.vm as any).removeDevice((wrapper.vm as any).devices[1])).rejects.toThrow('remove failed')
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'Error: remove failed')

    ;(wrapper.vm as any).tab = 'activation'
    await nextTick()
    ;(wrapper.vm as any).offline = true
    ;(wrapper.vm as any).activationToken = 'token'
    ;(wrapper.vm as any).tab = 'intro'
    await nextTick()
    expect((wrapper.vm as any).offline).toBe(false)
    expect((wrapper.vm as any).activationToken).toBe('')
  })
})
