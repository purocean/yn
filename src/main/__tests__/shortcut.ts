const mocks = vi.hoisted(() => ({
  configGet: vi.fn(),
  configGetAll: vi.fn(),
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
    getAll: () => mocks.configGetAll(),
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
  function setKeybindings (items: any[], nonUsLayout = false) {
    mocks.configGetAll.mockReturnValue({ 'keybindings.non-us-layout': nonUsLayout })
    mocks.configGet.mockImplementation((key: string, fallback: any) => {
      if (key === 'keybindings') return items
      return fallback
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.registeredActions = {}
    mocks.configGet.mockImplementation((_key: string, defaultValue: any) => defaultValue)
    mocks.configGetAll.mockReturnValue({})
    mocks.globalShortcutIsRegistered.mockReturnValue(true)
    mocks.getAction.mockImplementation((name: string) => {
      if (name === 'refresh-menus') return vi.fn()
      return undefined
    })
  })

  test('normalizes custom keybindings and falls back to defaults', async () => {
    setKeybindings([
      { type: 'application', command: 'show-main-window', keys: 'Ctrl+KeyK' },
      { type: 'application', command: 'open-in-browser', keys: '' },
    ])
    const { getAccelerator } = await loadShortcut()

    expect(getAccelerator('show-main-window')).toBe('Ctrl+K')
    expect(mocks.configGet).not.toHaveBeenCalledWith('keybindings.non-us-layout', expect.anything())
    expect(getAccelerator('open-in-browser')).toBeUndefined()
    expect(getAccelerator('hide-main-window')).toBeUndefined()
  })

  test('prefers the physical key in the binding field', async () => {
    setKeybindings([
      { type: 'application', command: 'show-main-window', keys: 'Ctrl+w', binding: 'mode=code,key=w,code=KeyZ,ctrl,location=0' },
    ], true)
    const { getAccelerator } = await loadShortcut()

    expect(getAccelerator('show-main-window')).toBe('Ctrl+Z')
  })

  test('ignores binding metadata when the non-US option is disabled', async () => {
    setKeybindings([
      { type: 'application', command: 'show-main-window', keys: 'Ctrl+w', binding: 'mode=code,key=w,code=KeyZ,ctrl,location=0' },
    ])
    const { getAccelerator } = await loadShortcut()
    expect(getAccelerator('show-main-window')).toBe('Ctrl+w')
  })

  test('converts physical punctuation and keypad codes to Electron accelerators', async () => {
    setKeybindings([
      { type: 'application', command: 'show-main-window', keys: 'Ctrl+,', binding: 'mode=code,key=%3C,code=Comma,ctrl,location=0' },
      { type: 'application', command: 'open-in-browser', keys: 'Ctrl+Numpad1', binding: 'mode=code,key=1,code=Numpad1,ctrl,location=3' },
    ], true)
    const { getAccelerator } = await loadShortcut()

    expect(getAccelerator('show-main-window')).toBe('Ctrl+,')
    expect(getAccelerator('open-in-browser')).toBe('Ctrl+num1')
  })

  test('uses Electron Super for a recorded Windows key', async () => {
    setKeybindings([
      { type: 'application', command: 'show-main-window', keys: 'Win+K', binding: 'mode=key,key=k,code=KeyK,meta,location=0' },
    ], true)
    const { getAccelerator } = await loadShortcut()

    expect(getAccelerator('show-main-window')).toBe('Super+k')
  })

  test('registers shifted punctuation by its recorded physical key', async () => {
    setKeybindings([
      { type: 'application', command: 'show-main-window', keys: 'Ctrl+Shift+!', binding: 'mode=code,key=!,code=Digit1,ctrl,shift,location=0' },
    ], true)
    const { getAccelerator } = await loadShortcut()

    expect(getAccelerator('show-main-window')).toBe('Ctrl+Shift+1')
  })

  test('registers shortcuts, reports failed registrations, and refreshes menus', async () => {
    const refreshMenus = vi.fn()
    mocks.getAction.mockImplementation((name: string) => name === 'refresh-menus' ? refreshMenus : undefined)
    setKeybindings([
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
    setKeybindings([
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

    mocks.globalShortcutRegister.mockClear()
    mocks.registeredActions['shortcuts.reload'](['keybindings.non-us-layout'])
    expect(mocks.globalShortcutRegister).toHaveBeenCalledWith('Ctrl+K', command)
  })
})
