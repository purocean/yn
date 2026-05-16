const mocks = vi.hoisted(() => ({
  args: new Map<string, string>(),
  state: {
    currentRepo: { name: 'repo-a', path: '/repos/a' } as any,
  },
  switchDoc: vi.fn(),
  whenEditorReady: vi.fn(() => Promise.resolve({})),
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: mocks.state,
  },
}))

vi.mock('@fe/support/args', () => ({
  $args: vi.fn(() => ({
    get: (key: string) => mocks.args.get(key),
  })),
}))

vi.mock('@fe/utils/path', () => ({
  basename: vi.fn((filePath: string) => filePath.split('/').pop()),
}))

vi.mock('@fe/services/document', () => ({
  switchDoc: mocks.switchDoc,
}))

vi.mock('@fe/services/editor', () => ({
  whenEditorReady: mocks.whenEditorReady,
}))

import repositorySwitch from '../status-bar-repository-switch'

function createCtx () {
  const hooks = new Map<string, Function>()
  const actions = new Map<string, any>()
  const repos = [
    { name: 'repo-a', path: '/repos/a', enableIndexing: true },
    { name: 'repo-b', path: '/repos/b', enableIndexing: false },
    { name: 'repo-c', path: '/repos/c', enableIndexing: true },
  ]
  return {
    action: {
      registerAction: vi.fn((action: any) => actions.set(action.name, action)),
    },
    i18n: {
      t: vi.fn((key: string, ...args: string[]) => [key, ...args].filter(Boolean).join(':')),
    },
    keybinding: {
      Alt: 'Alt',
      getKeysLabel: vi.fn((keys: any) => Array.isArray(keys) ? keys.join('+') : `keys:${keys}`),
    },
    lib: {
      vue: {
        watch: vi.fn(),
      },
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    repo: {
      getAllRepos: vi.fn(() => repos),
      setCurrentRepo: vi.fn(),
    },
    statusBar: {
      refreshMenu: vi.fn(),
      tapMenus: vi.fn(),
    },
    _actions: actions,
    _hooks: hooks,
    _repos: repos,
  } as any
}

describe('status-bar-repository-switch plugin', () => {
  beforeEach(() => {
    mocks.args.clear()
    mocks.state.currentRepo = { name: 'repo-a', path: '/repos/a' }
    mocks.switchDoc.mockReset()
    mocks.whenEditorReady.mockReset()
    mocks.whenEditorReady.mockResolvedValue({})
  })

  test('builds the repository status-bar menu with shortcuts and checked state', () => {
    const ctx = createCtx()

    repositorySwitch.register(ctx)
    const menus = {} as any
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)

    expect(menus['status-bar-repository-switch']).toMatchObject({
      id: 'status-bar-repository-switch',
      position: 'left',
      title: 'status-bar.repo.repo:repo-a',
    })
    expect(menus['status-bar-repository-switch'].list.map((item: any) => ({
      id: item.id,
      checked: item.checked,
      subTitle: item.subTitle,
    }))).toEqual([
      { id: 'repo-a', checked: true, subTitle: 'keys:base.switch-repository-1' },
      { id: 'repo-b', checked: false, subTitle: 'keys:base.switch-repository-2' },
      { id: 'repo-c', checked: false, subTitle: 'keys:base.switch-repository-0' },
    ])

    menus['status-bar-repository-switch'].list[1].onClick()
    expect(ctx.repo.setCurrentRepo).toHaveBeenCalledWith('repo-b')
  })

  test('initializes repo and file from startup arguments after editor readiness', async () => {
    const ctx = createCtx()
    mocks.args.set('init-repo', 'repo-b')
    mocks.args.set('init-file', '/docs/start.md')

    repositorySwitch.register(ctx)
    await mocks.whenEditorReady.mock.results[0].value

    expect(ctx.repo.setCurrentRepo).toHaveBeenCalledWith('repo-b')
    expect(mocks.switchDoc).toHaveBeenCalledWith({
      type: 'file',
      repo: 'repo-b',
      name: 'start.md',
      path: '/docs/start.md',
    })
  })

  test('continues startup file switching if init repo selection throws', async () => {
    const ctx = createCtx()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ctx.repo.setCurrentRepo.mockImplementationOnce(() => {
      throw new Error('missing repo')
    })
    mocks.args.set('init-repo', 'missing')
    mocks.args.set('init-file', '/docs/fallback.md')

    repositorySwitch.register(ctx)
    await mocks.whenEditorReady.mock.results[0].value

    expect(errorSpy).toHaveBeenCalled()
    expect(mocks.switchDoc).toHaveBeenCalledWith(expect.objectContaining({
      repo: 'missing',
      name: 'fallback.md',
    }))
  })

  test('reacts to settings fetches by switching missing repos or refreshing the menu', () => {
    const ctx = createCtx()
    repositorySwitch.register(ctx)

    ctx._hooks.get('SETTING_FETCHED')({ settings: { repos: [{ name: 'repo-z', path: '/repos/z' }] } })
    expect(ctx.repo.setCurrentRepo).toHaveBeenLastCalledWith('repo-z')

    ctx.repo.setCurrentRepo.mockClear()
    ctx._hooks.get('SETTING_FETCHED')({ settings: { repos: [{ name: 'repo-a', path: '/repos/a' }] } })
    expect(ctx.repo.setCurrentRepo).not.toHaveBeenCalled()
    expect(ctx.statusBar.refreshMenu).toHaveBeenCalled()
  })

  test('registers repository switch actions and a repository list MCP action', () => {
    const ctx = createCtx()

    repositorySwitch.register(ctx)

    expect(ctx.action.registerAction).toHaveBeenCalledTimes(11)
    ctx._actions.get('base.switch-repository-0').handler()
    ctx._actions.get('base.switch-repository-2').handler()
    ctx._actions.get('base.switch-repository-9').handler()
    expect(ctx.repo.setCurrentRepo).toHaveBeenCalledWith('repo-c')
    expect(ctx.repo.setCurrentRepo).toHaveBeenCalledWith('repo-b')

    expect(ctx._actions.get('base.list-repositories').handler()).toEqual([
      { name: 'repo-a', path: '/repos/a', enableIndexing: true },
      { name: 'repo-b', path: '/repos/b', enableIndexing: false },
      { name: 'repo-c', path: '/repos/c', enableIndexing: true },
    ])
  })

  test('handles an empty current repository in the status-bar title and settings hook', () => {
    const ctx = createCtx()
    mocks.state.currentRepo = null

    repositorySwitch.register(ctx)
    const menus = {} as any
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)
    ctx._hooks.get('SETTING_FETCHED')({ settings: { repos: [{ name: 'repo-a', path: '/repos/a' }] } })

    expect(menus['status-bar-repository-switch'].title).toBe('status-bar.repo.no-data')
    expect(ctx.repo.setCurrentRepo).toHaveBeenCalledWith('repo-a')
  })
})
