const mocks = vi.hoisted(() => ({
  actions: {} as Record<string, any>,
  buildFromTemplate: vi.fn((template: any[]) => ({ template })),
  checkForUpdates: vi.fn(),
  getAccelerator: vi.fn(),
  getLoginItemSettings: vi.fn(),
  getVersion: vi.fn(),
  openExternal: vi.fn(),
  openPath: vi.fn(),
  relaunch: vi.fn(),
  setLoginItemSettings: vi.fn(),
  exit: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    getLoginItemSettings: (...args: any[]) => mocks.getLoginItemSettings(...args),
    setLoginItemSettings: (...args: any[]) => mocks.setLoginItemSettings(...args),
    getVersion: (...args: any[]) => mocks.getVersion(...args),
    relaunch: (...args: any[]) => mocks.relaunch(...args),
    exit: (...args: any[]) => mocks.exit(...args),
  },
  Menu: {
    buildFromTemplate: (...args: any[]) => mocks.buildFromTemplate(...args),
  },
  shell: {
    openExternal: (...args: any[]) => mocks.openExternal(...args),
    openPath: (...args: any[]) => mocks.openPath(...args),
  },
}))

vi.mock('../action', () => ({
  getAction: (name: string) => mocks.actions[name],
}))

vi.mock('../constant', () => ({
  FLAG_DISABLE_DEVTOOL: false,
  FLAG_DISABLE_SERVER: false,
  GITHUB_URL: 'https://github.test/yn',
  USER_DIR: '/user-dir',
}))

vi.mock('../shortcut', () => ({
  getAccelerator: (...args: any[]) => mocks.getAccelerator(...args),
}))

vi.mock('../updater', () => ({
  checkForUpdates: (...args: any[]) => mocks.checkForUpdates(...args),
}))

vi.mock('../i18n', () => ({
  $t: (key: string, value?: any) => typeof value === 'undefined' ? key : `${key}:${value}`,
}))

async function loadMenus () {
  vi.resetModules()
  return await import('../menus')
}

describe('main menus module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mocks.actions = {
      'get-url-mode': vi.fn(() => 'prod'),
      'get-backend-port': vi.fn(() => 3044),
      'get-dev-frontend-port': vi.fn(() => 8066),
      'get-main-widow': vi.fn(() => ({ webContents: { openDevTools: vi.fn() } })),
      'open-in-browser': vi.fn(),
      'quit': vi.fn(),
      'reload-main-window': vi.fn(),
      'set-url-mode': vi.fn(),
      'show-main-window': vi.fn(),
      'show-main-window-setting': vi.fn(),
      'toggle-fullscreen': vi.fn(),
    }
    mocks.getAccelerator.mockImplementation((name: string) => `accel:${name}`)
    mocks.getLoginItemSettings.mockReturnValue({ openAtLogin: false })
    mocks.getVersion.mockReturnValue('1.2.3')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('builds tray menus with accelerators and invokes menu callbacks', async () => {
    const { getTrayMenus } = await loadMenus()
    const menu = getTrayMenus() as any
    const template = menu.template

    expect(mocks.buildFromTemplate).toHaveBeenCalled()
    expect(template[0]).toMatchObject({
      label: 'app.tray.open-main-window',
      accelerator: 'accel:show-main-window',
    })
    template[0].click()
    expect(mocks.actions['show-main-window']).toHaveBeenCalled()

    expect(template[1]).toMatchObject({
      label: 'app.tray.open-in-browser',
      accelerator: 'accel:open-in-browser',
      visible: true,
    })
    template[1].click()
    expect(mocks.actions['open-in-browser']).toHaveBeenCalled()

    template[2].click()
    expect(mocks.openPath).toHaveBeenCalledWith('/user-dir')

    const loginItem = template[4]
    expect(loginItem.checked).toBe(false)
    mocks.getLoginItemSettings.mockReturnValue({ openAtLogin: true })
    loginItem.click(loginItem)
    expect(mocks.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: false })
    expect(loginItem.checked).toBe(true)
  })

  test('wires developer, github, updater, and delayed quit tray actions', async () => {
    const { getTrayMenus } = await loadMenus()
    const template = (getTrayMenus() as any).template
    const devSubmenu = template[6].submenu

    expect(devSubmenu[1]).toMatchObject({
      checked: true,
      label: 'app.tray.dev.port-prod:3044',
    })
    devSubmenu[0].click()
    expect(mocks.actions['set-url-mode']).toHaveBeenCalledWith('scheme')
    expect(mocks.actions['reload-main-window']).toHaveBeenCalled()

    const devToolsWin = mocks.actions['get-main-widow']()
    mocks.actions['get-main-widow'].mockReturnValueOnce(devToolsWin)
    devSubmenu[5].click()
    expect(devToolsWin.webContents.openDevTools).toHaveBeenCalled()

    devSubmenu[7].click()
    expect(mocks.relaunch).toHaveBeenCalled()
    expect(mocks.exit).toHaveBeenCalledWith(1)

    template[7].click()
    expect(mocks.openExternal).toHaveBeenCalledWith('https://github.test/yn')

    template[8].click()
    expect(mocks.checkForUpdates).toHaveBeenCalled()

    template[10].click()
    expect(mocks.actions.quit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(mocks.actions.quit).toHaveBeenCalled()
  })

  test('returns main application menus on darwin and null elsewhere', async () => {
    const platform = vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin')
    let { getMainMenus } = await loadMenus()
    let mainMenu = getMainMenus() as any

    expect(mainMenu.template[0].submenu[0].label).toBe('app.preferences')
    mainMenu.template[0].submenu[0].click()
    expect(mocks.actions['show-main-window-setting']).toHaveBeenCalled()
    mainMenu.template[0].submenu[1].click()
    expect(mocks.actions['toggle-fullscreen']).toHaveBeenCalled()

    platform.mockReturnValue('linux')
    ;({ getMainMenus } = await loadMenus())
    expect(getMainMenus()).toBeNull()
    platform.mockRestore()
  })
})
