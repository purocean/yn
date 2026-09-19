const mocks = vi.hoisted(() => ({
  warn: vi.fn(),
  debug: vi.fn(),
  isMacOS: false,
}))

vi.mock('@fe/utils', () => ({
  getLogger: vi.fn(() => ({
    debug: mocks.debug,
    warn: mocks.warn,
  })),
}))

vi.mock('@fe/support/env', () => ({
  get isMacOS () {
    return mocks.isMacOS
  },
}))

import customKeybindings from '../custom-keybindings'

function createMonaco () {
  return {
    KeyMod: {
      CtrlCmd: 1 << 11,
      Shift: 1 << 10,
      Alt: 1 << 9,
      WinCtrl: 1 << 8,
      chord: vi.fn((first: number, second: number) => first * 100000 + second),
    },
    KeyCode: {
      Backspace: 1,
      KeyK: 42,
      KeyS: 50,
      KeyX: 55,
      KeyW: 56,
      KeyZ: 57,
      Digit1: 101,
      Comma: 102,
      Minus: 103,
      Numpad1: 104,
      IntlBackslash: 105,
    },
    editor: {
      addKeybindingRules: vi.fn(() => ({ dispose: vi.fn() })),
    },
  } as any
}

function createCtx (keybindings: any[], nonUsLayout = false) {
  const monaco = createMonaco()
  const action = { name: 'workbench.open', keys: [] as string[], binding: undefined as string | null | undefined }
  const originalKeybinding = {
    when: { serialize: vi.fn(() => 'editorTextFocus') },
    resolvedKeybinding: {
      _chords: [
        { ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, keyCode: monaco.KeyCode.KeyK },
        { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, keyCode: monaco.KeyCode.KeyS },
      ],
    },
  }
  const service = {
    _contextKeyService: {},
    _getResolver: vi.fn(() => ({
      lookupPrimaryKeybinding: vi.fn((command: string) => command === 'editor.save' ? originalKeybinding : null),
    })),
  }
  const hookCallbacks = new Map<string, any>()

  return {
    action: {
      tapAction: vi.fn((fn: any) => fn(action)),
    },
    editor: {
      getEditor: vi.fn(() => ({ _standaloneKeybindingService: service })),
      getMonaco: vi.fn(() => monaco),
      whenEditorReady: vi.fn(() => Promise.resolve({ editor: {}, monaco })),
    },
    lib: {
      lodash: {
        keyBy: (items: any[], key: string) => Object.fromEntries(items.map(item => [item[key], item])),
      },
    },
    registerHook: vi.fn((name: string, fn: any) => hookCallbacks.set(name, fn)),
    setting: {
      getSetting: vi.fn((key: string, fallback?: any) => key === 'keybindings' ? keybindings : key === 'keybindings.non-us-layout' ? nonUsLayout : fallback),
    },
    triggerHook: vi.fn(),
    ui: { useToast: vi.fn(() => ({ show: vi.fn() })) },
    _hookCallbacks: hookCallbacks,
    _monaco: monaco,
    _action: action,
  } as any
}

describe('custom-keybindings plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.warn.mockClear()
    mocks.debug.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('maps workbench action keys and editor keybinding overrides', async () => {
    const ctx = createCtx([
      { type: 'workbench', command: 'workbench.open', keys: 'ctrl+1' },
      { type: 'editor', command: 'editor.save', keys: 'ctrl+shift+k' },
    ])

    customKeybindings.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    expect(ctx.action.tapAction).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx._action.keys).toEqual(['ctrl', '1'])
    expect(ctx._action.binding).toBeUndefined()
    expect(ctx._monaco.editor.addKeybindingRules).toHaveBeenCalledWith([
      { command: '-editor.save', keybinding: expect.any(Number), when: 'editorTextFocus' },
      { command: 'editor.save', keybinding: (1 << 11) | (1 << 10) | 42, when: 'editorTextFocus' },
    ])
    expect(ctx.triggerHook).not.toHaveBeenCalled()

    ctx._hookCallbacks.get('SETTING_CHANGED')({ changedKeys: ['keybindings'] })
    expect(ctx.triggerHook).toHaveBeenCalledWith('COMMAND_KEYBINDING_CHANGED')
    expect(ctx._monaco.editor.addKeybindingRules).toHaveBeenCalledTimes(2)

    ctx._hookCallbacks.get('SETTING_CHANGED')({ changedKeys: ['keybindings.non-us-layout'] })
    expect(ctx._monaco.editor.addKeybindingRules).toHaveBeenCalledTimes(3)
  })

  test('uses binding metadata for workbench actions only while enabled', () => {
    const binding = 'mode=code,key=w,code=KeyZ,ctrl,location=0'
    const entries = [{ type: 'workbench', command: 'workbench.open', keys: 'Ctrl+w', binding }]
    const legacyCtx = createCtx(entries)
    customKeybindings.register(legacyCtx)
    expect(legacyCtx._action.keys).toEqual(['Ctrl', 'w'])
    expect(legacyCtx._action.binding).toBeUndefined()

    const nonUsCtx = createCtx(entries, true)
    customKeybindings.register(nonUsCtx)
    expect(nonUsCtx._action.keys).toEqual(['Ctrl', 'KeyZ'])
    expect(nonUsCtx._action.binding).toBe(binding)
  })

  test('maps logical editor letters to Monaco key codes', async () => {
    const ctx = createCtx([
      { type: 'editor', command: 'editor.rename', keys: 'ctrl+w' },
    ])

    customKeybindings.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    expect(ctx._monaco.editor.addKeybindingRules).toHaveBeenCalledWith([
      { command: 'editor.rename', keybinding: (1 << 11) | 56, when: undefined },
    ])
  })

  test('uses the physical key from a binding when present', async () => {
    const ctx = createCtx([
      { type: 'editor', command: 'editor.rename', keys: 'ctrl+w', binding: 'mode=code,key=w,code=KeyZ,ctrl,location=0' },
    ], true)

    customKeybindings.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    expect(ctx._monaco.editor.addKeybindingRules).toHaveBeenCalledWith([
      { command: 'editor.rename', keybinding: (1 << 11) | 57, when: undefined },
    ])
  })

  test('ignores binding metadata while the option is disabled', async () => {
    const ctx = createCtx([
      { type: 'editor', command: 'editor.rename', keys: 'ctrl+w', binding: 'mode=code,key=w,code=KeyZ,ctrl,location=0' },
    ])

    customKeybindings.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    expect(ctx._monaco.editor.addKeybindingRules).toHaveBeenCalledWith([
      { command: 'editor.rename', keybinding: (1 << 11) | 56, when: undefined },
    ])
  })

  test('keeps the existing IntlBackslash mapping in both modes', async () => {
    const binding = 'mode=code,key=%3C,code=IntlBackslash,ctrl,location=0'
    const entries = [{ type: 'editor', command: 'editor.layout', keys: 'Ctrl+IntlBackslash', binding }]
    const legacyCtx = createCtx(entries)
    customKeybindings.register(legacyCtx)
    await legacyCtx.editor.whenEditorReady.mock.results[0].value
    expect(legacyCtx._monaco.editor.addKeybindingRules).toHaveBeenCalledWith([
      { command: 'editor.layout', keybinding: (1 << 11) | 105, when: undefined },
    ])

    const nonUsCtx = createCtx(entries, true)
    customKeybindings.register(nonUsCtx)
    await nonUsCtx.editor.whenEditorReady.mock.results[0].value
    expect(nonUsCtx._monaco.editor.addKeybindingRules).toHaveBeenCalledWith([
      { command: 'editor.layout', keybinding: (1 << 11) | 105, when: undefined },
    ])

    const oldEntryCtx = createCtx([{ type: 'editor', command: 'editor.layout', keys: 'Ctrl+IntlBackslash' }], true)
    customKeybindings.register(oldEntryCtx)
    await oldEntryCtx.editor.whenEditorReady.mock.results[0].value
    expect(oldEntryCtx._monaco.editor.addKeybindingRules).toHaveBeenCalledWith([
      { command: 'editor.layout', keybinding: (1 << 11) | 105, when: undefined },
    ])
  })

  test('maps recorded physical punctuation and keypad keys', async () => {
    const ctx = createCtx([
      { type: 'editor', command: 'editor.comma', keys: 'Ctrl+,', binding: 'mode=code,key=%3C,code=Comma,ctrl,location=0' },
      { type: 'editor', command: 'editor.minus', keys: 'Ctrl+-', binding: 'mode=code,key=-,code=Minus,ctrl,location=0' },
      { type: 'editor', command: 'editor.numpad', keys: 'Ctrl+Numpad1', binding: 'mode=code,key=1,code=Numpad1,ctrl,location=3' },
      { type: 'editor', command: 'editor.shiftDigit', keys: 'Ctrl+Shift+!', binding: 'mode=code,key=!,code=Digit1,ctrl,shift,location=0' },
    ], true)

    customKeybindings.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    expect(ctx._monaco.editor.addKeybindingRules).toHaveBeenCalledWith([
      { command: 'editor.comma', keybinding: (1 << 11) | 102, when: undefined },
      { command: 'editor.minus', keybinding: (1 << 11) | 103, when: undefined },
      { command: 'editor.numpad', keybinding: (1 << 11) | 104, when: undefined },
      { command: 'editor.shiftDigit', keybinding: (1 << 11) | (1 << 10) | 101, when: undefined },
    ])
  })

  test('warns and skips invalid editor keybindings', async () => {
    const ctx = createCtx([
      { type: 'editor', command: 'editor.bad', keys: 'ctrl+wat' },
    ])

    customKeybindings.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    expect(mocks.warn).toHaveBeenCalledWith('updateEditorKeybindings', 'invalid keybinding ctrl+wat for command editor.bad')
    expect(ctx._monaco.editor.addKeybindingRules).not.toHaveBeenCalled()
  })
})
