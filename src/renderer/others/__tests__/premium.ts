const licenseMocks = vi.hoisted(() => ({
  tokens: new Map<string, any>(),
}))

const apiMocks = vi.hoisted(() => ({
  fetchHttp: vi.fn(async (_url: string, init: any) => {
    const { method, payload } = JSON.parse(init.body)
    if (method === 'fetchToken') return { data: `token:${payload.licenseId}` }
    if (method === 'upgradeLicense') return { data: 'upgraded-license' }
    return { data: `${method}:ok` }
  }),
}))

const settingMocks = vi.hoisted(() => ({
  values: new Map<string, any>(),
  getSetting: vi.fn((key: string, fallback?: any) => settingMocks.values.has(key) ? settingMocks.values.get(key) : fallback),
  setSetting: vi.fn(async (key: string, value: any) => {
    settingMocks.values.set(key, value)
  }),
}))

const hookMocks = vi.hoisted(() => ({
  registerHook: vi.fn(),
  triggerHook: vi.fn(),
}))

const actionMocks = vi.hoisted(() => ({
  handler: vi.fn(),
  getActionHandler: vi.fn(() => actionMocks.handler),
}))

const gaMocks = vi.hoisted(() => ({
  logEvent: vi.fn(),
  setUserProperties: vi.fn(),
}))

const toastMocks = vi.hoisted(() => ({
  show: vi.fn(),
}))

const viewMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

vi.mock('app-license', () => ({
  LicenseToken: vi.fn(function LicenseToken (this: any, raw: string) {
    const data = licenseMocks.tokens.get(raw) || {}
    this.raw = raw
    this.status = data.status || 'active'
    this.isAvailable = data.isAvailable ?? this.status === 'active'
    this.expires = data.expires || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    this.fetchedAt = data.fetchedAt || new Date(Date.now())
    this.licenseId = data.licenseId || raw.replace(/^token:/, '')
    this.device = data.device || 'device-1'
    this.name = data.name || 'Test User'
    this.email = data.email || 'test@example.com'
    this.displayName = data.displayName || 'Premium'
    this.toString = () => raw
  }),
}))

vi.mock('@fe/support/api', () => apiMocks)
vi.mock('@fe/services/setting', () => settingMocks)
vi.mock('@fe/services/view', () => viewMocks)
vi.mock('@fe/support/args', () => ({
  FLAG_DEMO: false,
  FLAG_MAS: false,
  MODE: 'normal',
}))
vi.mock('@fe/support/ga', () => ({
  default: gaMocks,
}))
vi.mock('@fe/utils', () => ({
  getLogger: () => new Proxy({}, { get: () => () => undefined }),
  md5: (value: string) => `md5:${value}`,
}))
vi.mock('@fe/core/hook', () => hookMocks)
vi.mock('@fe/core/action', () => actionMocks)
vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => toastMocks,
}))
vi.mock('@fe/services/i18n', () => ({
  getCurrentLanguage: () => 'en',
}))

async function loadPremium () {
  vi.resetModules()
  return await import('@fe/others/premium')
}

describe('premium helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    licenseMocks.tokens.clear()
    settingMocks.values.clear()
    vi.clearAllMocks()
    apiMocks.fetchHttp.mockImplementation(async (_url: string, init: any) => {
      const { method, payload } = JSON.parse(init.body)
      if (method === 'fetchToken') return { data: `token:${payload.licenseId}` }
      if (method === 'upgradeLicense') return { data: 'upgraded-license' }
      return { data: `${method}:ok` }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('posts premium API requests with method and payload', async () => {
    const premium = await loadPremium()

    await expect(premium.requestApi('fetchDevices', { licenseId: 'lic-1' })).resolves.toBe('fetchDevices:ok')
    expect(apiMocks.fetchHttp).toHaveBeenCalledWith('/api/premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'fetchDevices', payload: { licenseId: 'lic-1' } }),
    })
  })

  test('computes token expiry and stale windows', async () => {
    const premium = await loadPremium()
    const token: any = {
      status: 'active',
      expires: new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000),
      fetchedAt: new Date(0),
    }

    expect(premium.tokenAvailableDays(token)).toBe(2)
    expect(premium.tokenIsExpiredSoon(token)).toBe(true)
    expect(premium.tokenIsExpiredSoon({ ...token, expires: new Date(Date.now() - 1000) })).toBe(false)
    expect(premium.tokenIsStaleSoon(token)).toBe(true)
    expect(premium.tokenIsStaleSoon({ ...token, status: 'stale' })).toBe(false)
  })

  test('reads license tokens from settings and syncs purchased state', async () => {
    const premium = await loadPremium()

    expect(premium.getLicenseToken()).toBeNull()
    expect(premium.getPurchased()).toBe(false)

    settingMocks.values.set('license', 'ynkv2:stored-token')
    licenseMocks.tokens.set('stored-token', {
      licenseId: 'lic-1',
      status: 'active',
      isAvailable: true,
    })

    const token: any = premium.getLicenseToken()
    expect(token.licenseId).toBe('lic-1')
    expect(gaMocks.setUserProperties).toHaveBeenCalledWith({
      expires: token.expires.toLocaleDateString(),
      hash: 'md5:lic-1',
    })
    expect(premium.getPurchased(true)).toBe(true)
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('PREMIUM_STATUS_CHANGED')
    expect(viewMocks.refresh).toHaveBeenCalled()
  })

  test('shows the premium panel and logs purchase state', async () => {
    const premium = await loadPremium()

    premium.showPremium('activation')

    expect(actionMocks.getActionHandler).toHaveBeenCalledWith('premium.show')
    expect(actionMocks.handler).toHaveBeenCalledWith('activation')
    expect(gaMocks.logEvent).toHaveBeenCalledWith('yn_premium_show', { purchased: false })
  })

  test('cleans only v2 licenses and activates licenses through device registration', async () => {
    const premium = await loadPremium()

    settingMocks.values.set('license', 'legacy-license')
    await premium.cleanLicense()
    expect(settingMocks.setSetting).not.toHaveBeenCalled()

    settingMocks.values.set('license', 'ynkv2:old-token')
    await premium.cleanLicense()
    expect(settingMocks.setSetting).toHaveBeenCalledWith('license', '')

    licenseMocks.tokens.set('token:lic-2', {
      licenseId: 'lic-2',
      status: 'active',
      isAvailable: true,
    })
    await premium.activateLicense('lic-2')

    expect(apiMocks.fetchHttp).toHaveBeenCalledWith('/api/premium', expect.objectContaining({
      body: JSON.stringify({ method: 'addDevice', payload: { licenseId: 'lic-2' } }),
    }))
    expect(settingMocks.setSetting).toHaveBeenLastCalledWith('license', 'ynkv2:token:lic-2')
  })

  test('handles token-string activation and refresh errors', async () => {
    const premium = await loadPremium()
    licenseMocks.tokens.set('offline-token', {
      licenseId: 'lic-offline',
      device: 'device-offline',
      status: 'active',
      isAvailable: true,
    })

    await premium.activateByTokenString('offline-token')
    expect(settingMocks.setSetting).toHaveBeenCalledWith('license', 'ynkv2:offline-token')
    expect(apiMocks.fetchHttp).toHaveBeenCalledWith('/api/premium', expect.objectContaining({
      body: JSON.stringify({ method: 'checkDevice', payload: { device: 'device-offline' } }),
    }))

    settingMocks.values.set('license', 'ynkv2:offline-token')
    apiMocks.fetchHttp.mockRejectedValueOnce(new Error('network down'))
    await expect(premium.refreshLicense({ throwError: true })).rejects.toThrow('network down')
  })

  test('cleans invalid v2 licenses when setting a fetched token fails availability checks', async () => {
    const premium = await loadPremium()
    licenseMocks.tokens.set('token:bad-license', {
      licenseId: 'bad-license',
      status: 'expired',
      isAvailable: false,
    })
    apiMocks.fetchHttp.mockImplementation(async (_url: string, init: any) => {
      const { method, payload } = JSON.parse(init.body)
      if (method === 'fetchToken') return { data: `token:${payload.licenseId}` }
      return { data: `${method}:ok` }
    })
    settingMocks.values.set('license', 'ynkv2:old-token')
    licenseMocks.tokens.set('old-token', {
      licenseId: 'old-token',
      status: 'expired',
      isAvailable: false,
    })

    await expect(premium.activateLicense('bad-license')).rejects.toThrow('Error, license status [expired]')
    expect(settingMocks.setSetting).not.toHaveBeenCalledWith('license', 'ynkv2:token:bad-license')
    expect(premium.getPurchased(true)).toBe(false)
  })

  test('cleans license when device checks fail without rethrowing by default', async () => {
    const premium = await loadPremium()
    licenseMocks.tokens.set('device-token', {
      licenseId: 'lic-device',
      device: 'missing-device',
      status: 'active',
      isAvailable: true,
    })
    settingMocks.values.set('license', 'ynkv2:device-token')
    apiMocks.fetchHttp.mockRejectedValueOnce(new Error('device missing'))

    await expect(premium.refreshLicense()).resolves.toBeUndefined()

    expect(settingMocks.setSetting).toHaveBeenCalledWith('license', '')
  })

  test('upgrades legacy licenses once and reports upgrade failures', async () => {
    const premium = await loadPremium()
    settingMocks.values.set('license', 'legacy-license')

    premium.getLicenseToken()
    await vi.waitFor(() => {
      expect(apiMocks.fetchHttp).toHaveBeenCalledWith('/api/premium', expect.objectContaining({
        body: JSON.stringify({ method: 'upgradeLicense', payload: { oldLicense: 'legacy-license', locale: 'en' } }),
      }))
      expect(toastMocks.show).toHaveBeenCalledWith('info', 'License upgraded successfully')
    })
    expect(actionMocks.handler).toHaveBeenCalledWith('activation')

    vi.clearAllMocks()
    const premium2 = await loadPremium()
    settingMocks.values.set('license', 'legacy-fails')
    apiMocks.fetchHttp.mockRejectedValueOnce(new Error('upgrade down'))
    premium2.getLicenseToken()
    await vi.waitFor(() => {
      expect(toastMocks.show).toHaveBeenCalledWith('warning', expect.stringContaining('License upgrade failed'), 6000)
    })
  })

  test('startup license check shows stale and soon-expiring warnings', async () => {
    const premium = await loadPremium()
    const startup = hookMocks.registerHook.mock.calls.find(call => call[0] === 'STARTUP')?.[1]
    expect(startup).toBeTypeOf('function')

    settingMocks.values.set('license', 'ynkv2:stale-token')
    licenseMocks.tokens.set('stale-token', {
      licenseId: 'lic-stale',
      status: 'stale',
      isAvailable: false,
    })
    licenseMocks.tokens.set('token:lic-stale', {
      licenseId: 'lic-stale',
      status: 'stale',
      isAvailable: false,
    })
    await startup()
    expect(toastMocks.show).toHaveBeenCalledWith('warning', 'License unrecognized, please refresh')

    vi.clearAllMocks()
    settingMocks.values.set('license', 'ynkv2:soon-token')
    licenseMocks.tokens.set('soon-token', {
      licenseId: 'lic-soon',
      status: 'active',
      isAvailable: true,
      expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      fetchedAt: new Date(Date.now()),
    })
    licenseMocks.tokens.set('token:lic-soon', {
      licenseId: 'lic-soon',
      status: 'active',
      isAvailable: true,
      expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      fetchedAt: new Date(Date.now()),
    })
    await startup()
    expect(toastMocks.show).toHaveBeenCalledWith('warning', 'License expires soon, please renew')
    expect(actionMocks.handler).toHaveBeenCalledWith('activation')
  })
})
