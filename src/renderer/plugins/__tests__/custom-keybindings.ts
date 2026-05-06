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
      Digit1: 101,
    },
    editor: {
      addKeybindingRules: vi.fn(() => ({ dispose: vi.fn() })),
    },
  } as any
}

function createCtx (keybindings: any[]) {
  const monaco = createMonaco()
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
      tapAction: vi.fn((fn: any) => fn({ name: 'workbench.open', keys: [] })),
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
      getSetting: vi.fn((key: string, fallback?: any) => key === 'keybindings' ? keybindings : fallback),
    },
    triggerHook: vi.fn(),
    ui: { useToast: vi.fn(() => ({ show: vi.fn() })) },
    _hookCallbacks: hookCallbacks,
    _monaco: monaco,
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
    expect(ctx._monaco.editor.addKeybindingRules).toHaveBeenCalledWith([
      { command: '-editor.save', keybinding: expect.any(Number), when: 'editorTextFocus' },
      { command: 'editor.save', keybinding: (1 << 11) | (1 << 10) | 42, when: 'editorTextFocus' },
    ])
    expect(ctx.triggerHook).not.toHaveBeenCalled()

    ctx._hookCallbacks.get('SETTING_CHANGED')({ changedKeys: ['keybindings'] })
    expect(ctx.triggerHook).toHaveBeenCalledWith('COMMAND_KEYBINDING_CHANGED')
    expect(ctx._monaco.editor.addKeybindingRules).toHaveBeenCalledTimes(2)
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
