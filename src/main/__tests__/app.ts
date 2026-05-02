const mocks = vi.hoisted(() => ({
  actions: {} as Record<string, Function>,
  appEvents: {} as Record<string, Function>,
  argv: {} as Record<string, any>,
  browserWindowInstances: [] as any[],
  configStore: new Map<string, any>(),
  contextMenu: vi.fn(),
  dialogShowMessageBox: vi.fn(),
  electronRemoteEnable: vi.fn(),
  electronRemoteInitialize: vi.fn(),
  fsStat: vi.fn(),
  getMainMenus: vi.fn(() => ({ type: 'main-menu' })),
  getProxyDispatcher: vi.fn(),
  getTrayMenus: vi.fn(() => ({ type: 'tray-menu' })),
  httpHandler: vi.fn((_req: any, res: any) => {
    res.statusCode = 204
    res.getHeaders = () => ({ 'x-test': 'ok' })
  }),
  httpServer: vi.fn(),
  initEnvs: vi.fn(),
  initJSONRPCClient: vi.fn(),
  initProxy: vi.fn(),
  jsonRPCClient: {
    call: {
      ctx: {
        base: {
          triggerDeepLinkOpen: vi.fn(),
        },
        doc: {
          switchDocByPath: vi.fn(),
        },
        setting: {
          showSettingPanel: vi.fn(),
        },
      },
    },
  },
  killPtyProcesses: vi.fn(),
  menuSetApplicationMenu: vi.fn(),
  platform: 'linux',
  powerMonitorEvents: {} as Record<string, Function>,
  protocolHandlers: {} as Record<string, Function>,
  registerShortcut: vi.fn(),
  screenDisplays: [
    { workArea: { x: 0, y: 0, width: 1280, height: 720 }, bounds: { x: 0, y: 0, width: 1280, height: 720 } },
  ],
  serverEvents: {} as Record<string, Function>,
  shellOpenExternal: vi.fn(),
  startup: vi.fn(),
  store: new Map<string, any>(),
  transformProtocolRequest: vi.fn(),
  trayInstances: [] as any[],
}))

const moduleLoad = vi.hoisted(() => ({
  original: undefined as any,
}))

vi.mock('module', async () => {
  const actual = await vi.importActual<any>('module')
  moduleLoad.original = actual.default._load
  actual.default._load = function (request: string, ...args: any[]) {
    if (request === 'electron-context-menu') {
      return (...params: any[]) => mocks.contextMenu(...params)
    }

    if (request === '@electron/remote/main') {
      return {
        enable: (...params: any[]) => mocks.electronRemoteEnable(...params),
        initialize: (...params: any[]) => mocks.electronRemoteInitialize(...params),
      }
    }

    return moduleLoad.original.call(this, request, ...args)
  }
  return actual
})

import Module from 'module'
void Module

afterAll(async () => {
  const module = await import('module')
  if (moduleLoad.original) {
    ;(module.default as any)._load = moduleLoad.original
  }
})

vi.mock('os', () => ({
  platform: () => mocks.platform,
}))

vi.mock('yargs', () => ({
  get argv () {
    return mocks.argv
  },
}))

vi.mock('electron-context-menu', () => ({
  __esModule: true,
  default: (...args: any[]) => mocks.contextMenu(...args),
}))

vi.mock('@electron/remote/main', () => ({
  initialize: (...args: any[]) => mocks.electronRemoteInitialize(...args),
  enable: (...args: any[]) => mocks.electronRemoteEnable(...args),
}))

vi.mock('fs-extra', () => ({
  stat: (...args: any[]) => mocks.fsStat(...args),
}))

vi.mock('electron', () => {
  class MockBrowserWindow {
    bounds = { x: 10, y: 20, width: 940, height: 500 }
    destroyed = false
    events: Record<string, Function> = {}
    fullscreen = false
    maximized = false
    options: any
    webContents: any

    constructor (options: any) {
      this.options = options
      this.webContents = {
        events: {} as Record<string, Function>,
        executeJavaScript: vi.fn(() => Promise.resolve(true)),
        isLoading: vi.fn(() => false),
        on: vi.fn((event: string, handler: Function) => {
          this.webContents.events[event] = handler
        }),
        openDevTools: vi.fn(),
        send: vi.fn(),
        setWindowOpenHandler: vi.fn((handler: Function) => {
          this.webContents.windowOpenHandler = handler
        }),
        windowOpenHandler: undefined as any,
      }
      mocks.browserWindowInstances.push(this)
    }

    destroy = vi.fn(() => {
      this.destroyed = true
    })

    focus = vi.fn()
    getBounds = vi.fn(() => this.bounds)
    hide = vi.fn()
    isFullScreen = vi.fn(() => this.fullscreen)
    isMaximized = vi.fn(() => this.maximized)
    loadURL = vi.fn()
    maximize = vi.fn()
    on = vi.fn((event: string, handler: Function) => {
      this.events[event] = handler
    })

    once = vi.fn((event: string, handler: Function) => {
      this.events[`once:${event}`] = handler
    })

    setBounds = vi.fn((bounds: any) => {
      this.bounds = bounds
    })

    setFullScreen = vi.fn((value: boolean) => {
      this.fullscreen = value
    })

    setMenu = vi.fn()
    setSkipTaskbar = vi.fn()
    setVisibleOnAllWorkspaces = vi.fn()
    show = vi.fn()
  }

  class MockTray {
    events: Record<string, Function> = {}
    image: string

    constructor (image: string) {
      this.image = image
      mocks.trayInstances.push(this)
    }

    on = vi.fn((event: string, handler: Function) => {
      this.events[event] = handler
    })

    popUpContextMenu = vi.fn()
    setContextMenu = vi.fn()
    setToolTip = vi.fn()
  }

  return {
    app: {
      commandLine: {
        appendSwitch: vi.fn(),
      },
      dock: {
        hide: vi.fn(),
        show: vi.fn(),
      },
      exit: vi.fn(),
      on: vi.fn((event: string, handler: Function) => {
        mocks.appEvents[event] = handler
      }),
      quit: vi.fn(),
      requestSingleInstanceLock: vi.fn(() => true),
      setAsDefaultProtocolClient: vi.fn(),
    },
    BrowserWindow: MockBrowserWindow,
    dialog: {
      showMessageBox: (...args: any[]) => mocks.dialogShowMessageBox(...args),
      showOpenDialog: vi.fn(() => Promise.resolve({ canceled: false, filePaths: ['/tmp/a.md'] })),
    },
    Menu: {
      setApplicationMenu: (...args: any[]) => mocks.menuSetApplicationMenu(...args),
    },
    powerMonitor: {
      on: vi.fn((event: string, handler: Function) => {
        mocks.powerMonitorEvents[event] = handler
      }),
    },
    protocol: {
      registerStreamProtocol: vi.fn((scheme: string, handler: Function) => {
        mocks.protocolHandlers[scheme] = handler
      }),
    },
    screen: {
      getAllDisplays: vi.fn(() => mocks.screenDisplays),
      getDisplayMatching: vi.fn(() => mocks.screenDisplays[0]),
    },
    shell: {
      openExternal: (...args: any[]) => mocks.shellOpenExternal(...args),
    },
    Tray: MockTray,
  }
})

vi.mock('../server', () => ({
  __esModule: true,
  default: (...args: any[]) => mocks.httpServer(...args),
  killPtyProcesses: (...args: any[]) => mocks.killPtyProcesses(...args),
}))

vi.mock('../storage', () => ({
  __esModule: true,
  default: {
    get: (key: string, defaultValue?: any) => mocks.store.has(key) ? mocks.store.get(key) : defaultValue,
    set: (key: string, value: any) => mocks.store.set(key, value),
  },
}))

vi.mock('../constant', () => ({
  APP_NAME: 'yank-note',
}))

vi.mock('../menus', () => ({
  getMainMenus: (...args: any[]) => mocks.getMainMenus(...args),
  getTrayMenus: (...args: any[]) => mocks.getTrayMenus(...args),
}))

vi.mock('../protocol', () => ({
  transformProtocolRequest: (...args: any[]) => mocks.transformProtocolRequest(...args),
}))

vi.mock('../startup', () => ({
  __esModule: true,
  default: (...args: any[]) => mocks.startup(...args),
}))

vi.mock('../action', () => ({
  registerAction: (name: string, handler: Function) => {
    mocks.actions[name] = handler
  },
}))

vi.mock('../shortcut', () => ({
  registerShortcut: (...args: any[]) => mocks.registerShortcut(...args),
}))

vi.mock('../jsonrpc', () => ({
  get jsonRPCClient () {
    return mocks.jsonRPCClient
  },
  initJSONRPCClient: (...args: any[]) => mocks.initJSONRPCClient(...args),
}))

vi.mock('../i18n', () => ({
  $t: (key: string, ...args: any[]) => args.length ? `${key}:${args.join(',')}` : key,
}))

vi.mock('../proxy-dispatcher', () => ({
  getProxyDispatcher: (...args: any[]) => mocks.getProxyDispatcher(...args),
  newProxyDispatcher: vi.fn(),
}))

vi.mock('../config', () => ({
  __esModule: true,
  default: {
    get: (key: string, defaultValue?: any) => mocks.configStore.has(key) ? mocks.configStore.get(key) : defaultValue,
  },
}))

vi.mock('../proxy', () => ({
  initProxy: (...args: any[]) => mocks.initProxy(...args),
}))

vi.mock('../envs', () => ({
  initEnvs: (...args: any[]) => mocks.initEnvs(...args),
}))

vi.mock('../url', () => ({
  buildAppUrl: ({ mode, backendPort, devFrontendPort }: any) => `url:${mode}:${backendPort}:${devFrontendPort}`,
}))

async function loadApp () {
  vi.resetModules()
  return await import('../app')
}

async function flushPromises () {
  await Promise.resolve()
  await Promise.resolve()
}

describe('main app entry', () => {
  const originalArgv = process.argv
  const originalDefaultApp = (process as any).defaultApp

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mocks.actions = {}
    mocks.appEvents = {}
    mocks.argv = { port: 4555 }
    mocks.browserWindowInstances = []
    mocks.configStore.clear()
    mocks.dialogShowMessageBox.mockResolvedValue({ response: 1 })
    mocks.fsStat.mockResolvedValue({ isFile: () => true })
    mocks.httpHandler.mockClear()
    mocks.httpServer.mockReturnValue({
      callback: mocks.httpHandler,
      server: {
        on: vi.fn((event: string, handler: Function) => {
          mocks.serverEvents[event] = handler
        }),
      },
    })
    mocks.jsonRPCClient.call.ctx.base.triggerDeepLinkOpen.mockClear()
    mocks.jsonRPCClient.call.ctx.doc.switchDocByPath.mockClear()
    mocks.jsonRPCClient.call.ctx.setting.showSettingPanel.mockClear()
    mocks.platform = 'linux'
    mocks.powerMonitorEvents = {}
    mocks.protocolHandlers = {}
    mocks.screenDisplays = [
      { workArea: { x: 0, y: 0, width: 1280, height: 720 }, bounds: { x: 0, y: 0, width: 1280, height: 720 } },
    ]
    mocks.serverEvents = {}
    mocks.store.clear()
    mocks.transformProtocolRequest.mockResolvedValue({
      req: {},
      res: {
        getHeaders: () => ({ 'x-test': 'ok' }),
        statusCode: 201,
      },
      out: 'stream-body',
    })
    mocks.trayInstances = []
    process.argv = ['/electron', '/app/app.js']
    ;(process as any).defaultApp = false
  })

  afterEach(() => {
    vi.useRealTimers()
    process.argv = originalArgv
    ;(process as any).defaultApp = originalDefaultApp
  })

  test('registers import-time actions and app lifecycle handlers', async () => {
    const electron = await import('electron')
    await loadApp()

    expect(electron.app.commandLine.appendSwitch).toHaveBeenCalledWith('enable-features', 'SharedArrayBuffer')
    expect(mocks.initProxy).toHaveBeenCalled()
    expect(mocks.initEnvs).toHaveBeenCalled()
    expect(mocks.electronRemoteInitialize).toHaveBeenCalled()
    expect(mocks.contextMenu).toHaveBeenCalledWith(expect.objectContaining({
      showCopyImage: true,
      showInspectElement: false,
    }))
    expect(mocks.menuSetApplicationMenu).toHaveBeenCalledWith({ type: 'main-menu' })
    expect(electron.app.setAsDefaultProtocolClient).toHaveBeenCalledWith('yank-note')
    expect(electron.app.on).toHaveBeenCalledWith('ready', expect.any(Function))
    expect(electron.app.on).toHaveBeenCalledWith('second-instance', expect.any(Function))
    expect(electron.powerMonitor.on).toHaveBeenCalledWith('shutdown', expect.any(Function))
    expect(Object.keys(mocks.actions)).toEqual(expect.arrayContaining([
      'show-main-window',
      'hide-main-window',
      'toggle-fullscreen',
      'show-main-window-setting',
      'reload-main-window',
      'quit',
      'show-open-dialog',
      'refresh-menus',
      'get-backend-port',
    ]))
    expect(mocks.actions['get-backend-port']()).toBe(4555)
    expect(mocks.actions['get-dev-frontend-port']()).toBe(8066)
  })

  test('exits immediately when single instance lock is unavailable', async () => {
    const electron = await import('electron')
    vi.mocked(electron.app.requestSingleInstanceLock).mockReturnValueOnce(false)

    await loadApp()

    expect(electron.app.exit).toHaveBeenCalled()
    expect(electron.app.on).not.toHaveBeenCalledWith('ready', expect.any(Function))
  })

  test('ready event starts services, creates a window, tray, menus, and shortcuts', async () => {
    await loadApp()
    mocks.appEvents.ready()

    const win = mocks.browserWindowInstances[0]
    expect(mocks.startup).toHaveBeenCalled()
    expect(mocks.httpServer).toHaveBeenCalledWith(4555)
    expect(mocks.protocolHandlers['yank-note']).toEqual(expect.any(Function))
    expect(win.options).toMatchObject({
      show: false,
      minWidth: 940,
      minHeight: 500,
      frame: false,
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        contextIsolation: false,
      },
    })
    expect(win.options.icon).toContain('/assets/icon.png')
    expect(win.setMenu).toHaveBeenCalledWith(null)
    expect(win.loadURL).toHaveBeenCalledWith('url:scheme:4555:8066')
    expect(mocks.initJSONRPCClient).toHaveBeenCalledWith(win.webContents)
    expect(mocks.getTrayMenus).toHaveBeenCalled()
    expect(mocks.trayInstances[0].setToolTip).toHaveBeenCalledWith('app-name - slogan')
    expect(mocks.registerShortcut).toHaveBeenCalledWith(expect.objectContaining({
      'show-main-window': expect.any(Function),
      'hide-main-window': expect.any(Function),
      'open-in-browser': expect.any(Function),
    }))

    win.events['once:ready-to-show']()
    expect(win.show).toHaveBeenCalled()

    const preventNavigate = { preventDefault: vi.fn() }
    win.webContents.events['will-navigate'](preventNavigate)
    expect(preventNavigate.preventDefault).toHaveBeenCalled()
  })

  test('restores, saves, hides, reloads, and quits through registered window actions', async () => {
    mocks.store.set('window.state', { x: -100, y: -100, width: 2000, height: 1000, maximized: false })
    mocks.configStore.set('hide-main-window-on-startup', true)
    mocks.configStore.set('keep-running-after-closing-window', true)
    await loadApp()
    mocks.appEvents.ready()
    const win = mocks.browserWindowInstances[0]

    expect(win.setBounds).toHaveBeenCalledWith({ x: 0, y: 0, width: 1280, height: 720, maximized: false })
    win.events['once:ready-to-show']()
    expect(win.hide).toHaveBeenCalled()
    expect(win.setSkipTaskbar).toHaveBeenCalledWith(true)

    const closeEvent = { preventDefault: vi.fn() }
    win.events.close(closeEvent)
    expect(closeEvent.preventDefault).toHaveBeenCalled()
    expect(mocks.store.get('window.state')).toMatchObject({ maximized: false })
    expect(win.hide).toHaveBeenCalled()

    await mocks.actions['reload-main-window']()
    expect(win.loadURL).toHaveBeenLastCalledWith('url:scheme:4555:8066')
    const unloadEvent = { preventDefault: vi.fn() }
    win.webContents.events['will-prevent-unload'](unloadEvent)
    expect(unloadEvent.preventDefault).toHaveBeenCalled()

    await mocks.actions.quit()
    expect(mocks.killPtyProcesses).toHaveBeenCalled()
    expect(win.destroy).toHaveBeenCalled()
  })

  test('handles open-file, second-instance, and open-url branches', async () => {
    process.argv = ['/electron', '/app/app.js', 'argv-doc.md']
    await loadApp()
    mocks.appEvents.ready()
    const win = mocks.browserWindowInstances[0]

    win.events['once:ready-to-show']()
    await flushPromises()
    expect(mocks.jsonRPCClient.call.ctx.doc.switchDocByPath).toHaveBeenCalledWith(expect.stringContaining('argv-doc.md'))

    mocks.appEvents['open-url']({ preventDefault: vi.fn() }, 'yank-note://open?id=1')
    expect(mocks.jsonRPCClient.call.ctx.base.triggerDeepLinkOpen).toHaveBeenCalledWith('yank-note://open?id=1')

    mocks.appEvents['second-instance']({}, ['/electron', 'yank-note://deep'])
    expect(mocks.jsonRPCClient.call.ctx.base.triggerDeepLinkOpen).toHaveBeenCalledWith('yank-note://deep')

    mocks.appEvents['second-instance']({}, ['/electron', 'second.md'])
    await flushPromises()
    expect(mocks.jsonRPCClient.call.ctx.doc.switchDocByPath).toHaveBeenCalledWith(expect.stringContaining('second.md'))

    mocks.fsStat.mockResolvedValueOnce({ isFile: () => false })
    mocks.appEvents['open-file']({ preventDefault: vi.fn() }, '/tmp/folder')
    await flushPromises()
    expect(mocks.dialogShowMessageBox).toHaveBeenCalledWith(win, { message: 'Yank Note only support open file.' })
  })

  test('serves protocol requests and shows port errors via settings panel', async () => {
    await loadApp()
    mocks.appEvents.ready()

    const callback = vi.fn()
    await mocks.protocolHandlers['yank-note']({ url: 'yank-note://localhost/a' }, callback)
    expect(mocks.transformProtocolRequest).toHaveBeenCalled()
    expect(mocks.httpHandler).toHaveBeenCalled()
    expect(callback).toHaveBeenCalledWith({
      headers: { 'x-test': 'ok' },
      statusCode: 204,
      data: 'stream-body',
    })

    mocks.serverEvents.error(new Error('listen EADDRINUSE'))
    vi.advanceTimersByTime(4000)
    await flushPromises()
    expect(mocks.dialogShowMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      message: 'app.error.EADDRINUSE:4555',
    }))
    vi.advanceTimersByTime(500)
    vi.advanceTimersByTime(200)
    expect(mocks.jsonRPCClient.call.ctx.setting.showSettingPanel).toHaveBeenCalledWith('server.port')
  })

  test('handles web-contents-created frame fixes and window-open allow list', async () => {
    await loadApp()
    const frame = {
      events: {} as Record<string, Function>,
      executeJavaScript: vi.fn(),
      on: vi.fn((event: string, handler: Function) => {
        frame.events[event] = handler
      }),
    }
    const webContents = {
      events: {} as Record<string, Function>,
      on: vi.fn((event: string, handler: Function) => {
        webContents.events[event] = handler
      }),
      setWindowOpenHandler: vi.fn((handler: Function) => {
        webContents.windowOpenHandler = handler
      }),
      windowOpenHandler: undefined as any,
    }

    mocks.appEvents['web-contents-created']({}, webContents)
    expect(mocks.electronRemoteEnable).toHaveBeenCalledWith(webContents)
    webContents.events['frame-created']({}, { frame })
    frame.events['dom-ready']()
    expect(frame.executeJavaScript).toHaveBeenCalledWith(expect.stringContaining('_FIX_ELECTRON_DIALOG_FOCUS'))

    expect(webContents.windowOpenHandler({ url: 'https://example.com', features: '' })).toEqual({ action: 'deny' })
    expect(mocks.shellOpenExternal).toHaveBeenCalledWith('https://example.com')
    expect(webContents.windowOpenHandler({
      url: 'http://localhost:4555/page',
      features: 'webSecurity=false,nodeIntegrationInSubFrames=true,custom=skip',
    })).toEqual({
      action: 'allow',
      overrideBrowserWindowOptions: {
        webPreferences: {
          webSecurity: false,
          nodeIntegrationInSubFrames: true,
        },
      },
    })
    expect(webContents.windowOpenHandler({ url: 'https://host/__allow-open-window__', features: '' })).toEqual({ action: 'allow' })
  })
})
