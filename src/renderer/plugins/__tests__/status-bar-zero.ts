import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

type MenuMap = Record<string, any>

function setupBaseMocks (args: Record<string, any> = {}) {
  vi.doMock('@fe/support/args', () => ({
    FLAG_DEMO: false,
    FLAG_DISABLE_XTERM: false,
    FLAG_DEBUG: false,
    URL_GITHUB: 'https://github.example/yn',
    URL_MAS: 'macappstore://yn',
    ...args,
  }))
  vi.doMock('@fe/core/keybinding', () => ({
    getKeysLabel: (name: string) => `keys:${name}`,
  }))
}

function createCtx (overrides: Record<string, any> = {}) {
  const tappers: Function[] = []
  const hooks = new Map<string, Function>()
  const actions = new Map<string, any>()
  const toast = { show: vi.fn() }
  const modal = { alert: vi.fn() }
  const handlers = new Map<string, Function>([
    ['keyboard-shortcuts.show-manager', vi.fn()],
    ['layout.toggle-xterm', vi.fn()],
    ['workbench.show-quick-open', vi.fn()],
    ['tree.reveal-current-node', vi.fn()],
  ])

  const editorActionRun = vi.fn()
  const editorInstance = {
    focus: vi.fn(),
    getAction: vi.fn(() => ({ run: editorActionRun })),
  }
  const editor = {
    toggleWrap: vi.fn(),
    toggleTypewriterMode: vi.fn(),
    isDefault: vi.fn(() => true),
    getEditor: vi.fn(() => editorInstance),
  }

  const ctx: any = {
    args: { FLAG_DEMO: false },
    version: '1.2.3',
    tappers,
    hooks,
    actions,
    handlers,
    toast,
    modal,
    editorInstance,
    editorActionRun,
    action: {
      registerAction: vi.fn((action: any) => {
        actions.set(action.name, action)
        handlers.set(action.name, action.handler)
        return action
      }),
      getActionHandler: vi.fn((name: string) => handlers.get(name)),
      getAction: vi.fn((name: string) => actions.get(name)),
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    doc: {
      showHelp: vi.fn(),
      isMarkdownFile: vi.fn(() => true),
    },
    editor,
    export: {
      printCurrentDocument: vi.fn(),
      toggleExportPanel: vi.fn(),
    },
    getPremium: vi.fn(() => true),
    i18n: {
      getCurrentLanguage: vi.fn(() => 'en-US'),
      t: vi.fn((key: string, arg?: string) => arg ? `${key}:${arg}` : key),
    },
    keybinding: {
      getKeysLabel: vi.fn((name: string) => `keys:${name}`),
    },
    layout: {
      toggleSide: vi.fn(),
      toggleEditor: vi.fn(),
      toggleView: vi.fn(),
      toggleXterm: vi.fn(),
      toggleContentRightSide: vi.fn(),
      toggleEditorPreviewExclusive: vi.fn(),
    },
    lib: {
      confetti: vi.fn(),
    },
    setting: {
      showSettingPanel: vi.fn(),
    },
    showExtensionManager: vi.fn(),
    showPremium: vi.fn(),
    statusBar: {
      tapMenus: vi.fn((fn: Function) => tappers.push(fn)),
      refreshMenu: vi.fn(),
    },
    store: {
      state: {
        wordWrap: 'on',
        typewriterMode: true,
        showSide: true,
        showEditor: true,
        showView: false,
        showXterm: true,
        showContentRightSide: true,
        editorPreviewExclusive: false,
        previewer: 'default',
        currentFile: { repo: 'repo-a', path: '/note.md' },
        currentRepo: { name: 'repo-a' },
      },
    },
    theme: {
      addStyles: vi.fn(),
      getThemeName: vi.fn(() => 'light'),
      setTheme: vi.fn(),
    },
    ui: {
      useToast: vi.fn(() => toast),
      useModal: vi.fn(() => modal),
    },
    view: {
      enterPresent: vi.fn(),
    },
    workbench: {
      ContentRightSide: { getAllPanels: vi.fn(() => [{ id: 'outline' }]) },
      ControlCenter: { toggle: vi.fn() },
    },
  }

  return Object.assign(ctx, overrides)
}

function applyMenus (ctx: any, initial: MenuMap = {}) {
  const menus = initial
  ctx.tappers.forEach((tap: Function) => tap(menus))
  return menus
}

function item (menu: any, id: string) {
  return menu.list.find((entry: any) => entry.id === id)
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('status-bar zero coverage plugins', () => {
  it('registers help actions and menu click handlers', async () => {
    setupBaseMocks()
    const open = vi.fn()
    vi.stubGlobal('open', open)
    const { default: plugin } = await import('../status-bar-help')
    const ctx = createCtx()
    plugin.register(ctx)

    const menu = applyMenus(ctx)['status-bar-help']
    item(menu, 'show-premium').onClick()
    item(menu, 'show-shortcuts').onClick()
    item(menu, 'visit-guide').onClick()
    item(menu, 'show-readme').onClick()
    item(menu, 'show-plugin').onClick()
    item(menu, 'show-features').onClick()
    item(menu, 'about').onClick()

    expect(ctx.showPremium).toHaveBeenCalledTimes(1)
    expect(ctx.handlers.get('keyboard-shortcuts.show-manager')).toHaveBeenCalledTimes(1)
    expect(open).toHaveBeenCalledWith(expect.stringContaining('yank-note'), '_blank')
    expect(ctx.doc.showHelp).toHaveBeenCalledWith('README.md')
    expect(ctx.doc.showHelp).toHaveBeenCalledWith('PLUGIN.md')
    expect(ctx.doc.showHelp).toHaveBeenCalledWith('FEATURES.md')
    expect(ctx.modal.alert).toHaveBeenCalledWith(expect.objectContaining({
      title: 'about app-name',
    }))

    ctx.i18n.getCurrentLanguage.mockReturnValue('zh-CN')
    ctx.actions.get('plugin.status-bar-help.show-readme').handler()
    expect(ctx.doc.showHelp).toHaveBeenLastCalledWith('README_ZH-CN.md')
  })

  it('registers view menu items and runs their layout/editor actions', async () => {
    setupBaseMocks()
    const { default: plugin } = await import('../status-bar-view')
    const ctx = createCtx()
    plugin.register(ctx)

    const menu = applyMenus(ctx)['status-bar-view']
    expect(menu.position).toBe('left')
    expect(menu.list.map((entry: any) => entry.id).filter(Boolean)).toEqual([
      'word-wrap',
      'typewriter-mode',
      'toggle-side',
      'toggle-editor',
      'toggle-view',
      'toggle-xterm',
      'toggle-content-right-side',
      'toggle-editor-preview-exclusive',
    ])

    item(menu, 'word-wrap').onClick()
    item(menu, 'typewriter-mode').onClick()
    item(menu, 'toggle-side').onClick()
    item(menu, 'toggle-editor').onClick()
    item(menu, 'toggle-view').onClick()
    item(menu, 'toggle-xterm').onClick()
    item(menu, 'toggle-content-right-side').onClick()
    item(menu, 'toggle-editor-preview-exclusive').onClick()

    expect(ctx.editor.toggleWrap).toHaveBeenCalledTimes(1)
    expect(ctx.editor.toggleTypewriterMode).toHaveBeenCalledTimes(1)
    expect(ctx.layout.toggleSide).toHaveBeenCalledTimes(1)
    expect(ctx.layout.toggleEditor).toHaveBeenCalledTimes(1)
    expect(ctx.layout.toggleView).toHaveBeenCalledTimes(1)
    expect(ctx.layout.toggleXterm).toHaveBeenCalledTimes(1)
    expect(ctx.layout.toggleContentRightSide).toHaveBeenCalledTimes(1)
    expect(ctx.layout.toggleEditorPreviewExclusive).toHaveBeenCalledTimes(1)
  })

  it('omits optional view entries when xterm and right-side panels are unavailable', async () => {
    setupBaseMocks({ FLAG_DISABLE_XTERM: true })
    const { default: plugin } = await import('../status-bar-view')
    const ctx = createCtx({
      workbench: {
        ContentRightSide: { getAllPanels: vi.fn(() => []) },
        ControlCenter: { toggle: vi.fn() },
      },
    })
    plugin.register(ctx)

    const menu = applyMenus(ctx)['status-bar-view']
    expect(menu.list.map((entry: any) => entry.id).filter(Boolean)).toEqual([
      'word-wrap',
      'typewriter-mode',
      'toggle-side',
      'toggle-editor',
      'toggle-view',
      'toggle-editor-preview-exclusive',
    ])
  })

  it('switches theme from status menu and registered action with premium checks', async () => {
    setupBaseMocks()
    const { default: plugin } = await import('../status-bar-theme')
    const warningToast = { show: vi.fn() }
    const ctx = createCtx({
      ui: { useToast: vi.fn(() => warningToast) },
    })
    plugin.register(ctx)

    ctx.hooks.get('THEME_CHANGE')()
    expect(ctx.statusBar.refreshMenu).toHaveBeenCalledTimes(1)

    const menu = applyMenus(ctx)['status-bar-theme']
    expect(menu.icon).toBe('sun-solid')
    menu.onClick()
    expect(ctx.theme.setTheme).toHaveBeenCalledWith('dark')
    expect(warningToast.show).toHaveBeenCalledWith('info', 'status-bar.theme.tips:status-bar.theme.dark')

    ctx.getPremium.mockReturnValue(false)
    ctx.actions.get('plugin.status-bar-theme.switch').handler()
    expect(ctx.showPremium).toHaveBeenCalledTimes(1)
    expect(warningToast.show).toHaveBeenCalledWith('warning', 'premium.need-purchase:Theme')
  })

  it('registers document info menu, focuses editor and adds styles', async () => {
    setupBaseMocks()
    let selectionInfo = {
      textLength: 1,
      selectedLength: 0,
      selectedLines: 0,
      lineCount: 1,
      line: 1,
      column: 1,
      selectionCount: 1,
    }
    let cursorHandler: Function
    let modelHandler: Function
    const disposeSelection = vi.fn()
    const disposeModel = vi.fn()
    vi.doMock('@fe/services/i18n', () => ({
      useI18n: () => ({ $t: { value: (key: string) => key } }),
    }))
    vi.doMock('@fe/services/editor', () => ({
      getSelectionInfo: vi.fn(() => selectionInfo),
      whenEditorReady: vi.fn(() => Promise.resolve({
        editor: {
          onDidChangeCursorSelection: vi.fn((handler: Function) => {
            cursorHandler = handler
            return { dispose: disposeSelection }
          }),
          onDidChangeModel: vi.fn((handler: Function) => {
            modelHandler = handler
            return { dispose: disposeModel }
          }),
        },
      })),
    }))
    const { default: plugin } = await import('../status-bar-document-info')
    const ctx = createCtx()
    plugin.register(ctx)

    const menu = applyMenus(ctx)['status-bar-document-info']
    expect(menu.order).toBe(-1024)
    menu.onClick()
    expect(ctx.editorInstance.focus).toHaveBeenCalledTimes(1)
    expect(ctx.editor.getEditor).toHaveBeenCalledTimes(2)
    expect(ctx.editorActionRun).toHaveBeenCalledTimes(1)
    expect(ctx.theme.addStyles).toHaveBeenCalledWith(expect.stringContaining('.document-info'))

    const wrapper = mount(menu.title)
    await Promise.resolve()
    await nextTick()
    expect(wrapper.text()).toContain('L 1,C 1')
    expect(wrapper.text()).toContain('status-bar.document-info.lines: 1')
    expect(wrapper.text()).toContain('status-bar.document-info.chars: 1')

    selectionInfo = { ...selectionInfo, selectedLength: 4, selectedLines: 2, line: 3, column: 5 }
    cursorHandler!()
    await nextTick()
    expect(wrapper.text()).toContain('L 3,C 5')
    expect(wrapper.text()).toContain('status-bar.document-info.selected: 4, 2')

    selectionInfo = { ...selectionInfo, selectionCount: 3, selectedLength: 0 }
    modelHandler!()
    await nextTick()
    expect(wrapper.text()).toContain('status-bar.document-info.selections: 3')
    wrapper.unmount()
    expect(disposeSelection).toHaveBeenCalledTimes(1)
    expect(disposeModel).toHaveBeenCalledTimes(1)

    ctx.store.state.showEditor = false
    menu.onClick()
    expect(ctx.editor.getEditor).toHaveBeenCalledTimes(2)
  })

  it('runs premium confetti handler from menu and action', async () => {
    setupBaseMocks()
    const { default: plugin } = await import('../status-bar-premium')
    const ctx = createCtx()
    plugin.register(ctx)

    const menu = applyMenus(ctx)['status-bar-confetti']
    menu.onClick()
    expect(ctx.lib.confetti).toHaveBeenCalledWith(expect.objectContaining({
      particleCount: 150,
      spread: 100,
    }))

    ctx.getPremium.mockReturnValue(false)
    ctx.actions.get('plugin.status-bar-confetti.show').handler()
    expect(ctx.showPremium).toHaveBeenCalledTimes(1)
    expect(ctx.theme.addStyles).toHaveBeenCalledWith(expect.stringContaining('status-bar-confetti'))
  })

  it('registers terminal menu and invokes toggle action', async () => {
    setupBaseMocks()
    const { default: plugin } = await import('../status-bar-terminal')
    const ctx = createCtx()
    plugin.register(ctx)

    const menu = applyMenus(ctx)['status-bar-terminal']
    menu.onClick()
    expect(ctx.handlers.get('layout.toggle-xterm')).toHaveBeenCalledTimes(1)
  })

  it('does not register terminal menu when xterm is disabled', async () => {
    setupBaseMocks({ FLAG_DISABLE_XTERM: true })
    const { default: plugin } = await import('../status-bar-terminal')
    const ctx = createCtx()
    plugin.register(ctx)

    expect(applyMenus(ctx)['status-bar-terminal']).toBeUndefined()
  })

  it('registers tool menu and runs print/export branches', async () => {
    setupBaseMocks()
    vi.useFakeTimers()
    const { default: plugin } = await import('../status-bar-tool')
    const ctx = createCtx()
    plugin.register(ctx)

    const menu = applyMenus(ctx)['status-bar-tool']
    expect(item(menu, 'print').hidden).toBe(false)
    item(menu, 'print').onClick()
    vi.runAllTimers()
    item(menu, 'export').onClick()
    expect(ctx.export.printCurrentDocument).toHaveBeenCalledTimes(1)
    expect(ctx.export.toggleExportPanel).toHaveBeenCalledTimes(1)

    ctx.store.state.previewer = 'custom'
    const hiddenMenu = applyMenus(ctx)['status-bar-tool']
    expect(item(hiddenMenu, 'print').hidden).toBe(true)
    expect(item(hiddenMenu, 'export').hidden).toBe(true)
  })

  it('registers demo get-application menu and opens links', async () => {
    setupBaseMocks({ FLAG_DEMO: true })
    const open = vi.fn()
    vi.stubGlobal('open', open)
    const { default: plugin } = await import('../status-bar-get')
    const ctx = createCtx()
    plugin.register(ctx)

    const menu = applyMenus(ctx)['status-bar-get']
    item(menu, 'github').onClick()
    item(menu, 'mas').onClick()
    expect(open).toHaveBeenCalledWith('https://github.example/yn/releases')
    expect(open).toHaveBeenCalledWith('macappstore://yn')
  })

  it('does not register get-application menu outside demo mode', async () => {
    setupBaseMocks({ FLAG_DEMO: false })
    const { default: plugin } = await import('../status-bar-get')
    const ctx = createCtx()
    plugin.register(ctx)

    expect(applyMenus(ctx)['status-bar-get']).toBeUndefined()
  })

  it('registers history menu only when history action exists', async () => {
    setupBaseMocks()
    const { default: plugin } = await import('../status-bar-history')
    const historyAction = { name: 'doc.show-history', handler: vi.fn() }
    const ctx = createCtx()
    ctx.actions.set(historyAction.name, historyAction)
    plugin.register(ctx)

    const menu = applyMenus(ctx)['status-bar-history']
    menu.onClick()
    expect(historyAction.handler).toHaveBeenCalledTimes(1)

    const missingCtx = createCtx()
    plugin.register(missingCtx)
    expect(applyMenus(missingCtx)['status-bar-history']).toBeUndefined()
  })

  it('registers navigation menu and preserves reveal visibility branch', async () => {
    setupBaseMocks()
    const { default: plugin } = await import('../status-bar-navigation')
    const ctx = createCtx()
    plugin.register(ctx)

    const menu = applyMenus(ctx)['status-bar-navigation']
    item(menu, 'show-quick-open').onClick()
    item(menu, 'reveal-current-file-in-sidebar').onClick()
    expect(ctx.handlers.get('workbench.show-quick-open')).toHaveBeenCalledTimes(1)
    expect(ctx.handlers.get('tree.reveal-current-node')).toHaveBeenCalledTimes(1)
    expect(item(menu, 'reveal-current-file-in-sidebar').hidden).toBe(false)

    ctx.store.state.currentFile.repo = 'other'
    const hiddenMenu = applyMenus(ctx)['status-bar-navigation']
    expect(item(hiddenMenu, 'reveal-current-file-in-sidebar').hidden).toBe(true)
  })

  it('registers setting, insert and presentation status menus', async () => {
    setupBaseMocks()
    const setting = (await import('../status-bar-setting')).default
    const insert = (await import('../status-bar-insert')).default
    const presentation = (await import('../status-bar-presentation')).default
    const ctx = createCtx()
    ctx.actions.set('view.enter-presentation', { name: 'view.enter-presentation' })

    setting.register(ctx)
    insert.register(ctx)
    presentation.register(ctx)

    const menus = applyMenus(ctx)
    menus['status-bar-setting'].onClick()
    expect(ctx.setting.showSettingPanel).toHaveBeenCalledTimes(1)
    expect(menus['status-bar-insert'].hidden).toBe(false)
    menus['status-bar-presentation'].onClick()
    expect(ctx.view.enterPresent).toHaveBeenCalledTimes(1)
    expect(ctx.workbench.ControlCenter.toggle).toHaveBeenCalledWith(false)

    ctx.editor.isDefault.mockReturnValue(false)
    expect(applyMenus(ctx)['status-bar-insert'].hidden).toBe(true)
  })

  it('registers extension menu and prepends tool menu entry when available', async () => {
    setupBaseMocks()
    const { default: plugin } = await import('../status-bar-extension')
    const ctx = createCtx()
    plugin.register(ctx)

    const menus = applyMenus(ctx, {
      'status-bar-tool': {
        list: [{ id: 'existing' }],
      },
    })
    item(menus['status-bar-tool'], 'extension-manager').onClick()
    menus['status-bar-extension'].onClick()
    expect(menus['status-bar-tool'].list[0].id).toBe('extension-manager')
    expect(ctx.showExtensionManager).toHaveBeenCalledTimes(2)

    const standaloneCtx = createCtx()
    plugin.register(standaloneCtx)
    expect(applyMenus(standaloneCtx)['status-bar-extension'].id).toBe('status-bar-extension')
  })
})
