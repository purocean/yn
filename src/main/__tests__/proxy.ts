const mocks = vi.hoisted(() => ({
  appendSwitch: vi.fn(),
  configGet: vi.fn(),
  registeredActions: {} as Record<string, Function>,
  setProxy: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    commandLine: {
      appendSwitch: (...args: any[]) => mocks.appendSwitch(...args),
    },
  },
  session: {
    defaultSession: {
      setProxy: (...args: any[]) => mocks.setProxy(...args),
    },
  },
}))

vi.mock('../config', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mocks.configGet(...args),
  }
}))

vi.mock('../action', () => ({
  registerAction: (name: string, handler: Function) => {
    mocks.registeredActions[name] = handler
  },
}))

async function loadProxy () {
  vi.resetModules()
  return await import('../proxy')
}

describe('main proxy module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.registeredActions = {}
    mocks.configGet.mockImplementation((_key: string, defaultValue: any) => defaultValue)
  })

  test('initializes command-line proxy switches only for enabled host:port proxy', async () => {
    mocks.configGet.mockImplementation((key: string, defaultValue: any) => ({
      'proxy.enabled': true,
      'proxy.server': '127.0.0.1:7890',
      'proxy.pac-url': 'http://pac.test/proxy.pac',
      'proxy.bypass-list': '<local>;example.com',
    } as Record<string, any>)[key] ?? defaultValue)
    const { initProxy } = await loadProxy()

    initProxy()

    expect(mocks.appendSwitch).toHaveBeenCalledWith('proxy-server', '127.0.0.1:7890')
    expect(mocks.appendSwitch).toHaveBeenCalledWith('proxy-pac-url', 'http://pac.test/proxy.pac')
    expect(mocks.appendSwitch).toHaveBeenCalledWith('proxy-bypass-list', '<local>;example.com')

    mocks.appendSwitch.mockClear()
    mocks.configGet.mockImplementation((key: string, defaultValue: any) => key === 'proxy.enabled' ? false : defaultValue)
    initProxy()
    expect(mocks.appendSwitch).not.toHaveBeenCalled()
  })

  test('registered reload action switches between configured proxy and system proxy', async () => {
    await loadProxy()

    mocks.registeredActions['proxy.reload']({
      'proxy.enabled': true,
      'proxy.server': 'http://proxy.test:8080',
      'proxy.bypass-list': '<local>',
      'proxy.pac-url': 'http://pac.test/proxy.pac',
    })
    expect(mocks.setProxy).toHaveBeenCalledWith({
      proxyRules: 'http://proxy.test:8080',
      proxyBypassRules: '<local>',
      pacScript: 'http://pac.test/proxy.pac',
    })

    mocks.registeredActions['proxy.reload']({ 'proxy.enabled': false })
    expect(mocks.setProxy).toHaveBeenLastCalledWith({ mode: 'system' })
  })
})
