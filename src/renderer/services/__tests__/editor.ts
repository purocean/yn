const mocks = vi.hoisted(() => ({
  state: {
    wordWrap: 'off' as 'off' | 'on',
    typewriterMode: false,
    editor: 'default',
    currentFile: null as any,
  },
  settings: new Map<string, any>(),
  hooks: new Map<string, any[]>(),
  watchers: [] as any[],
  actions: [] as any[],
  ioc: new Map<string, any[]>(),
  toastShow: vi.fn(),
  triggerHook: vi.fn(),
  consoleError: vi.fn(),
  isMacOS: true,
  isElectron: false,
}))

vi.mock('lodash-es', async importOriginal => ({
  ...await importOriginal<typeof import('lodash-es')>(),
  debounce: (fn: any) => fn,
  cloneDeep: (value: any) => JSON.parse(JSON.stringify(value)),
}))

vi.mock('monaco-editor/esm/vs/basic-languages/markdown/markdown.js', () => ({
  language: { tokenizer: { root: [['#.*', 'keyword']] } },
}))

vi.mock('@fe/support/env', () => ({
  get isMacOS () {
    return mocks.isMacOS
  },
  get isElectron () {
    return mocks.isElectron
  },
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: vi.fn((name: string, handler: any) => {
    const items = mocks.hooks.get(name) || []
    items.push(handler)
    mocks.hooks.set(name, items)
  }),
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/core/action', () => ({
  registerAction: vi.fn((action: any) => {
    mocks.actions.push(action)
    return action
  }),
  getActionHandler: vi.fn(() => vi.fn()),
}))

vi.mock('@fe/core/ioc', () => ({
  register: vi.fn((key: string, value: any) => {
    const items = mocks.ioc.get(key) || []
    items.push(value)
    mocks.ioc.set(key, items)
  }),
  get: vi.fn((key: string) => [...(mocks.ioc.get(key) || [])]),
  removeWhen: vi.fn((key: string, when: (item: any) => boolean) => {
    mocks.ioc.set(key, (mocks.ioc.get(key) || []).filter(item => !when(item)))
  }),
}))

vi.mock('@fe/core/keybinding', () => ({
  Alt: 'Alt',
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: mocks.state,
    watch: vi.fn((getter: any, cb: any) => {
      mocks.watchers.push({ getter, cb })
    }),
  },
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow }),
}))

vi.mock('@fe/utils', () => ({
  sleep: vi.fn(() => Promise.resolve()),
}))

vi.mock('@fe/services/theme', () => ({
  getColorScheme: () => 'dark',
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: (key: string, fallback?: any) => mocks.settings.has(key) ? mocks.settings.get(key) : fallback,
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string) => key,
}))

vi.mock('@fe/support/args', () => ({
  FLAG_READONLY: false,
}))

import {
  DEFAULT_MAC_FONT_FAMILY,
  deleteLine,
  getAvailableCustomEditors,
  getDefaultOptions,
  getEditor,
  getLineLanguageId,
  getLineContent,
  getLinesContent,
  getMarkdownMonarchLanguage,
  getOneIndent,
  getSelectionInfo,
  getSimpleCompletionItems,
  getValue,
  insert,
  insertAt,
  isDefault,
  isDirty,
  highlightLine,
  lookupKeybindingKeys,
  registerCustomEditor,
  removeCustomEditor,
  replaceLine,
  replaceLines,
  replaceValue,
  setValue,
  switchEditor,
  tapMarkdownMonarchLanguage,
  tapSimpleCompletionItems,
  toggleTypewriterMode,
  toggleWrap,
  whenEditorReady,
} from '@fe/services/editor'

class Range {
  constructor (
    public startLineNumber: number,
    public startColumn: number,
    public endLineNumber: number,
    public endColumn: number,
  ) {}
}

class Position {
  constructor (public lineNumber: number, public column: number) {}
}

const makeModel = () => ({
  uri: { toString: () => 'yn://note.md' },
  getOptions: vi.fn(() => ({ insertSpaces: true, tabSize: 2 })),
  getLineLength: vi.fn((line: number) => line * 3),
  getLineContent: vi.fn((line: number) => `line ${line}`),
  getValueInRange: vi.fn((range: any) => `range:${range.startLineNumber}-${range.endLineNumber}`),
  getValue: vi.fn(() => 'foo foo'),
  getFullModelRange: vi.fn(() => new Range(1, 1, 2, 4)),
  getLineCount: vi.fn(() => 2),
})

const makeEditor = () => ({
  getModel: vi.fn(() => makeModel()),
  getSelection: vi.fn(() => ({ endLineNumber: 2, endColumn: 4, positionLineNumber: 2, positionColumn: 4, startLineNumber: 1 })),
  getSelections: vi.fn(() => [{}, {}]),
  executeEdits: vi.fn(),
  pushUndoStop: vi.fn(),
  focus: vi.fn(),
  setPosition: vi.fn(),
  saveViewState: vi.fn(() => ({ top: 1 })),
  restoreViewState: vi.fn(),
  getOption: vi.fn(() => ({ isViewportWrapping: false, isDominatedByLongLines: false })),
  updateOptions: vi.fn(),
  trigger: vi.fn(),
  revealLineNearTop: vi.fn(),
  createDecorationsCollection: vi.fn(() => ({ clear: vi.fn() })),
  _standaloneKeybindingService: {
    lookupKeybinding: vi.fn((id: string) => id === 'cmd' ? { getElectronAccelerator: () => 'Ctrl+K', getUserSettingsLabel: () => null } : null),
  },
  onDidChangeCursorPosition: vi.fn(),
  onDidChangeModelContent: vi.fn(),
  onDidAttemptReadOnlyEdit: vi.fn(),
  revealPositionInCenter: vi.fn(),
})

const makeMonaco = () => ({
  Range,
  Position,
  editor: { DefaultEndOfLine: { LF: 1 }, EditorOption: { wrappingInfo: 7 }, setTheme: vi.fn() },
  languages: { setMonarchTokensProvider: vi.fn() },
})

function fireHook (name: string, payload: any) {
  for (const handler of mocks.hooks.get(name) || []) {
    handler(payload)
  }
}

beforeEach(() => {
  mocks.state.wordWrap = 'off'
  mocks.state.typewriterMode = false
  mocks.state.editor = 'default'
  mocks.state.currentFile = null
  mocks.settings.clear()
  mocks.ioc.clear()
  mocks.watchers.length = 0
  mocks.toastShow.mockClear()
  mocks.triggerHook.mockClear()
  mocks.consoleError.mockClear()
  vi.spyOn(console, 'error').mockImplementation(mocks.consoleError)
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('builds default options from settings and platform flags', () => {
  mocks.settings.set('editor.font-family', 'Fira Code')
  mocks.settings.set('editor.font-size', 18)
  mocks.settings.set('editor.minimap', false)
  mocks.settings.set('editor.rulers', '80,120')

  expect(getDefaultOptions()).toMatchObject({
    theme: 'vs-dark',
    fontSize: 18,
    wordWrap: 'off',
    links: true,
    fontFamily: 'MacEmoji, Fira Code',
    minimap: { enabled: false },
    rulers: [80, 120],
  })

  mocks.settings.delete('editor.font-family')
  expect(getDefaultOptions().fontFamily).toBe(DEFAULT_MAC_FONT_FAMILY)
})

test('initializes Monaco, resolves readiness, and edits text through editor helpers', async () => {
  const editor = makeEditor()
  const monaco = {
    ...makeMonaco(),
  }

  fireHook('MONACO_READY', { monaco, editor })

  await expect(whenEditorReady()).resolves.toEqual({ monaco, editor })
  expect(getEditor()).toBe(editor)

  insert(' text')
  insertAt(new Position(3, 2) as any, 'x')
  replaceLine(2, 'changed')
  replaceLines(1, 2, 'all')
  deleteLine(4)

  expect(editor.executeEdits).toHaveBeenCalledTimes(5)
  expect(editor.pushUndoStop).toHaveBeenCalledTimes(5)
  expect(editor.focus).toHaveBeenCalledTimes(5)
  expect(getLineContent(3)).toBe('line 3')
  expect(getLinesContent(1, 2)).toBe('range:1-2')
  expect(getValue()).toBe('foo foo')
})

test('highlights lines, detects indentation, and reads tokenized line languages', async () => {
  const decorations = { clear: vi.fn() }
  const editor = makeEditor()
  editor.createDecorationsCollection.mockReturnValue(decorations)
  const model = makeModel()
  model.getOptions.mockReturnValueOnce({ insertSpaces: false, tabSize: 8 })
  editor.getModel.mockReturnValue(model)
  fireHook('MONACO_READY', {
    monaco: makeMonaco(),
    editor,
  })

  const dispose = highlightLine([2, 4], true, 0) as () => void
  expect(editor.revealLineNearTop).toHaveBeenCalledWith(2)
  dispose()
  expect(decorations.clear).toHaveBeenCalled()
  expect(getOneIndent()).toBe('\t')

  const tokenModel = {
    tokenization: {
      grammarTokens: {
        getLineTokens: vi.fn(() => ({ getLanguageId: () => 'markdown' })),
      },
    },
  }
  expect(getLineLanguageId(3, tokenModel as any)).toBe('markdown')
  expect(() => getLineLanguageId(3, {} as any)).toThrow('Require model to be tokenized')

  await highlightLine(5, false, 10)
  expect(decorations.clear).toHaveBeenCalledTimes(2)
})

test('sets and replaces editor value while preserving view state', () => {
  const editor = makeEditor()
  fireHook('MONACO_READY', {
    monaco: makeMonaco(),
    editor,
  })

  setValue('updated')
  replaceValue('foo', 'bar', false)

  expect(editor.saveViewState).toHaveBeenCalled()
  expect(editor.restoreViewState).toHaveBeenCalledWith({ top: 1 })
  expect(editor.executeEdits).toHaveBeenCalledWith('', [expect.objectContaining({ text: 'updated' })])
  expect(editor.executeEdits).toHaveBeenLastCalledWith('', [expect.objectContaining({ text: 'bar foo' })])
})

test('reports selection info and keybinding labels', () => {
  const editor = makeEditor()
  fireHook('MONACO_READY', {
    monaco: makeMonaco(),
    editor,
  })

  expect(getSelectionInfo()).toStrictEqual({
    line: 2,
    column: 4,
    lineCount: 2,
    textLength: 7,
    selectedLength: 9,
    selectedLines: 2,
    selectionCount: 2,
  })
  expect(lookupKeybindingKeys('cmd')).toStrictEqual(['Ctrl', 'K'])

  editor.getSelection.mockReturnValueOnce(null)
  expect(getSelectionInfo()).toBeUndefined()
})

test('toggles wrapping, typewriter mode, and selected editor name', () => {
  const editor = makeEditor()
  fireHook('MONACO_READY', {
    monaco: makeMonaco(),
    editor,
  })

  toggleWrap()
  toggleTypewriterMode()
  switchEditor('custom')

  expect(mocks.state.wordWrap).toBe('on')
  expect(mocks.state.typewriterMode).toBe(true)
  expect(mocks.state.editor).toBe('custom')

  editor.getOption.mockReturnValueOnce({ isViewportWrapping: false, isDominatedByLongLines: true })
  toggleWrap()
  expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'Word warp dominated by long lines')
})

test('runs completion and markdown language tappers through ioc', () => {
  tapSimpleCompletionItems(items => items.push({ label: 'now', insertText: 'now' }))
  expect(getSimpleCompletionItems()).toStrictEqual([{ label: 'now', insertText: 'now' }])

  tapMarkdownMonarchLanguage((language: any) => {
    language.extra = true
  })

  expect(getMarkdownMonarchLanguage()).toMatchObject({ tokenizer: { root: [['#.*', 'keyword']] }, extra: true })
})

test('registers custom editors, handles duplicates, and filters availability errors', async () => {
  const supported = { name: 'supported', component: {}, when: vi.fn(async () => true) }
  const unsupported = { name: 'unsupported', component: {}, when: vi.fn(async () => false) }
  const throws = { name: 'throws', component: {}, when: vi.fn(async () => { throw new Error('bad') }) }

  expect(() => registerCustomEditor({ name: 'missing', when: vi.fn() } as any)).toThrow('Editor component is required')
  registerCustomEditor(supported as any)
  expect(() => registerCustomEditor(supported as any)).toThrow('already registered')
  registerCustomEditor(supported as any, true)
  registerCustomEditor(unsupported as any)
  registerCustomEditor(throws as any)

  await expect(getAvailableCustomEditors({ doc: { type: 'file' } } as any)).resolves.toStrictEqual([supported])
  expect(mocks.triggerHook).toHaveBeenCalledWith('EDITOR_CUSTOM_EDITOR_CHANGE', { type: 'register' })

  removeCustomEditor('supported')
  expect(mocks.state.editor).toBe('default')
  expect(mocks.triggerHook).toHaveBeenCalledWith('EDITOR_CUSTOM_EDITOR_CHANGE', { type: 'remove' })
})

test('checks dirty state for default and custom editors', async () => {
  ;(window as any).documentSaved = false
  fireHook('EDITOR_CURRENT_EDITOR_CHANGE', { current: { name: 'default' } })
  expect(isDefault()).toBe(true)
  await expect(isDirty()).resolves.toBe(true)

  fireHook('EDITOR_CURRENT_EDITOR_CHANGE', { current: { name: 'custom', component: {}, getIsDirty: vi.fn(async () => false) } })
  expect(isDefault()).toBe(false)
  await expect(isDirty()).resolves.toBe(false)

  fireHook('EDITOR_CURRENT_EDITOR_CHANGE', { current: { name: 'bad', component: {}, getIsDirty: vi.fn(async () => { throw new Error('bad') }) } })
  await expect(isDirty()).resolves.toBe(true)
  expect(mocks.consoleError).toHaveBeenCalled()
})

test('runs editor lifecycle hooks for Monaco configuration and readonly attempts', async () => {
  const languages = [
    { id: 'javascript', aliases: [] as string[] },
    { id: 'shell', aliases: [] as string[] },
    { id: 'html', aliases: [] as string[] },
    { id: 'css', aliases: [] as string[] },
  ]
  const monaco = {
    ...makeMonaco(),
    languages: {
      register: vi.fn(),
      setLanguageConfiguration: vi.fn(),
      setMonarchTokensProvider: vi.fn(),
      getLanguages: vi.fn(() => languages),
    },
    editor: {
      ...makeMonaco().editor,
      defineTheme: vi.fn(),
      setTheme: vi.fn(),
    },
  }
  const editor = makeEditor()

  fireHook('MONACO_BEFORE_INIT', { monaco })
  expect(monaco.languages.register).toHaveBeenCalledWith({ id: 'vs.editor.nullLanguage' })
  expect(monaco.editor.defineTheme).toHaveBeenCalledWith('vs', expect.any(Object))
  expect(monaco.editor.defineTheme).toHaveBeenCalledWith('vs-dark', expect.any(Object))
  expect(languages[0].aliases).toContain('node')
  expect(languages[1].aliases).toContain('bash')
  expect(languages[2].aliases).toContain('vue')

  fireHook('MONACO_READY', { monaco, editor })
  await Promise.resolve()

  fireHook('THEME_CHANGE', {})
  expect(monaco.editor.setTheme).toHaveBeenCalledWith('vs-dark')

  fireHook('SETTING_FETCHED', {})
  await Promise.resolve()
  expect(editor.updateOptions).toHaveBeenCalledWith(expect.objectContaining({ theme: 'vs-dark' }))

  fireHook('SETTING_CHANGED', { changedKeys: ['editor.mouse-wheel-zoom'] })
  await Promise.resolve()
  expect(editor.trigger).toHaveBeenCalledWith('keyboard', 'editor.action.fontZoomReset', {})
})
