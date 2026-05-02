const actionMocks = vi.hoisted(() => ({
  actions: [] as any[],
  handler: vi.fn(),
  getAction: vi.fn((name: string) => actionMocks.actions.find(action => action.name === name)),
  getRawActions: vi.fn(() => actionMocks.actions),
  getActionHandler: vi.fn(() => actionMocks.handler),
}))

const hookMocks = vi.hoisted(() => ({
  triggerHook: vi.fn(),
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
    actionMocks.actions = []
    actionMocks.handler.mockClear()
    actionMocks.getAction.mockClear()
    actionMocks.getRawActions.mockClear()
    actionMocks.getActionHandler.mockClear()
    hookMocks.triggerHook.mockClear()
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
