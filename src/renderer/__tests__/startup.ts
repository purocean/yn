const mocks = vi.hoisted(() => ({
  hooks: new Map<string, Function[]>(),
  actions: new Map<string, any>(),
  storeState: {
    currentRepo: { name: 'repo-a' },
    currentFile: { type: 'file', repo: 'repo-a', name: 'a.md', path: '/a.md', content: 'old', plain: true, status: 'loaded' },
    wordWrap: false,
    typewriterMode: false,
    showSide: true,
    showView: true,
    showEditor: true,
    editorPreviewExclusive: false,
    showXterm: false,
    showOutline: false,
    autoPreview: true,
    syncScroll: true,
    editor: 'default',
    previewer: 'default',
  } as any,
  initPlugin: vi.fn(),
  triggerHook: vi.fn(),
  registerCustomEditor: vi.fn(),
  whenEditorReady: vi.fn(() => Promise.resolve({
    editor: { addCommand: vi.fn() },
    monaco: { KeyMod: { CtrlCmd: 1 }, KeyCode: { KeyS: 2 } },
  })),
  getLanguage: vi.fn(() => 'en'),
  setLanguage: vi.fn(),
  fetchSettings: vi.fn(),
  getPurchased: vi.fn(() => true),
  showPremium: vi.fn(),
  getThemeName: vi.fn(() => 'light'),
  setTheme: vi.fn(),
  toggleOutline: vi.fn(),
  refreshView: vi.fn(),
  renderView: vi.fn(),
  switchPreviewer: vi.fn(),
  getRenderEnv: vi.fn(() => undefined as any),
  getRenderIframe: vi.fn(() => Promise.resolve({ contentDocument: document })),
  refreshTree: vi.fn(() => Promise.resolve()),
  stopWatch: vi.fn(),
  triggerWatchCurrentRepo: vi.fn(),
  setCurrentRepo: vi.fn(),
  switchDoc: vi.fn(() => Promise.resolve()),
  createDoc: vi.fn(() => Promise.resolve()),
  isMarkdownFile: vi.fn((doc: any) => doc?.path?.endsWith('.md')),
  isMarked: vi.fn(() => false),
  markDoc: vi.fn(() => Promise.resolve()),
  unmarkDoc: vi.fn(() => Promise.resolve()),
  isDefault: vi.fn(() => true),
  isDirty: vi.fn(() => Promise.resolve(false)),
  reloadMainWindow: vi.fn(),
  toastHide: vi.fn(),
  toastShow: vi.fn(),
  modalConfirm: vi.fn(() => Promise.resolve(true)),
  getActionHandler: vi.fn(() => vi.fn()),
  extensionInit: vi.fn(),
  jsonrpcInit: vi.fn(),
  removeOldDatabases: vi.fn(),
  gaLogEvent: vi.fn(),
  layoutToggleContentRightSide: vi.fn(),
  contentRightSidePanels: [] as any[],
  statusRefreshMenu: vi.fn(),
  controlCenterRefresh: vi.fn(),
  workbenchContentRefresh: vi.fn(),
  loggerDebug: vi.fn(),
  loggerWarn: vi.fn(),
  isWindows: false,
  isElectron: true,
}))

vi.mock('@fe/core/plugin', () => ({
  init: mocks.initPlugin,
}))

vi.mock('@fe/core/keybinding', () => ({
  Alt: 'Alt',
}))

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action),
  getActionHandler: mocks.getActionHandler,
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => {
    const handlers = mocks.hooks.get(name) || []
    handlers.push(handler)
    mocks.hooks.set(name, handlers)
  },
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: mocks.storeState,
    watch: (getter: Function, cb: Function, options?: { immediate?: boolean }) => {
      if (options?.immediate) {
        cb(getter())
      }
    },
  },
}))

vi.mock('@fe/support/env', () => ({
  get isElectron () { return mocks.isElectron },
  get isWindows () { return mocks.isWindows },
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({
    hide: mocks.toastHide,
    show: mocks.toastShow,
  }),
}))

vi.mock('@fe/support/ui/modal', () => ({
  useModal: () => ({
    confirm: mocks.modalConfirm,
    ok: vi.fn(),
    cancel: vi.fn(),
  }),
}))

vi.mock('@fe/services/base', () => ({
  reloadMainWindow: mocks.reloadMainWindow,
}))

vi.mock('@fe/services/document', () => ({
  createDoc: mocks.createDoc,
  isMarkdownFile: mocks.isMarkdownFile,
  isMarked: mocks.isMarked,
  markDoc: mocks.markDoc,
  switchDoc: mocks.switchDoc,
  toUri: (doc: any) => doc ? `${doc.repo}:${doc.path}` : 'blank:',
  unmarkDoc: mocks.unmarkDoc,
}))

vi.mock('@fe/services/editor', () => ({
  DEFAULT_MARKDOWN_EDITOR_NAME: 'default',
  isDefault: mocks.isDefault,
  isDirty: mocks.isDirty,
  registerCustomEditor: mocks.registerCustomEditor,
  whenEditorReady: mocks.whenEditorReady,
}))

vi.mock('@fe/services/i18n', () => ({
  getLanguage: mocks.getLanguage,
  setLanguage: mocks.setLanguage,
  t: (key: string, value?: any) => value ? `${key}:${value}` : key,
}))

vi.mock('@fe/services/setting', () => ({
  fetchSettings: mocks.fetchSettings,
}))

vi.mock('@fe/others/premium', () => ({
  getPurchased: mocks.getPurchased,
  showPremium: mocks.showPremium,
}))

vi.mock('@fe/others/extension', () => ({
  init: mocks.extensionInit,
}))

vi.mock('@fe/services/theme', () => ({
  getThemeName: mocks.getThemeName,
  setTheme: mocks.setTheme,
}))

vi.mock('@fe/services/workbench', () => ({
  toggleOutline: mocks.toggleOutline,
}))

vi.mock('@fe/services/view', () => ({
  refresh: mocks.refreshView,
  render: mocks.renderView,
  switchPreviewer: mocks.switchPreviewer,
  getRenderEnv: mocks.getRenderEnv,
  getRenderIframe: mocks.getRenderIframe,
}))

vi.mock('@fe/services/tree', () => ({
  refreshTree: mocks.refreshTree,
}))

vi.mock('@fe/services/indexer', () => ({
  stopWatch: mocks.stopWatch,
  triggerWatchCurrentRepo: mocks.triggerWatchCurrentRepo,
}))

vi.mock('@fe/services/repo', () => ({
  setCurrentRepo: mocks.setCurrentRepo,
}))

vi.mock('@fe/plugins', () => ({ default: ['plugin-a'] }))
vi.mock('@fe/context', () => ({
  default: {
    statusBar: { refreshMenu: mocks.statusRefreshMenu },
    workbench: {
      ControlCenter: { refresh: mocks.controlCenterRefresh },
      ContentRightSide: {
        getAllPanels: () => mocks.contentRightSidePanels,
        refresh: mocks.workbenchContentRefresh,
      },
    },
    layout: { toggleContentRightSide: mocks.layoutToggleContentRightSide },
  },
}))

vi.mock('@fe/support/ga', () => ({
  default: { logEvent: mocks.gaLogEvent },
}))

vi.mock('@fe/support/jsonrpc', () => ({
  init: mocks.jsonrpcInit,
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => ({
    debug: mocks.loggerDebug,
    warn: mocks.loggerWarn,
  }),
  sleep: () => Promise.resolve(),
}))

vi.mock('@fe/others/db', () => ({
  removeOldDatabases: mocks.removeOldDatabases,
}))

const firstHook = (name: string) => mocks.hooks.get(name)![0]
const lastHook = (name: string) => mocks.hooks.get(name)!.at(-1)!
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetModules()
  mocks.hooks.clear()
  mocks.actions.clear()
  mocks.storeState.currentRepo = { name: 'repo-a' }
  mocks.storeState.currentFile = { type: 'file', repo: 'repo-a', name: 'a.md', path: '/a.md', content: 'old', plain: true, status: 'loaded' }
  mocks.initPlugin.mockClear()
  mocks.triggerHook.mockClear()
  mocks.registerCustomEditor.mockClear()
  mocks.whenEditorReady.mockClear()
  mocks.whenEditorReady.mockResolvedValue({
    editor: { addCommand: vi.fn() },
    monaco: { KeyMod: { CtrlCmd: 1 }, KeyCode: { KeyS: 2 } },
  })
  mocks.getLanguage.mockReturnValue('en')
  mocks.setLanguage.mockClear()
  mocks.fetchSettings.mockClear()
  mocks.getPurchased.mockReturnValue(true)
  mocks.showPremium.mockClear()
  mocks.getThemeName.mockReturnValue('light')
  mocks.setTheme.mockClear()
  mocks.toggleOutline.mockClear()
  mocks.refreshView.mockClear()
  mocks.renderView.mockClear()
  mocks.switchPreviewer.mockClear()
  mocks.getRenderEnv.mockReturnValue(undefined)
  mocks.refreshTree.mockClear()
  mocks.stopWatch.mockClear()
  mocks.triggerWatchCurrentRepo.mockClear()
  mocks.setCurrentRepo.mockClear()
  mocks.switchDoc.mockClear()
  mocks.createDoc.mockClear()
  mocks.isMarkdownFile.mockImplementation((doc: any) => doc?.path?.endsWith('.md'))
  mocks.isMarked.mockReturnValue(false)
  mocks.markDoc.mockClear()
  mocks.unmarkDoc.mockClear()
  mocks.isDefault.mockReturnValue(true)
  mocks.isDirty.mockResolvedValue(false)
  mocks.reloadMainWindow.mockClear()
  mocks.toastHide.mockClear()
  mocks.toastShow.mockClear()
  mocks.modalConfirm.mockResolvedValue(true)
  mocks.getActionHandler.mockReturnValue(vi.fn())
  mocks.extensionInit.mockClear()
  mocks.jsonrpcInit.mockClear()
  mocks.removeOldDatabases.mockClear()
  mocks.gaLogEvent.mockClear()
  mocks.layoutToggleContentRightSide.mockClear()
  mocks.contentRightSidePanels = []
  mocks.statusRefreshMenu.mockClear()
  mocks.controlCenterRefresh.mockClear()
  mocks.workbenchContentRefresh.mockClear()
  mocks.loggerDebug.mockClear()
  mocks.loggerWarn.mockClear()
  mocks.isWindows = false
  mocks.isElectron = true
  document.documentElement.removeAttribute('premium')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('renderer startup', () => {
  test('initializes plugins, registers startup hooks/actions, and starts services', async () => {
    const mod = await import('../startup')
    await flush()

    expect(mocks.initPlugin).toHaveBeenCalledWith(['plugin-a'], expect.anything())
    expect(mocks.fetchSettings).toHaveBeenCalled()
    expect(mocks.jsonrpcInit).toHaveBeenCalledWith({ ctx: expect.anything() }, expect.any(Promise))
    expect(mocks.registerCustomEditor).toHaveBeenCalledWith(expect.objectContaining({
      name: 'default',
      displayName: 'editor.default-editor',
    }))
    expect(mocks.actions.get('layout.toggle-content-right-side')).toMatchObject({
      name: 'layout.toggle-content-right-side',
      keys: ['Alt', 'b'],
      forUser: true,
      forMcp: true,
    })

    mod.default()
    expect(mocks.triggerHook).toHaveBeenCalledWith('STARTUP')

    vi.advanceTimersByTime(20_000)
    expect(mocks.removeOldDatabases).toHaveBeenCalled()
  })

  test('handles premium, language, previewer, repo, file and indexer hooks', async () => {
    await import('../startup')
    await flush()

    firstHook('STARTUP')()
    expect(document.documentElement.getAttribute('premium')).toBe('true')

    firstHook('SETTING_FETCHED')({ settings: { language: 'zh-CN' } })
    expect(mocks.setLanguage).toHaveBeenCalledWith('zh-CN')

    mocks.getRenderEnv.mockReturnValue({ attributes: { defaultPreviewer: 'mind-map' } })
    firstHook('VIEW_PREVIEWER_CHANGE')({ type: 'refresh' })
    vi.advanceTimersByTime(500)
    expect(mocks.switchPreviewer).toHaveBeenCalledWith('mind-map')

    mocks.isWindows = true
    await firstHook('DOC_BEFORE_DELETE')({ doc: { type: 'dir' } })
    expect(mocks.stopWatch).toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(mocks.triggerWatchCurrentRepo).toHaveBeenCalled()

    await firstHook('VIEW_BEFORE_REFRESH')()
    expect(mocks.switchDoc).toHaveBeenCalledWith(
      { type: 'file', name: 'a.md', path: '/a.md', repo: 'repo-a' },
      { force: true }
    )
  })

  test('handles settings changes and document failures', async () => {
    await import('../startup')
    await flush()

    firstHook('SETTING_CHANGED')({
      schema: { properties: { 'core.hot': { needReloadWindowWhenChanged: true }, 'tree.exclude': {} } },
      changedKeys: ['render.theme', 'core.hot', 'tree.exclude'],
    })
    expect(mocks.renderView).toHaveBeenCalled()
    await flush()
    expect(mocks.reloadMainWindow).toHaveBeenCalled()
    expect(mocks.refreshTree).toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(mocks.triggerWatchCurrentRepo).toHaveBeenCalled()

    const closeTabs = vi.fn()
    mocks.getActionHandler.mockReturnValue(closeTabs)
    const missingDoc = { repo: 'repo-a', path: '/missing.md', name: 'missing.md' }
    await lastHook('DOC_SWITCH_FAILED')({ doc: missingDoc, message: 'ENOENT: NOENT' })
    await flush()

    expect(mocks.unmarkDoc).toHaveBeenCalledWith(missingDoc)
    expect(mocks.toastHide).toHaveBeenCalled()
    expect(closeTabs).toHaveBeenCalledWith(['repo-a:/missing.md'])
    expect(mocks.createDoc).toHaveBeenCalledWith(missingDoc)
  })

  test('handles marked moved documents, dirty editor guard, premium settings, analytics and right-side action', async () => {
    mocks.getPurchased.mockImplementation((force?: boolean) => force ? false : false)
    await import('../startup')
    await flush()

    mocks.hooks.get('SETTING_FETCHED')!.forEach(handler => handler({ settings: {} }))
    await flush()
    expect(mocks.setTheme).toHaveBeenCalledWith('light')
    vi.runOnlyPendingTimers()
    expect(mocks.setCurrentRepo).toHaveBeenCalledWith('repo-a')
    expect(mocks.extensionInit).toHaveBeenCalled()

    mocks.isMarked.mockReturnValue(true)
    const oldDoc = { repo: 'repo-a', path: '/old.md' }
    const newDoc = { repo: 'repo-a', path: '/new.md' }
    await lastHook('DOC_MOVED')({ oldDoc, newDoc })
    expect(mocks.unmarkDoc).toHaveBeenCalledWith(oldDoc)
    expect(mocks.markDoc).toHaveBeenCalledWith(newDoc)

    mocks.isDefault.mockReturnValue(false)
    mocks.isDirty.mockResolvedValue(true)
    mocks.modalConfirm.mockResolvedValueOnce(false)
    await expect(firstHook('DOC_PRE_ENSURE_CURRENT_FILE_SAVED')()).rejects.toThrow('Current Editor is dirty')

    const watch = vi.fn((_key: string, cb: Function) => cb())
    const themeEditor = { getValue: vi.fn(() => 'dark'), setValue: vi.fn() }
    firstHook('SETTING_PANEL_AFTER_SHOW')({
      editor: {
        watch,
        getEditor: () => themeEditor,
      },
    })
    expect(themeEditor.setValue).toHaveBeenCalledWith('light')
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'premium.need-purchase:Theme')
    expect(mocks.showPremium).toHaveBeenCalled()

    firstHook('DOC_SWITCHED')()
    vi.runOnlyPendingTimers()
    expect(mocks.gaLogEvent).toHaveBeenCalledWith('yn_doc_switched')

    lastHook('RIGHT_SIDE_PANEL_CHANGE')({ type: 'remove' })
    expect(mocks.layoutToggleContentRightSide).toHaveBeenCalledWith(false)
  })
})
