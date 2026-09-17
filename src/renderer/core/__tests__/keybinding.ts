const actionMocks = vi.hoisted(() => ({
  actions: [] as any[],
  handler: vi.fn(),
  getAction: vi.fn((name: string) => actionMocks.actions.find(action => action.name === name)),
  getRawActions: vi.fn(() => actionMocks.actions),
  getActionHandler: vi.fn(() => actionMocks.handler),
}))

const hookMocks = vi.hoisted(() => ({
  triggerHook: vi.fn(),
  registerHook: vi.fn(),
}))

const envMocks = vi.hoisted(() => ({
  isMacOS: false,
  isOtherOS: false,
  isWindows: true,
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => new Proxy({}, { get: () => vi.fn() }),
}))

vi.mock('@fe/support/env', () => ({
  get isMacOS () {
    return envMocks.isMacOS
  },
  get isOtherOS () {
    return envMocks.isOtherOS
  },
  get isWindows () {
    return envMocks.isWindows
  },
}))

vi.mock('@fe/support/args', () => ({
  FLAG_DISABLE_SHORTCUTS: false,
}))

vi.mock('@fe/core/action', () => actionMocks)

vi.mock('@fe/core/hook', () => hookMocks)

describe('renderer keybinding utilities', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useRealTimers()
    envMocks.isMacOS = false
    envMocks.isOtherOS = false
    envMocks.isWindows = true
    window._INIT_SETTINGS = { 'keybindings.non-us-layout': false }
    actionMocks.actions = []
    actionMocks.handler.mockClear()
    actionMocks.getAction.mockClear()
    actionMocks.getRawActions.mockClear()
    actionMocks.getActionHandler.mockClear()
    hookMocks.triggerHook.mockClear()
    hookMocks.registerHook.mockClear()
  })

  function keyboardEvent (type: string, init: KeyboardEventInit) {
    const event = new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      ...init,
    })
    vi.spyOn(event, 'stopPropagation')
    vi.spyOn(event, 'preventDefault')
    return event
  }

  test('labels keys and shortcut combinations for Windows-like platforms', async () => {
    const keybinding = await import('@fe/core/keybinding')

    expect(keybinding.getKeyLabel(keybinding.CtrlCmd)).toBe('Ctrl')
    expect(keybinding.getKeyLabel(keybinding.Meta)).toBe('Win')
    expect(keybinding.getKeyLabel(keybinding.BracketLeft)).toBe('[')
    expect(keybinding.getKeyLabel('arrowup')).toBe('↑')
    expect(keybinding.getKeysLabel(['CtrlCmd', 'Shift', 'P'])).toBe('Ctrl+Shift+P')

    actionMocks.actions = [{ name: 'open', keys: ['CtrlCmd', 'O'] }]
    expect(keybinding.getKeysLabel('open')).toBe('Ctrl+O')
    expect(keybinding.getKeysLabel('missing')).toBe('')
  })

  test('matches keyboard and mouse shortcuts exactly', async () => {
    const keybinding = await import('@fe/core/keybinding')

    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'o', code: 'KeyO', ctrlKey: true }), ['CtrlCmd', 'O'])).toBe(true)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'o', code: 'KeyO' }), ['CtrlCmd', 'O'])).toBe(false)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: '1', code: 'Digit1', ctrlKey: true }), ['Ctrl', '1'])).toBe(true)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp' }), ['up'])).toBe(true)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'o', code: 'KeyO' }), ['P'])).toBe(false)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'o', code: 'KeyO', altKey: true }), ['Alt', 'O'])).toBe(true)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'o', code: 'KeyO', shiftKey: true }), ['Shift', 'O'])).toBe(true)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'o', code: 'KeyO', metaKey: true }), ['Win', 'O'])).toBe(true)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'o', code: 'KeyO', ctrlKey: true, shiftKey: true }), ['CtrlCmd', 'O'])).toBe(false)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'o', code: 'KeyO' }), ['Alt', 'O'])).toBe(false)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'o', code: 'KeyO' }), ['Ctrl', 'O'])).toBe(false)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'o', code: 'KeyO' }), ['Shift', 'O'])).toBe(false)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'o', code: 'KeyO' }), ['Win', 'O'])).toBe(false)
    expect(keybinding.matchKeys(new MouseEvent('click', { button: 0 }), [0])).toBe(true)
    expect(keybinding.matchKeys(new MouseEvent('click', { button: 2 }), [0])).toBe(false)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'o', code: 'KeyO' }), [])).toBe(false)
  })

  test('matches logical characters without cross-triggering physical keys', async () => {
    window._INIT_SETTINGS['keybindings.non-us-layout'] = true
    const keybinding = await import('@fe/core/keybinding')

    // French AZERTY: the physical Z key produces the character W.
    const azertyW = keyboardEvent('keydown', { key: 'w', code: 'KeyZ', ctrlKey: true })
    expect(keybinding.matchKeys(azertyW, ['CtrlCmd', 'W'])).toBe(true)
    expect(keybinding.matchKeys(azertyW, ['CtrlCmd', 'Z'])).toBe(false)

    // Explicit physical key tokens remain available for layout-independent actions.
    expect(keybinding.matchKeys(azertyW, ['CtrlCmd', 'KeyZ'])).toBe(true)
    expect(keybinding.matchKeys(azertyW, ['CtrlCmd', 'KeyW'])).toBe(false)

    // German QWERTZ: the physical Y key produces the character Z.
    const qwertzZ = keyboardEvent('keydown', { key: 'z', code: 'KeyY', ctrlKey: true })
    expect(keybinding.matchKeys(qwertzZ, ['CtrlCmd', 'Z'])).toBe(true)
    expect(keybinding.matchKeys(qwertzZ, ['CtrlCmd', 'Y'])).toBe(false)

    // `+` is persisted as `=` with Shift to keep `+` as the settings delimiter.
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: '+', code: 'Equal', ctrlKey: true, shiftKey: true }), ['CtrlCmd', 'Shift', '='])).toBe(true)

    // Physical code names outside the common prefix list remain supported.
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: '<', code: 'IntlBackslash' }), ['IntlBackslash'])).toBe(true)
  })

  test('keeps legacy custom-key matching and checks recorded location and AltGraph', async () => {
    window._INIT_SETTINGS['keybindings.non-us-layout'] = true
    const keybinding = await import('@fe/core/keybinding')
    const qwertz = keyboardEvent('keydown', { key: 'z', code: 'KeyY', ctrlKey: true })
    expect(keybinding.matchKeys(qwertz, ['Ctrl', 'Y'])).toBe(false)
    expect(keybinding.matchKeys(qwertz, ['Ctrl', 'Y'], null)).toBe(true)

    const numpad = keyboardEvent('keydown', { key: '1', code: 'Numpad1', ctrlKey: true, location: 3 })
    expect(keybinding.matchKeys(numpad, ['Ctrl', 'Numpad1'], 'mode=code,key=1,code=Numpad1,ctrl,location=3')).toBe(true)
    expect(keybinding.matchKeys(numpad, ['Ctrl', 'Numpad1'], 'mode=code,key=1,code=Numpad1,ctrl,location=1')).toBe(false)

    const altGr = keyboardEvent('keydown', { key: '€', code: 'KeyE', ctrlKey: true, altKey: true })
    vi.spyOn(altGr, 'getModifierState').mockReturnValue(true)
    const binding = 'mode=code,key=%E2%82%AC,code=KeyE,ctrl,alt,altGraph,location=0'
    expect(keybinding.matchKeys(altGr, ['Ctrl', 'Alt', 'KeyE'], binding)).toBe(true)
    vi.mocked(altGr.getModifierState).mockReturnValue(false)
    expect(keybinding.matchKeys(altGr, ['Ctrl', 'Alt', 'KeyE'], binding)).toBe(false)
  })

  test('ignores binding metadata while the non-US option is disabled', async () => {
    const keybinding = await import('@fe/core/keybinding')
    const qwertz = keyboardEvent('keydown', { key: 'z', code: 'KeyY', ctrlKey: true })
    const binding = 'mode=key,key=z,code=KeyY,ctrl,location=0'

    expect(keybinding.matchKeys(qwertz, ['Ctrl', 'Y'], binding)).toBe(true)
    expect(keybinding.matchKeys(qwertz, ['Ctrl', 'Z'], binding)).toBe(true)
  })

  test('updates matching when settings are fetched after startup', async () => {
    const keybinding = await import('@fe/core/keybinding')
    const qwertz = keyboardEvent('keydown', { key: 'z', code: 'KeyY', ctrlKey: true })
    expect(keybinding.matchKeys(qwertz, ['Ctrl', 'Y'])).toBe(true)

    const fetched = (hookMocks.registerHook.mock.calls as any[]).find(([name]) => name === 'SETTING_FETCHED')?.[1]
    expect(fetched).toBeTypeOf('function')
    fetched({ settings: { 'keybindings.non-us-layout': true } })
    expect(keybinding.matchKeys(qwertz, ['Ctrl', 'Y'])).toBe(false)
    expect(keybinding.matchKeys(qwertz, ['Ctrl', 'Z'])).toBe(true)
  })

  test('uses mac and other platform labels and modifiers', async () => {
    envMocks.isMacOS = true
    envMocks.isWindows = false
    let keybinding = await import('@fe/core/keybinding')

    expect(keybinding.hasCtrlCmd(keyboardEvent('keydown', { key: 'k', code: 'KeyK', metaKey: true }))).toBe(true)
    expect(keybinding.getKeysLabel(['CtrlCmd', 'Alt', 'Shift', 'Meta'])).toBe('⌘ ⌥ ⇧ ⌘')
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'k', code: 'KeyK', metaKey: true }), ['Cmd', 'K'])).toBe(true)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'k', code: 'KeyK' }), ['Cmd', 'K'])).toBe(false)

    vi.resetModules()
    envMocks.isMacOS = false
    envMocks.isOtherOS = true
    envMocks.isWindows = false
    keybinding = await import('@fe/core/keybinding')
    expect(keybinding.getKeyLabel('Meta')).toBe('Meta')
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'k', code: 'KeyK', metaKey: true }), ['Meta', 'K'])).toBe(true)
    expect(keybinding.matchKeys(keyboardEvent('keydown', { key: 'k', code: 'KeyK' }), ['Meta', 'K'])).toBe(false)
  })

  test('records keydown state and clears it on keyup', async () => {
    const keybinding = await import('@fe/core/keybinding')

    keybinding.keydownHandler(keyboardEvent('keydown', { key: 'a', code: 'KeyA' }))
    expect(keybinding.isKeydown('A')).toBe(true)

    keybinding.keyupHandler(keyboardEvent('keyup', { key: 'a', code: 'KeyA' }))
    expect(keybinding.isKeydown('A')).toBe(false)
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('GLOBAL_KEYUP', expect.any(KeyboardEvent))
  })

  test('executes the first matching enabled action and stops the event', async () => {
    const keybinding = await import('@fe/core/keybinding')
    const event = keyboardEvent('keydown', { key: 'o', code: 'KeyO', ctrlKey: true })

    actionMocks.actions = [
      { name: 'disabled', keys: ['CtrlCmd', 'O'], when: () => false },
      { name: 'no-keys' },
      { name: 'open', keys: ['CtrlCmd', 'O'] },
      { name: 'later', keys: ['CtrlCmd', 'O'] },
    ]

    keybinding.keydownHandler(event)

    expect(hookMocks.triggerHook).toHaveBeenCalledWith('GLOBAL_KEYDOWN', event)
    expect(event.stopPropagation).toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalled()
    expect(actionMocks.getActionHandler).toHaveBeenCalledWith('open')
    expect(actionMocks.handler).toHaveBeenCalledTimes(1)
  })

  test('handles iframe keyboard-like events and mac dead-key focus restoration', async () => {
    vi.useFakeTimers()
    envMocks.isMacOS = true
    envMocks.isWindows = false
    const keybinding = await import('@fe/core/keybinding')
    const target = { blur: vi.fn(), focus: vi.fn() }
    const event = {
      type: 'keydown',
      key: 'Dead',
      code: 'KeyE',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target,
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
      toString: () => '[object KeyboardEvent]',
    } as any
    actionMocks.actions = [{ name: 'accent', keys: ['CtrlCmd', 'E'] }]

    expect(keybinding.matchKeys(event, ['CtrlCmd', 'E'])).toBe(true)
    keybinding.keydownHandler(event)
    vi.runAllTimers()

    expect(target.blur).toHaveBeenCalledTimes(1)
    expect(target.focus).toHaveBeenCalledTimes(1)
    expect(actionMocks.handler).toHaveBeenCalledTimes(1)
  })

  test('can disable and re-enable shortcut execution', async () => {
    const keybinding = await import('@fe/core/keybinding')
    const event = keyboardEvent('keydown', { key: 'o', code: 'KeyO', ctrlKey: true })
    actionMocks.actions = [{ name: 'open', keys: ['CtrlCmd', 'O'] }]

    keybinding.disableShortcuts()
    keybinding.keydownHandler(event)
    expect(actionMocks.handler).not.toHaveBeenCalled()

    keybinding.enableShortcuts()
    keybinding.keydownHandler(event)
    expect(actionMocks.handler).toHaveBeenCalledTimes(1)
  })
})
