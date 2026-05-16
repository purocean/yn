const mocks = vi.hoisted(() => ({
  autoUpdater: {
    autoDownload: true,
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    logger: undefined as any,
    on: vi.fn(),
    once: vi.fn(),
    quitAndInstall: vi.fn(),
    setFeedURL: vi.fn(),
  },
  cancel: vi.fn(),
  checkHandlers: {} as Record<string, Function>,
  configGet: vi.fn(),
  dialogShowMessageBox: vi.fn(),
  exit: vi.fn(),
  getAppPath: vi.fn(),
  getLocale: vi.fn(),
  getPath: vi.fn(),
  getVersion: vi.fn(),
  onHandlers: {} as Record<string, Function>,
  openExternal: vi.fn(),
  progressClose: vi.fn(),
  progressHandlers: {} as Record<string, Function>,
  providerRequest: vi.fn(() => 'request-result'),
  readdirSync: vi.fn(),
  registerAction: vi.fn(),
  resolveFiles: vi.fn(),
  storeGet: vi.fn(),
  storeSet: vi.fn(),
  whenReady: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    exit: (...args: any[]) => mocks.exit(...args),
    getAppPath: (...args: any[]) => mocks.getAppPath(...args),
    getLocale: (...args: any[]) => mocks.getLocale(...args),
    getPath: (...args: any[]) => mocks.getPath(...args),
    getVersion: (...args: any[]) => mocks.getVersion(...args),
    whenReady: (...args: any[]) => mocks.whenReady(...args),
  },
  dialog: {
    showMessageBox: (...args: any[]) => mocks.dialogShowMessageBox(...args),
  },
  shell: {
    openExternal: (...args: any[]) => mocks.openExternal(...args),
  },
}))

vi.mock('electron-updater', () => ({
  autoUpdater: mocks.autoUpdater,
  CancellationToken: class CancellationToken {
    cancel = (...args: any[]) => mocks.cancel(...args)
  },
}))

vi.mock('electron-updater/out/providers/Provider', () => ({
  resolveFiles: (...args: any[]) => mocks.resolveFiles(...args),
}))

vi.mock('electron-updater/out/providers/GitHubProvider', () => ({
  GitHubProvider: class GitHubProvider {
    executor = { request: (...args: any[]) => mocks.providerRequest(...args) }

    constructor () {}

    resolveFiles (info: any) {
      return [{ source: 'github', info }]
    }
  },
}))

vi.mock('electron-log', () => ({
  __esModule: true,
  default: {
    transports: {
      file: {
        level: undefined,
      },
    },
  },
}))

vi.mock('electron-progressbar', () => ({
  __esModule: true,
  default: vi.fn(function ProgressBar (this: any, options: any) {
    this.options = options
    this.close = (...args: any[]) => mocks.progressClose(...args)
    this.on = (event: string, handler: Function) => {
      mocks.progressHandlers[event] = handler
    }
    return this
  }),
}))

vi.mock('../storage', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mocks.storeGet(...args),
    set: (...args: any[]) => mocks.storeSet(...args),
  },
}))

vi.mock('../constant', () => ({
  GITHUB_URL: 'https://github.test/yn',
}))

vi.mock('../i18n', () => ({
  $t: (key: string, ...args: any[]) => args.length ? `${key}:${args.join(',')}` : key,
}))

vi.mock('../config', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mocks.configGet(...args),
  }
}))

vi.mock('../action', () => ({
  registerAction: (...args: any[]) => mocks.registerAction(...args),
}))

async function loadUpdater () {
  vi.resetModules()
  return await import('../updater')
}

async function flushReady () {
  await Promise.resolve()
  await Promise.resolve()
}

describe('main updater module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mocks.onHandlers = {}
    mocks.checkHandlers = {}
    mocks.progressHandlers = {}
    mocks.autoUpdater.autoDownload = true
    delete (process as any).mas
    mocks.autoUpdater.on.mockImplementation((event: string, handler: Function) => {
      mocks.onHandlers[event] = handler
    })
    mocks.autoUpdater.once.mockImplementation((event: string, handler: Function) => {
      mocks.checkHandlers[event] = handler
    })
    mocks.autoUpdater.downloadUpdate.mockResolvedValue(undefined)
    mocks.configGet.mockImplementation((_key: string, defaultValue: any) => defaultValue)
    mocks.dialogShowMessageBox.mockResolvedValue({ response: 3 })
    mocks.getAppPath.mockReturnValue('/Applications/Yank Note.app')
    mocks.getLocale.mockReturnValue('en-US')
    mocks.getPath.mockReturnValue('/app/exe')
    mocks.getVersion.mockReturnValue('1.0.0')
    mocks.readdirSync.mockReturnValue(['Uninstall Yank Note.exe'])
    mocks.storeGet.mockReturnValue(false)
    mocks.whenReady.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (process as any).mas
  })

  test('initializes autoUpdater after app readiness and registers change-source action', async () => {
    await loadUpdater()
    await flushReady()

    expect(mocks.autoUpdater.setFeedURL).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'custom',
      owner: 'purocean',
      repo: 'yn',
      updateProvider: expect.any(Function),
    }))
    expect(mocks.autoUpdater.autoDownload).toBe(false)
    expect(mocks.autoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function))
    expect(mocks.registerAction).toHaveBeenCalledWith('updater.change-source', expect.any(Function))

    vi.advanceTimersByTime(1000)
    expect(mocks.autoUpdater.checkForUpdates).toHaveBeenCalled()
  })

  test('public update checks reset ignore flag and respect automatic ignore setting', async () => {
    const updater = await loadUpdater()

    updater.checkForUpdates()
    expect(mocks.storeSet).toHaveBeenCalledWith('dontCheckUpdates', false)
    expect(mocks.autoUpdater.once).toHaveBeenCalledWith('update-not-available', expect.any(Function))
    expect(mocks.autoUpdater.checkForUpdates).toHaveBeenCalled()

    mocks.checkHandlers['update-not-available']()
    expect(mocks.dialogShowMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      type: 'info',
      title: 'app.updater.no-newer-dialog.title',
    }))

    mocks.autoUpdater.checkForUpdates.mockClear()
    mocks.storeGet.mockReturnValueOnce(true)
    updater.autoCheckForUpdates()
    expect(mocks.autoUpdater.checkForUpdates).not.toHaveBeenCalled()

    updater.changeSource()
    expect(mocks.autoUpdater.checkForUpdates).toHaveBeenCalled()
  })

  test('update-available handler downloads, opens release notes, supports cancel and ignore', async () => {
    await loadUpdater()
    await flushReady()

    mocks.dialogShowMessageBox.mockResolvedValueOnce({ response: 2 })
    await mocks.onHandlers['update-available']({ version: '2.0.0' })

    expect(mocks.autoUpdater.downloadUpdate).toHaveBeenCalledWith(expect.any(Object))
    expect(mocks.openExternal).toHaveBeenCalledWith('https://github.test/yn/releases')
    expect(mocks.progressHandlers.aborted).toEqual(expect.any(Function))
    mocks.progressHandlers.aborted()
    expect(mocks.cancel).toHaveBeenCalled()

    mocks.dialogShowMessageBox.mockResolvedValueOnce({ response: 4 })
    await mocks.onHandlers['update-available']({ version: '2.0.1' })
    expect(mocks.storeSet).toHaveBeenCalledWith('dontCheckUpdates', true)
  })

  test('progress, error, and downloaded handlers update the progress bar and install after confirmation', async () => {
    await loadUpdater()
    await flushReady()
    const callExitAfterInstall = vi.fn()

    mocks.dialogShowMessageBox.mockResolvedValueOnce({ response: 0 })
    await mocks.onHandlers['update-available']({ version: '2.0.0' })

    mocks.onHandlers['download-progress']({ percent: 42.123 })
    mocks.onHandlers.error(new Error('boom'))
    mocks.dialogShowMessageBox.mockResolvedValueOnce({ response: 0 })
    mocks.onHandlers['update-downloaded']()
    await flushReady()
    vi.advanceTimersByTime(500)
    await flushReady()
    vi.runOnlyPendingTimers()
    expect(mocks.progressClose).toHaveBeenCalled()
    expect(mocks.autoUpdater.quitAndInstall).toHaveBeenCalled()
    expect(mocks.exit).toHaveBeenCalledWith(0)

    const initCall = mocks.autoUpdater.setFeedURL.mock.calls[0][0].updateProvider
    expect(initCall).toEqual(expect.any(Function))
    callExitAfterInstall()
    expect(callExitAfterInstall).toHaveBeenCalled()
  })

  test('download failure closes progress and shows non-cancel errors', async () => {
    await loadUpdater()
    await flushReady()
    const failure = new Error('network failed')
    mocks.autoUpdater.downloadUpdate.mockRejectedValueOnce(failure)
    mocks.dialogShowMessageBox.mockResolvedValueOnce({ response: 0 })

    await mocks.onHandlers['update-available']({ version: '2.0.0' })
    await flushReady()

    expect(mocks.progressClose).toHaveBeenCalled()
    expect(mocks.dialogShowMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      type: 'info',
      title: 'app.updater.failed-dialog.title',
      message: 'network failed',
    }))
  })

  test('custom update provider resolves github and yank-note sources', async () => {
    await loadUpdater()
    await flushReady()

    const Provider = mocks.autoUpdater.setFeedURL.mock.calls[0][0].updateProvider
    const provider = new Provider({}, {}, {})

    mocks.configGet.mockReturnValue('github')
    expect(provider.resolveFiles({ version: '2.0.0' })).toEqual([{ source: 'github', info: { version: '2.0.0' } }])

    mocks.configGet.mockReturnValue('yank-note')
    mocks.resolveFiles.mockReturnValue([{ source: 'yank-note' }])
    expect(provider.resolveFiles({ files: [{ url: 'Yank Note Setup.exe' }] })).toEqual([{ source: 'yank-note' }])
    expect(mocks.resolveFiles).toHaveBeenCalledWith(
      { files: [{ url: 'Yank Note Setup.exe' }] },
      new URL('https://yank-note.com'),
      expect.any(Function)
    )

    const pathMapper = mocks.resolveFiles.mock.calls[0][2]
    expect(pathMapper('Yank Note Setup.exe')).toBe('/download/Yank-Note-Setup.exe')

    const requestOptions = { protocol: 'https:', hostname: 'github.com', path: '/purocean/yn/releases/latest' }
    expect(provider.executor.request(requestOptions)).toBe('request-result')
    expect(mocks.providerRequest).toHaveBeenCalledWith(expect.objectContaining({
      hostname: 'yank-note.com',
      path: '/api/update-info/latest',
    }))
  })

  test('disabled updater branches skip initialization and public checks', async () => {
    ;(process as any).mas = true
    const updater = await loadUpdater()
    await flushReady()

    updater.checkForUpdates()
    updater.autoCheckForUpdates()

    expect(mocks.autoUpdater.setFeedURL).not.toHaveBeenCalled()
    expect(mocks.autoUpdater.checkForUpdates).not.toHaveBeenCalled()
    delete (process as any).mas
  })
})
