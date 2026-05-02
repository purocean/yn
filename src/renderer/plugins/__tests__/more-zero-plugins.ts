describe('additional zero-coverage plugins', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('control center registers switch and navigation items', async () => {
    const { default: plugin } = await import('../control-center')
    const schema = {
      switch: { items: [] as any[] },
      navigation: { items: [] as any[] },
    }
    const quickOpen = vi.fn()
    const findInPreview = vi.fn()
    const ctx = {
      action: {
        getActionHandler: vi.fn((name: string) => name === 'workbench.show-quick-open' ? quickOpen : findInPreview),
      },
      editor: {
        toggleTypewriterMode: vi.fn(),
        toggleWrap: vi.fn(),
      },
      i18n: {
        t: vi.fn((key: string, keys?: string) => keys ? `${key}:${keys}` : key),
      },
      keybinding: {
        getKeysLabel: vi.fn((name: string) => `<${name}>`),
      },
      layout: {
        toggleEditor: vi.fn(),
        toggleSide: vi.fn(),
        toggleView: vi.fn(),
      },
      store: {
        state: {
          autoPreview: true,
          previewer: 'default',
          showEditor: true,
          showSide: false,
          showView: true,
          syncScroll: false,
          typewriterMode: false,
          wordWrap: 'on',
        },
      },
      view: {
        refresh: vi.fn(),
        toggleAutoPreview: vi.fn(),
        toggleSyncScroll: vi.fn(),
      },
      workbench: {
        ControlCenter: {
          tapSchema: vi.fn((fn: Function) => fn(schema)),
          toggle: vi.fn(),
        },
      },
    } as any

    plugin.register(ctx)

    expect(schema.switch.items).toHaveLength(8)
    expect(schema.navigation.items).toHaveLength(2)
    expect(schema.switch.items.map(item => item.icon)).toEqual([
      'side-bar',
      'edit-solid',
      'eye-regular',
      'columns-solid',
      'paint-roller',
      'text-width-solid',
      'keyboard-solid',
      'search-solid',
    ])
    expect(schema.switch.items.at(-1).hidden).toBe(false)

    schema.switch.items[0].onClick()
    schema.switch.items[1].onClick()
    schema.switch.items[2].onClick()
    schema.switch.items[3].onClick()
    schema.switch.items[4].onClick()
    schema.switch.items[5].onClick()
    schema.switch.items[6].onClick()
    schema.switch.items[7].onClick()
    expect(ctx.layout.toggleSide).toHaveBeenCalled()
    expect(ctx.layout.toggleEditor).toHaveBeenCalled()
    expect(ctx.layout.toggleView).toHaveBeenCalled()
    expect(ctx.view.toggleSyncScroll).toHaveBeenCalled()
    expect(ctx.view.toggleAutoPreview).toHaveBeenCalled()
    expect(ctx.view.refresh).toHaveBeenCalledTimes(1)
    expect(ctx.editor.toggleWrap).toHaveBeenCalled()
    expect(ctx.editor.toggleTypewriterMode).toHaveBeenCalled()
    expect(findInPreview).toHaveBeenCalled()

    schema.navigation.items[0].onClick()
    schema.navigation.items[1].onClick()
    expect(ctx.view.refresh).toHaveBeenCalledTimes(2)
    expect(quickOpen).toHaveBeenCalled()
    expect(ctx.workbench.ControlCenter.toggle).toHaveBeenCalledWith(false)
  })

  test('control center hides find in preview outside the default previewer', async () => {
    const { default: plugin } = await import('../control-center')
    const schema = { switch: { items: [] as any[] }, navigation: { items: [] as any[] } }
    plugin.register({
      action: { getActionHandler: vi.fn() },
      editor: {},
      i18n: { t: (key: string) => key },
      keybinding: { getKeysLabel: () => '' },
      layout: {},
      store: { state: { showView: false, previewer: 'custom' } },
      view: {},
      workbench: { ControlCenter: { tapSchema: (fn: Function) => fn(schema), toggle: vi.fn() } },
    } as any)

    expect(schema.switch.items.at(-1).hidden).toBe(true)
  })

  test('ai copilot code action appears only before the extension is loaded', async () => {
    let initialized = true
    let loadedVersion: string | undefined
    vi.doMock('@fe/others/extension', () => ({
      getInitialized: () => initialized,
      getLoadStatus: () => ({ version: loadedVersion }),
    }))

    const { default: plugin } = await import('../ai-copilot')
    let provider: any
    const ctx = {
      editor: {
        whenEditorReady: vi.fn(async () => ({
          monaco: {
            languages: {
              registerCodeActionProvider: vi.fn((_language: string, itemProvider: any) => {
                provider = itemProvider
              }),
            },
          },
        })),
      },
      i18n: { t: vi.fn((key: string) => `T_${key}`) },
      setting: { getSetting: vi.fn(() => true) },
      showExtensionManager: vi.fn(),
    } as any

    plugin.register(ctx)
    await Promise.resolve()

    const enabled = provider.provideCodeActions()
    expect(enabled.actions).toEqual([
      expect.objectContaining({
        title: 'T_edit-or-generate-text-using-ai',
        command: { id: 'install-ai-copilot-extension', title: 'T_edit-or-generate-text-using-ai' },
        kind: 'refactor',
        isPreferred: true,
      }),
    ])

    const resolved = await provider.resolveCodeAction(enabled.actions[0])
    expect(ctx.showExtensionManager).toHaveBeenCalledWith('@yank-note/extension-ai-copilot')
    expect(resolved.command).toBeUndefined()

    loadedVersion = '1.0.0'
    expect(provider.provideCodeActions().actions).toEqual([])
    loadedVersion = undefined
    initialized = false
    expect(provider.provideCodeActions().actions).toEqual([])
    initialized = true
    ctx.setting.getSetting.mockReturnValue(false)
    expect(provider.provideCodeActions().actions).toEqual([])
  })
})
