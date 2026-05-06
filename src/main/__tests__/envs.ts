const mocks = vi.hoisted(() => ({
  platform: vi.fn(() => 'linux'),
  configGet: vi.fn(),
  registerAction: vi.fn(),
}))

vi.mock('os', () => ({
  default: {
    platform: mocks.platform,
  },
  platform: mocks.platform,
}))

vi.mock('../config', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mocks.configGet(...args),
  },
}))

vi.mock('../action', () => ({
  registerAction: (...args: any[]) => mocks.registerAction(...args),
}))

async function loadEnvs () {
  vi.resetModules()
  return await import('../envs')
}

describe('envs module', () => {
  const originalEnv = process.env
  let logSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.platform.mockReturnValue('linux')
    process.env = { PATH: '/bin', KEEP: 'yes' } as NodeJS.ProcessEnv
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.env = originalEnv
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  test('registers env reload action on import', async () => {
    const mod = await loadEnvs()

    expect(mocks.registerAction).toHaveBeenCalledWith('envs.reload', mod.initEnvs)
  })

  test('loads YAML envs and prepends PATH entries without duplicates', async () => {
    mocks.configGet.mockReturnValue([
      'PATH:',
      '  - /opt/bin',
      '  - /bin',
      'FOO: bar',
      'COUNT: 2',
    ].join('\n'))
    const { initEnvs } = await loadEnvs()

    initEnvs()

    expect(process.env.FOO).toBe('bar')
    expect(process.env.COUNT).toBe(2 as any)
    expect(process.env.PATH).toBe('/opt/bin:/bin:/usr/local/bin')
    expect(mocks.configGet).toHaveBeenCalledWith('envs', '')
  })

  test('ignores invalid or non-object YAML', async () => {
    mocks.configGet.mockReturnValue('::not: yaml:')
    const { initEnvs } = await loadEnvs()

    initEnvs()

    expect(process.env).toEqual({ PATH: '/bin', KEEP: 'yes' })
    expect(errorSpy).toHaveBeenCalled()

    mocks.configGet.mockReturnValue('null')
    initEnvs()
    expect(process.env).toEqual({ PATH: '/bin', KEEP: 'yes' })
  })

  test('does nothing on Windows', async () => {
    mocks.platform.mockReturnValue('win32')
    mocks.configGet.mockReturnValue('FOO: bar')
    const { initEnvs } = await loadEnvs()

    initEnvs()

    expect(process.env.FOO).toBeUndefined()
    expect(mocks.configGet).not.toHaveBeenCalled()
  })
})
