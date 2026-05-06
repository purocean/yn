const mocks = vi.hoisted(() => ({
  platform: vi.fn(() => 'linux'),
  configGet: vi.fn(),
  toWslPath: vi.fn((path: string) => `/mnt/c/${path.split('\\').slice(1).join('/')}`),
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

vi.mock('../wsl', () => ({
  toWslPath: (...args: any[]) => mocks.toWslPath(...args),
}))

async function loadShell () {
  vi.resetModules()
  return (await import('../shell')).default
}

describe('shell module', () => {
  const originalShell = process.env.SHELL

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.platform.mockReturnValue('linux')
    mocks.configGet.mockImplementation((_key, defaultValue) => defaultValue)
    process.env.SHELL = '/bin/zsh'
  })

  afterAll(() => {
    process.env.SHELL = originalShell
  })

  test('returns configured shell trimmed or the platform default', async () => {
    mocks.configGet.mockReturnValue('  /usr/bin/fish  ')
    const shell = await loadShell()

    expect(shell.getShell()).toBe('/usr/bin/fish')
    expect(mocks.configGet).toHaveBeenCalledWith('shell', '/bin/zsh')
  })

  test('normalizes built-in Windows shells to System32 paths', async () => {
    mocks.platform.mockReturnValue('win32')
    mocks.configGet.mockReturnValue('wsl.exe')
    const shell = await loadShell()

    expect(shell.getShell()).toBe('C:\\Windows\\System32\\wsl.exe')
  })

  test('transforms cd commands for POSIX shells and escapes single quotes', async () => {
    const shell = await loadShell()

    expect(shell.transformCdCommand(`${shell.CD_COMMAND_PREFIX} /tmp/John's Notes`))
      .toBe("cd '/tmp/John\\'s Notes'")
  })

  test('transforms cd commands for Windows cmd, powershell, and WSL shells', async () => {
    mocks.platform.mockReturnValue('win32')
    mocks.configGet.mockReturnValueOnce('cmd.exe')
    let shell = await loadShell()
    expect(shell.transformCdCommand(`${shell.CD_COMMAND_PREFIX} C:\\Notes`)).toBe('cd /d "C:\\Notes"\r')

    mocks.configGet.mockReturnValueOnce('powershell.exe')
    shell = await loadShell()
    expect(shell.transformCdCommand(`${shell.CD_COMMAND_PREFIX} C:\\Notes`)).toBe("cd 'C:\\Notes'\r\n")

    mocks.configGet.mockReturnValueOnce('wsl.exe')
    shell = await loadShell()
    expect(shell.transformCdCommand(`${shell.CD_COMMAND_PREFIX} C:\\Users\\me`)).toBe("cd '/mnt/c/Users/me'")
    expect(mocks.toWslPath).toHaveBeenCalledWith('C:\\Users\\me')
  })
})
