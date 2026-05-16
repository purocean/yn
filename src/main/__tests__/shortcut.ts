const mocks = vi.hoisted(() => ({
  configGet: vi.fn(),
  dialogShowErrorBox: vi.fn(),
  getAction: vi.fn(),
  globalShortcutRegister: vi.fn(),
  globalShortcutUnregisterAll: vi.fn(),
  globalShortcutIsRegistered: vi.fn(),
  registeredActions: {} as Record<string, Function>,
}))

vi.mock('electron', () => ({
  dialog: {
    showErrorBox: (...args: any[]) => mocks.dialogShowErrorBox(...args),
  },
  globalShortcut: {
    register: (...args: any[]) => mocks.globalShortcutRegister(...args),
    unregisterAll: (...args: any[]) => mocks.globalShortcutUnregisterAll(...args),
    isRegistered: (...args: any[]) => mocks.globalShortcutIsRegistered(...args),
  },
}))

vi.mock('../constant', () => ({
  FLAG_DISABLE_SERVER: false,
}))

vi.mock('../config', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mocks.configGet(...args),
  }
}))

vi.mock('../action', () => ({
  getAction: (...args: any[]) => mocks.getAction(...args),
  registerAction: (name: string, handler: Function) => {
    mocks.registeredActions[name] = handler
  },
}))

async function loadShortcut () {
  vi.resetModules()
  return await import('../shortcut')
}

describe('main shortcut module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.registeredActions = {}
    mocks.configGet.mockImplementation((_key: string, defaultValue: any) => defaultValue)
    mocks.globalShortcutIsRegistered.mockReturnValue(true)
    mocks.getAction.mockImplementation((name: string) => {
      if (name === 'refresh-menus') return vi.fn()
      return undefined
    })
  })

  test('normalizes custom keybindings and falls back to defaults', async () => {
    mocks.configGet.mockReturnValue([
      { type: 'application', command: 'show-main-window', keys: 'Ctrl+KeyK' },
      { type: 'application', command: 'open-in-browser', keys: '' },
    ])
    const { getAccelerator } = await loadShortcut()

    expect(getAccelerator('show-main-window')).toBe('Ctrl+K')
    expect(getAccelerator('open-in-browser')).toBeUndefined()
    expect(getAccelerator('hide-main-window')).toBeUndefined()
  })

  test('registers shortcuts, reports failed registrations, and refreshes menus', async () => {
    const refreshMenus = vi.fn()
    mocks.getAction.mockImplementation((name: string) => name === 'refresh-menus' ? refreshMenus : undefined)
    mocks.configGet.mockReturnValue([
      { type: 'application', command: 'show-main-window', keys: 'Ctrl+KeyK' },
      { type: 'application', command: 'open-in-browser', keys: 'Ctrl+KeyB' },
    ])
    mocks.globalShortcutIsRegistered
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
    const showMainWindow = vi.fn()
    const openInBrowser = vi.fn()
    const { registerShortcut } = await loadShortcut()

    registerShortcut({
      'show-main-window': showMainWindow,
      'open-in-browser': openInBrowser,
    }, true)

    expect(mocks.globalShortcutUnregisterAll).toHaveBeenCalled()
    expect(mocks.globalShortcutRegister).toHaveBeenNthCalledWith(1, 'Ctrl+K', showMainWindow)
    expect(mocks.globalShortcutRegister).toHaveBeenNthCalledWith(2, 'Ctrl+B', openInBrowser)
    expect(mocks.dialogShowErrorBox).toHaveBeenCalledWith('Error', 'Failed to register shortcut: Ctrl+B')
    expect(refreshMenus).toHaveBeenCalled()
  })

  test('reload action re-registers shortcuts only when keybindings changed', async () => {
    mocks.configGet.mockReturnValue([
      { type: 'application', command: 'show-main-window', keys: 'Ctrl+KeyK' },
    ])
    const { registerShortcut } = await loadShortcut()
    const command = vi.fn()

    registerShortcut({ 'show-main-window': command })
    mocks.globalShortcutRegister.mockClear()
    mocks.registeredActions['shortcuts.reload'](['theme'])
    expect(mocks.globalShortcutRegister).not.toHaveBeenCalled()

    mocks.registeredActions['shortcuts.reload'](['keybindings'])
    expect(mocks.globalShortcutRegister).toHaveBeenCalledWith('Ctrl+K', command)
  })
})
