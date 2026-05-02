const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  getAction: vi.fn(),
  fetchToken: vi.fn(),
  removeDevice: vi.fn(),
  addDevice: vi.fn(),
  fetchDevices: vi.fn(),
  genDeviceString: vi.fn(),
  decodeDevice: vi.fn(),
  clientOptions: undefined as any,
}))

vi.mock('undici', () => ({
  request: (...args: any[]) => mocks.request(...args),
}))

vi.mock('../../action', () => ({
  getAction: (...args: any[]) => mocks.getAction(...args),
}))

vi.mock('../../../share/misc', () => ({
  API_BASE_URL: 'https://api.example.test',
  PREMIUM_PUBLIC_KEY: 'public-key',
}))

vi.mock('app-license', () => ({
  decodeDevice: (...args: any[]) => mocks.decodeDevice(...args),
  AppLicenseClient: class {
    constructor (options: any) {
      mocks.clientOptions = options
    }

    fetchToken (...args: any[]) {
      return mocks.fetchToken(...args)
    }

    removeDevice (...args: any[]) {
      return mocks.removeDevice(...args)
    }

    addDevice (...args: any[]) {
      return mocks.addDevice(...args)
    }

    fetchDevices (...args: any[]) {
      return mocks.fetchDevices(...args)
    }

    genDeviceString (...args: any[]) {
      return mocks.genDeviceString(...args)
    }
  },
}))

async function loadPremium () {
  vi.resetModules()
  return await import('../premium')
}

describe('server premium module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.clientOptions = undefined
  })

  test('posts to premium API through the configured proxy dispatcher', async () => {
    const dispatcher = { name: 'dispatcher' }
    const getProxyDispatcher = vi.fn().mockResolvedValue(dispatcher)
    mocks.getAction.mockReturnValue(getProxyDispatcher)
    mocks.request.mockResolvedValue({
      body: {
        json: vi.fn().mockResolvedValue({ status: 'ok', data: { token: 'abc' } }),
      },
    })
    const { fetchApi } = await loadPremium()

    await expect(fetchApi('/token', { licenseId: 'lic' })).resolves.toEqual({ token: 'abc' })

    expect(getProxyDispatcher).toHaveBeenCalledWith('/token')
    expect(mocks.request).toHaveBeenCalledWith('https://api.example.test/api/premium/token', {
      dispatcher,
      method: 'POST',
      body: JSON.stringify({ licenseId: 'lic' }),
      headers: { 'Content-Type': 'application/json' },
    })
  })

  test('throws on invalid or failed API responses', async () => {
    mocks.getAction.mockReturnValue(vi.fn())
    mocks.request.mockResolvedValueOnce({
      body: { json: vi.fn().mockResolvedValue(null) },
    })
    const { fetchApi } = await loadPremium()

    await expect(fetchApi('/token', {})).rejects.toThrow('Invalid response')

    mocks.request.mockResolvedValueOnce({
      body: { json: vi.fn().mockResolvedValue({ status: 'error', message: 'Nope' }) },
    })

    await expect(fetchApi('/token', {})).rejects.toThrow('Nope')
  })

  test('wires AppLicenseClient wrappers to client methods', async () => {
    mocks.fetchToken.mockResolvedValue(Buffer.from('token-value'))
    mocks.removeDevice.mockResolvedValue('removed')
    mocks.addDevice.mockResolvedValue('added')
    mocks.fetchDevices.mockResolvedValue(['device'])
    const premium = await loadPremium()

    await expect(premium.fetchToken({ licenseId: 'lic' })).resolves.toBe('token-value')
    expect(mocks.fetchToken).toHaveBeenCalledWith('lic')

    await expect(premium.removeDevice({ licenseId: 'lic', device: 'dev' })).resolves.toBe('removed')
    expect(mocks.removeDevice).toHaveBeenCalledWith('lic', 'dev')

    await expect(premium.addDevice({ licenseId: 'lic' })).resolves.toBe('added')
    expect(mocks.addDevice).toHaveBeenCalledWith('lic')

    await expect(premium.fetchDevices({ licenseId: 'lic' })).resolves.toEqual(['device'])
    expect(mocks.fetchDevices).toHaveBeenCalledWith('lic')

    expect(mocks.clientOptions.publicKey).toBe('public-key')
    const dispatcher = { name: 'dispatcher' }
    const getProxyDispatcher = vi.fn().mockResolvedValue(dispatcher)
    mocks.getAction.mockReturnValue(getProxyDispatcher)
    mocks.request.mockResolvedValueOnce({
      body: {
        json: vi.fn().mockResolvedValue({ status: 'ok', data: 'adapter-data' }),
      },
    })

    await expect(mocks.clientOptions.fetchAdapter('method', { a: 1 })).resolves.toBe('adapter-data')
    expect(getProxyDispatcher).toHaveBeenCalledWith('/method')
    expect(mocks.request).toHaveBeenCalledWith('https://api.example.test/api/premium/method', expect.objectContaining({
      dispatcher,
      body: JSON.stringify({ a: 1 }),
    }))
  })

  test('checks device identity against the generated current device', async () => {
    mocks.genDeviceString.mockResolvedValue('current')
    mocks.decodeDevice
      .mockReturnValueOnce({ id: 'id-1', platform: 'darwin' })
      .mockReturnValueOnce({ id: 'id-1', platform: 'darwin' })
    const { checkDevice } = await loadPremium()

    await expect(checkDevice({ device: 'incoming' })).resolves.toBeUndefined()
    expect(mocks.decodeDevice).toHaveBeenCalledWith('current')
    expect(mocks.decodeDevice).toHaveBeenCalledWith('incoming')
  })

  test('rejects mismatched devices', async () => {
    mocks.genDeviceString.mockResolvedValue('current')
    mocks.decodeDevice
      .mockReturnValueOnce({ id: 'id-1', platform: 'darwin' })
      .mockReturnValueOnce({ id: 'id-2', platform: 'darwin' })
    const { checkDevice } = await loadPremium()

    await expect(checkDevice({ device: 'incoming' })).rejects.toThrow('INVALID_LICENSE')
  })
})
