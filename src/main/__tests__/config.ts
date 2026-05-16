import * as os from 'os'
import * as path from 'path'

const mocks = vi.hoisted(() => ({
  configFile: '',
  store: new Map<string, any>()
}))

vi.mock('../constant', () => ({
  get CONFIG_FILE () {
    return mocks.configFile
  }
}))

vi.mock('../storage', () => ({
  __esModule: true,
  default: {
    get: (key: string, defaultValue?: any) => mocks.store.has(key) ? mocks.store.get(key) : defaultValue,
    set: (key: string, value: any) => mocks.store.set(key, value),
    delete: (key: string) => mocks.store.delete(key)
  }
}))

async function loadConfig () {
  vi.resetModules()
  return (await import('../config')).default
}

describe('main config module', () => {
  let tempDir: string

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useRealTimers()
    const fs = await import('fs-extra')
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yn-config-test-'))
    mocks.configFile = path.join(tempDir, 'config.json')
    mocks.store.clear()
  })

  afterEach(async () => {
    const fs = await import('fs-extra')
    await fs.remove(tempDir)
  })

  test('writes license to secure storage while omitting it from the config file', async () => {
    const fs = await import('fs-extra')
    const config = await loadConfig()

    config.setAll({ theme: 'dark', license: 'license-key' })

    expect(mocks.store.get('license')).toBe('license-key')
    expect(await fs.readJSON(mocks.configFile)).toEqual({ theme: 'dark' })
  })

  test('reads license back from storage and falls back to file license when storage is empty', async () => {
    const fs = await import('fs-extra')
    await fs.outputJSON(mocks.configFile, { theme: 'light', license: 'file-license' })

    let config = await loadConfig()
    expect(config.getAll()).toEqual({ theme: 'light', license: 'file-license' })

    mocks.store.set('license', 'stored-license')
    config = await loadConfig()
    expect(config.getAll()).toEqual({ theme: 'light', license: 'stored-license' })
  })

  test('get writes and returns default values only when the key is undefined', async () => {
    const fs = await import('fs-extra')
    await fs.outputJSON(mocks.configFile, { exists: false })
    const config = await loadConfig()

    expect(config.get('missing', 'default')).toBe('default')
    expect(config.get('exists', true)).toBe(false)
    expect(await fs.readJSON(mocks.configFile)).toEqual({ exists: false, missing: 'default' })
  })

  test('caches config reads for one second and refreshes after expiration', async () => {
    const fs = await import('fs-extra')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-02T00:00:00Z'))
    await fs.outputJSON(mocks.configFile, { value: 1 })
    const config = await loadConfig()

    expect(config.get('value')).toBe(1)
    await fs.outputJSON(mocks.configFile, { value: 2 })
    expect(config.get('value')).toBe(1)

    vi.advanceTimersByTime(1001)

    expect(config.get('value')).toBe(2)
    vi.useRealTimers()
  })
})
