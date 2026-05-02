const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  component: null as any,
  confirm: vi.fn(),
  copyText: vi.fn(),
  refValues: [] as any[],
  rpc: vi.fn(),
  sleep: vi.fn(() => Promise.resolve()),
  watch: vi.fn(),
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/support/args', () => ({
  FLAG_MAS: false,
}))

import sharePreview from '../share-preview'

function createCtx () {
  const hooks = new Map<string, Function>()
  return {
    api: {
      rpc: mocks.rpc,
    },
    args: {
      MODE: 'normal',
      $args: vi.fn(() => ({ get: vi.fn(() => '4173') })),
    },
    i18n: {
      t: vi.fn((key: string) => key),
    },
    lib: {
      vue: {
        defineComponent: vi.fn((component: any) => {
          mocks.component = component
          return component
        }),
        onMounted: vi.fn((fn: Function) => fn()),
        ref: vi.fn((value: any) => {
          const ref = { value }
          mocks.refValues.push(ref)
          return ref
        }),
        watch: mocks.watch,
      },
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    setting: {
      getSetting: vi.fn(() => '0.0.0.0'),
      showSettingPanel: vi.fn(),
    },
    statusBar: {
      tapMenus: vi.fn(),
    },
    store: {
      state: {
        currentFile: { repo: 'repo-a', path: '/docs/current.md' },
        presentation: false,
      },
      watch: vi.fn((_source: Function, cb: Function, options: any) => {
        if (options?.immediate) cb(false)
      }),
    },
    theme: {
      addStyles: vi.fn(),
    },
    ui: {
      useModal: vi.fn(() => ({ alert: mocks.alert, confirm: mocks.confirm })),
      useToast: vi.fn(() => ({ show: vi.fn() })),
    },
    utils: {
      copyText: mocks.copyText,
      sleep: mocks.sleep,
    },
    view: {
      getRenderEnv: vi.fn(() => ({ safeMode: false })),
    },
    _hooks: hooks,
  } as any
}

describe('share-preview plugin', () => {
  beforeEach(() => {
    mocks.alert.mockReset()
    mocks.component = null
    mocks.confirm.mockReset()
    mocks.confirm.mockResolvedValue(true)
    mocks.copyText.mockReset()
    mocks.refValues.length = 0
    mocks.rpc.mockReset()
    mocks.rpc
      .mockResolvedValueOnce(['192.168.1.10', '10.0.0.2'])
      .mockResolvedValueOnce('jwt-token')
    mocks.sleep.mockClear()
    mocks.watch.mockReset()
  })

  test('enforces presentation mode during share-preview startup', () => {
    const ctx = createCtx()
    ctx.args.MODE = 'share-preview'

    sharePreview.register(ctx)
    ctx._hooks.get('STARTUP')()

    expect(ctx.store.watch).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { immediate: true })
    expect(ctx.store.state.presentation).toBe(true)
  })

  test('registers status-bar share menu and styles with safe-mode visibility', () => {
    const ctx = createCtx()

    sharePreview.register(ctx)
    const menus = { 'status-bar-tool': { list: [] as any[] } }
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)

    expect(menus['status-bar-tool'].list[0]).toMatchObject({
      id: 'plugin.share-preview',
      hidden: false,
      ellipsis: true,
    })
    expect(ctx.theme.addStyles).toHaveBeenCalledWith(expect.stringContaining('.share-preview-options-wrapper'))
  })

  test('alerts and opens server host setting when sharing is not bound to all interfaces', async () => {
    const ctx = createCtx()
    ctx.setting.getSetting.mockReturnValue('127.0.0.1')
    sharePreview.register(ctx)
    const menus = { 'status-bar-tool': { list: [] as any[] } }
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)

    await menus['status-bar-tool'].list[0].onClick()

    expect(mocks.sleep).toHaveBeenCalledWith(100)
    expect(mocks.alert).toHaveBeenCalledWith({
      title: 'status-bar.tool.share-preview',
      content: 'share-preview.tips',
    })
    expect(ctx.setting.showSettingPanel).toHaveBeenCalledWith('server.host')
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  test('copies the generated share link when the options modal is confirmed', async () => {
    const ctx = createCtx()
    sharePreview.register(ctx)
    const link = mocks.refValues[0]
    link.value = 'http://192.168.1.10/?mode=share-preview'
    const menus = { 'status-bar-tool': { list: [] as any[] } }
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)

    await menus['status-bar-tool'].list[0].onClick()

    expect(mocks.confirm).toHaveBeenCalledWith({
      title: 'status-bar.tool.share-preview',
      component: mocks.component,
    })
    expect(mocks.copyText).toHaveBeenCalledWith('http://192.168.1.10/?mode=share-preview')
  })

  test('panel loads local IPs and builds a tokenized share-preview URL', async () => {
    const ctx = createCtx()
    sharePreview.register(ctx)

    mocks.component.setup()
    await Promise.resolve()
    const link = mocks.refValues[0]
    const ip = mocks.refValues[1]
    const expire = mocks.refValues[2]
    const ips = mocks.refValues[3]

    expect(ips.value).toEqual(['192.168.1.10', '10.0.0.2'])
    expect(ip.value).toBe('192.168.1.10')

    const watchCallback = mocks.watch.mock.calls[0][1]
    await watchCallback([expire.value, ip.value])

    expect(mocks.rpc).toHaveBeenCalledWith("return require('./jwt').getToken({ role: 'guest' }, '2h')")
    expect(link.value).toContain('mode=share-preview')
    expect(link.value).toContain('token=jwt-token')
    expect(link.value).toContain('init-repo=repo-a')
    expect(link.value).toContain('init-file=%2Fdocs%2Fcurrent.md')
  })

  test('panel watcher clears link and exits without current file or complete options', async () => {
    const ctx = createCtx()
    ctx.store.state.currentFile = null
    sharePreview.register(ctx)
    mocks.component.setup()
    const link = mocks.refValues[0]
    link.value = 'old'
    const watchCallback = mocks.watch.mock.calls[0][1]

    await watchCallback(['2h', '192.168.1.10'])
    await watchCallback(['', '192.168.1.10'])

    expect(link.value).toBe('')
  })
})
