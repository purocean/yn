const mocks = vi.hoisted(() => ({
  resolveProxy: vi.fn(),
  proxyAgent: vi.fn(),
  agent: vi.fn(),
  buildConnector: vi.fn(),
  createConnection: vi.fn(),
}))

vi.mock('electron', () => ({
  session: {
    defaultSession: {
      resolveProxy: (...args: any[]) => mocks.resolveProxy(...args),
    },
  },
}))

vi.mock('undici', () => {
  const buildConnector = (...args: any[]) => mocks.buildConnector(...args)
  return {
    ProxyAgent: function ProxyAgent (url: string) {
      mocks.proxyAgent(url)
      return { type: 'proxy-agent', url }
    },
    Agent: function Agent (options: any) {
      mocks.agent(options)
      return { type: 'agent', options }
    },
    buildConnector,
  }
})

vi.mock('socks', () => ({
  SocksClient: {
    createConnection: (...args: any[]) => mocks.createConnection(...args),
  },
}))

async function loadProxyDispatcher () {
  vi.resetModules()
  return await import('../proxy-dispatcher')
}

describe('proxy-dispatcher module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.buildConnector.mockReturnValue((_options: any, callback: Function) => callback(null, 'direct-socket'))
  })

  test('creates SOCKS and HTTP proxy dispatchers from proxy URLs', async () => {
    const { newProxyDispatcher } = await loadProxyDispatcher()

    expect(newProxyDispatcher('socks5://127.0.0.1:1080')).toEqual({
      type: 'agent',
      options: {
        connect: expect.any(Function),
      },
    })
    expect(mocks.agent).toHaveBeenCalledWith({ connect: expect.any(Function) })

    expect(newProxyDispatcher('http://proxy.local:8080')).toEqual({
      type: 'proxy-agent',
      url: 'http://proxy.local:8080',
    })
    expect(mocks.proxyAgent).toHaveBeenCalledWith('http://proxy.local:8080')
  })

  test('resolves Electron proxy strings into dispatchers', async () => {
    mocks.resolveProxy.mockResolvedValueOnce('PROXY proxy.local:8080; DIRECT')
    let { getProxyDispatcher } = await loadProxyDispatcher()

    await expect(getProxyDispatcher('https://target.test')).resolves.toEqual({
      type: 'proxy-agent',
      url: 'http://proxy.local:8080',
    })

    mocks.resolveProxy.mockResolvedValueOnce('HTTPS secure.local:8443')
    await expect(getProxyDispatcher('https://target.test')).resolves.toEqual({
      type: 'proxy-agent',
      url: 'https://secure.local:8443',
    })

    mocks.resolveProxy.mockResolvedValueOnce('SOCKS 127.0.0.1:1080')
    ;({ getProxyDispatcher } = await loadProxyDispatcher())
    await expect(getProxyDispatcher('https://target.test')).resolves.toEqual({
      type: 'agent',
      options: { connect: expect.any(Function) },
    })

    mocks.resolveProxy.mockResolvedValueOnce('DIRECT')
    await expect(getProxyDispatcher('https://target.test')).resolves.toBeUndefined()
    mocks.resolveProxy.mockResolvedValueOnce('')
    await expect(getProxyDispatcher('https://target.test')).resolves.toBeUndefined()
  })

  test('connects through SOCKS chain and upgrades HTTPS with undici connector', async () => {
    const socksSocket = { setNoDelay: vi.fn(() => 'no-delay-socket') }
    mocks.createConnection.mockResolvedValue({ socket: socksSocket })
    const undiciConnect = vi.fn((_options, callback) => callback(null, 'tls-socket'))
    mocks.buildConnector.mockReturnValue(undiciConnect)
    const { socksConnector } = await loadProxyDispatcher()

    const connect = socksConnector([
      { type: 5, host: 'one.local', port: 1001 },
      { type: 5, host: 'two.local', port: 1002 },
    ], { timeout: 123 })

    const callback = vi.fn()
    await connect({
      protocol: 'https:',
      hostname: 'target.local',
      port: '',
    } as any, callback)

    expect(mocks.createConnection).toHaveBeenNthCalledWith(1, {
      command: 'connect',
      proxy: { type: 5, host: 'one.local', port: 1001 },
      timeout: 123,
      destination: { host: 'two.local', port: 1002 },
      existing_socket: undefined,
    })
    expect(mocks.createConnection).toHaveBeenNthCalledWith(2, {
      command: 'connect',
      proxy: { type: 5, host: 'two.local', port: 1002 },
      timeout: 123,
      destination: { host: 'target.local', port: 443 },
      existing_socket: socksSocket,
    })
    expect(undiciConnect).toHaveBeenCalledWith(expect.objectContaining({ httpSocket: socksSocket }), callback)
    expect(callback).toHaveBeenCalledWith(null, 'tls-socket')
  })

  test('returns raw SOCKS socket for HTTP and forwards SOCKS errors', async () => {
    const socksSocket = { setNoDelay: vi.fn(() => 'no-delay-socket') }
    mocks.createConnection.mockResolvedValueOnce({ socket: socksSocket })
    const { socksConnector } = await loadProxyDispatcher()
    const connect = socksConnector({ type: 5, host: 'one.local', port: 1001 })

    let callback = vi.fn()
    await connect({
      protocol: 'http:',
      hostname: 'target.local',
      port: '',
    } as any, callback)

    expect(callback).toHaveBeenCalledWith(null, 'no-delay-socket')
    expect(mocks.createConnection).toHaveBeenCalledWith(expect.objectContaining({
      destination: { host: 'target.local', port: 80 },
    }))

    const error = new Error('connect failed')
    mocks.createConnection.mockRejectedValueOnce(error)
    callback = vi.fn()
    await connect({
      protocol: 'http:',
      hostname: 'target.local',
      port: '8080',
    } as any, callback)

    expect(callback).toHaveBeenCalledWith(error, null)
  })
})
