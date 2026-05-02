const mocks = vi.hoisted(() => ({
  fixedFloatShow: vi.fn(),
  fixedFloatHide: vi.fn(),
  registeredAction: undefined as any,
  tapActionBtns: vi.fn(),
  actionHandler: vi.fn(),
}))

vi.mock('../ViewLinksComponent.vue', () => ({
  default: { name: 'ViewLinksComponent' },
}))

import ViewLinksComponent from '../ViewLinksComponent.vue'
import viewLinksPlugin from '../index'

function createCtx (overrides: Record<string, any> = {}) {
  const state = {
    currentRepo: { name: 'repo-a' },
    currentFile: { repo: 'repo-a', path: '/current.md', name: 'current.md' },
    currentRepoIndexStatus: { repo: 'repo-a', status: { ready: true } },
    ...(overrides.state || {}),
  }

  return {
    args: {
      FLAG_DEMO: false,
      MODE: 'normal',
      HELP_REPO_NAME: 'help',
      ...(overrides.args || {}),
    },
    env: {
      isElectron: true,
      ...(overrides.env || {}),
    },
    store: { state },
    i18n: { t: vi.fn((key: string) => key) },
    keybinding: { getKeysLabel: vi.fn((name: string) => `[${name}]`) },
    ui: {
      useFixedFloat: () => ({
        show: mocks.fixedFloatShow,
        hide: mocks.fixedFloatHide,
      }),
    },
    action: {
      registerAction: vi.fn((action: any) => { mocks.registeredAction = action }),
      getActionHandler: vi.fn(() => mocks.actionHandler),
    },
    workbench: {
      FileTabs: {
        tapActionBtns: mocks.tapActionBtns,
      },
    },
  } as any
}

beforeEach(() => {
  mocks.fixedFloatShow.mockReset()
  mocks.fixedFloatHide.mockReset()
  mocks.registeredAction = undefined
  mocks.tapActionBtns.mockReset()
  mocks.actionHandler.mockReset()
})

describe('view-links plugin entry', () => {
  test('registers user and MCP action that opens the fixed float', () => {
    const ctx = createCtx()
    viewLinksPlugin.register(ctx)

    expect(ctx.action.registerAction).toHaveBeenCalledWith(expect.objectContaining({
      name: 'plugin.view-links.view-document-links',
      forUser: true,
      forMcp: true,
      mcpDescription: 'View document links. No args. No return.',
      description: 'command-desc.plugin_view-links_view-document-links',
      handler: expect.any(Function),
      when: expect.any(Function),
    }))
    expect(mocks.registeredAction.when()).toBe(true)

    mocks.registeredAction.handler()
    expect(mocks.fixedFloatShow).toHaveBeenCalledWith(expect.objectContaining({
      right: '20px',
      top: '66px',
      component: ViewLinksComponent,
      closeOnBlur: false,
      closeBtn: true,
      onBlur: expect.any(Function),
    }))

    const onBlur = mocks.fixedFloatShow.mock.calls[0][0].onBlur
    ctx.store.state.currentRepoIndexStatus.repo = 'repo-b'
    onBlur(false)
    expect(mocks.fixedFloatHide).toHaveBeenCalledTimes(1)

    onBlur(true)
    expect(mocks.fixedFloatHide).toHaveBeenCalledTimes(1)
  })

  test('registers FileTabs button and invokes the action handler', () => {
    const ctx = createCtx()
    viewLinksPlugin.register(ctx)

    expect(mocks.tapActionBtns).toHaveBeenCalledWith(expect.any(Function))
    const btns: any[] = []
    mocks.tapActionBtns.mock.calls[0][0](btns)

    expect(btns).toEqual([
      { type: 'separator' },
      expect.objectContaining({
        type: 'normal',
        key: 'plugin.view-links.view-document-links',
        icon: 'link-solid',
        title: 'view-links.view-links [plugin.view-links.view-document-links]',
        onClick: expect.any(Function),
      }),
      { type: 'separator' },
    ])

    btns[1].onClick()
    expect(ctx.action.getActionHandler).toHaveBeenCalledWith('plugin.view-links.view-document-links')
    expect(mocks.actionHandler).toHaveBeenCalled()
  })

  test('does not expose action button when plugin conditions are not met', () => {
    const cases = [
      createCtx({ args: { FLAG_DEMO: true } }),
      createCtx({ args: { MODE: 'embed' } }),
      createCtx({ state: { currentRepo: null } }),
      createCtx({ state: { currentFile: null } }),
      createCtx({ state: { currentFile: { repo: 'help' } } }),
      createCtx({ state: { currentFile: { repo: '__root__/system' } } }),
    ]

    for (const ctx of cases) {
      mocks.tapActionBtns.mockClear()
      viewLinksPlugin.register(ctx)
      expect(mocks.registeredAction.when()).toBe(false)

      const btns: any[] = []
      mocks.tapActionBtns.mock.calls[0][0](btns)
      expect(btns).toEqual([])
    }
  })

  test('uses browser fixed-float offset outside Electron', () => {
    const ctx = createCtx({ env: { isElectron: false } })
    viewLinksPlugin.register(ctx)

    mocks.registeredAction.handler()
    expect(mocks.fixedFloatShow).toHaveBeenCalledWith(expect.objectContaining({ top: '36px' }))
  })
})
