const mocks = vi.hoisted(() => ({
  editor: {
    addAction: vi.fn(),
    getContribution: vi.fn(),
    getModel: vi.fn(() => ({ getEOL: () => '\n' })),
    getPosition: vi.fn(() => ({ lineNumber: 6, column: 1 })),
    focus: vi.fn(),
    onDidCompositionEnd: vi.fn(),
    onDidCompositionStart: vi.fn(),
    onMouseDown: vi.fn(),
    revealLineInCenter: vi.fn(),
  },
  getEditor: vi.fn(),
  getOneIndent: vi.fn(() => '  '),
  insert: vi.fn(),
  whenEditorReady: vi.fn(),
}))

vi.mock('dayjs', () => ({
  default: vi.fn(() => ({
    format: vi.fn((format: string) => format === 'YYYY-MM-DD' ? '2026-05-02' : '12:34:56'),
  })),
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/services/editor', () => ({
  getEditor: mocks.getEditor,
  getOneIndent: mocks.getOneIndent,
  insert: mocks.insert,
  whenEditorReady: mocks.whenEditorReady,
}))

vi.mock('@fe/services/i18n', () => ({
  t: vi.fn((key: string) => key),
}))

import editorMarkdown from '../editor-markdown'

function createMonaco () {
  return {
    KeyCode: {
      Enter: 13,
      KeyD: 68,
      KeyF: 70,
      KeyK: 75,
      KeyL: 76,
      KeyT: 84,
      KeyU: 85,
    },
    KeyMod: {
      Alt: 1000,
      CtrlCmd: 2000,
      Shift: 4000,
      chord: vi.fn((a: number, b: number) => a + b),
    },
    editor: {
      addKeybindingRules: vi.fn(),
    },
  }
}

function createCtx () {
  const hooks = new Map<string, Function>()
  const actions = new Map<string, any>()
  return {
    action: {
      registerAction: vi.fn((action: any) => actions.set(action.name, action)),
    },
    base: {
      showItemInFolder: vi.fn(),
    },
    doc: {
      isSameFile: vi.fn(() => true),
    },
    editor: {
      lookupKeybindingKeys: vi.fn((id: string) => [id, 'key']),
    },
    i18n: {
      t: vi.fn((key: string, ...args: string[]) => [key, ...args].join('|')),
    },
    keybinding: {
      Alt: 'Alt',
      Shift: 'Shift',
      getKeysLabel: vi.fn((keys: string[]) => keys.join('+')),
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    statusBar: {
      tapMenus: vi.fn(),
    },
    store: {
      state: {
        currentFile: { repo: 'repo-a', path: '/doc.md', absolutePath: '/repo/doc.md' },
        inComposition: false,
      },
    },
    view: {
      disableSyncScrollAwhile: vi.fn((fn: Function) => fn()),
      getRenderEnv: vi.fn(() => ({ file: { repo: 'repo-a', path: '/doc.md' } })),
      highlightLine: vi.fn(),
      refresh: vi.fn(),
    },
    _actions: actions,
    _hooks: hooks,
  } as any
}

describe('editor-markdown plugin', () => {
  beforeEach(() => {
    mocks.editor.addAction.mockClear()
    mocks.editor.getContribution.mockReset()
    mocks.editor.getModel.mockClear()
    mocks.editor.getPosition.mockReturnValue({ lineNumber: 6, column: 1 })
    mocks.editor.focus.mockClear()
    mocks.editor.onDidCompositionEnd.mockClear()
    mocks.editor.onDidCompositionStart.mockClear()
    mocks.editor.onMouseDown.mockClear()
    mocks.editor.revealLineInCenter.mockClear()
    mocks.getEditor.mockReturnValue(mocks.editor)
    mocks.getOneIndent.mockReturnValue('  ')
    mocks.insert.mockReset()
    mocks.whenEditorReady.mockReset()
    mocks.whenEditorReady.mockResolvedValue({ editor: mocks.editor, monaco: createMonaco() })
  })

  test('registers editor actions, keybindings, status-bar insert menu, and focus action', async () => {
    const ctx = createCtx()

    editorMarkdown.register(ctx)
    await mocks.whenEditorReady.mock.results[0].value

    expect(mocks.editor.addAction.mock.calls.map(([action]: any[]) => action.id)).toEqual([
      'plugin.editor.insert-date',
      'plugin.editor.insert-time',
      'plugin.editor.reveal-line-in-preview',
      'plugin.editor.force-insert-new-line',
      'plugin.editor.force-insert-indent',
      'plugin.editor.reveal-current-file-in-os',
      'plugin.editor.refresh-current-document',
    ])
    expect(ctx.action.registerAction).toHaveBeenCalledWith(expect.objectContaining({
      name: 'plugin.editor.focus-editor',
      forMcp: true,
    }))

    const menus = { 'status-bar-insert': { list: [] as any[] } }
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)
    expect(menus['status-bar-insert'].list.map(item => item.id)).toEqual([
      'plugin.editor.insert-time',
      'plugin.editor.insert-date',
    ])

    ctx._actions.get('plugin.editor.focus-editor').handler()
    expect(ctx.view.disableSyncScrollAwhile).toHaveBeenCalledWith(expect.any(Function))
    expect(mocks.editor.revealLineInCenter).toHaveBeenCalledWith(6)
    expect(mocks.editor.focus).toHaveBeenCalled()
  })

  test('runs editor action handlers for dates, forced insertion, preview reveal, file reveal, and refresh', async () => {
    const ctx = createCtx()

    editorMarkdown.register(ctx)
    await mocks.whenEditorReady.mock.results[0].value
    const actions = new Map(mocks.editor.addAction.mock.calls.map(([action]: any[]) => [action.id, action]))

    actions.get('plugin.editor.insert-date')!.run()
    actions.get('plugin.editor.insert-time')!.run()
    actions.get('plugin.editor.force-insert-new-line')!.run()
    actions.get('plugin.editor.force-insert-indent')!.run()
    actions.get('plugin.editor.reveal-line-in-preview')!.run()
    actions.get('plugin.editor.reveal-current-file-in-os')!.run()
    actions.get('plugin.editor.refresh-current-document')!.run()

    expect(mocks.insert.mock.calls.map(([text]: any[]) => text)).toEqual(['2026-05-02', '12:34:56', '\n', '  '])
    expect(ctx.view.highlightLine).toHaveBeenCalledWith(6, true, 1000)
    expect(ctx.base.showItemInFolder).toHaveBeenCalledWith('/repo/doc.md')
    expect(ctx.view.refresh).toHaveBeenCalled()
  })

  test('toggles composition state and reveals preview on editor double click', async () => {
    const ctx = createCtx()
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValueOnce(1000).mockReturnValueOnce(1200)

    editorMarkdown.register(ctx)
    await mocks.whenEditorReady.mock.results[0].value

    mocks.editor.onDidCompositionStart.mock.calls[0][0]()
    expect(ctx.store.state.inComposition).toBe(true)
    mocks.editor.onDidCompositionEnd.mock.calls[0][0]()
    expect(ctx.store.state.inComposition).toBe(false)

    mocks.editor.onMouseDown.mock.calls[0][0]()
    mocks.editor.onMouseDown.mock.calls[0][0]()
    expect(ctx.view.highlightLine).toHaveBeenCalledWith(6, true, 1000)
  })

  test('shows readonly messages for all readonly attempt variants', async () => {
    const ctx = createCtx()
    const showMessage = vi.fn()
    mocks.editor.getContribution.mockReturnValue({ showMessage })

    editorMarkdown.register(ctx)

    for (const readonlyType of ['app-readonly', 'no-file', 'file-not-writable', 'custom-type']) {
      await ctx._hooks.get('EDITOR_ATTEMPT_READONLY_EDIT')({ readonlyType })
    }

    expect(showMessage.mock.calls.map(([message]: any[]) => message)).toEqual([
      'read-only-mode-desc',
      'file-status.no-file',
      expect.objectContaining({ isTrusted: true, value: expect.stringContaining('file-readonly-desc') }),
      'can-not-edit-this-file-type',
    ])
  })

  test('does not reveal preview or focus editor without a valid cursor line', async () => {
    const ctx = createCtx()
    mocks.editor.getPosition.mockReturnValue(null)

    editorMarkdown.register(ctx)
    await mocks.whenEditorReady.mock.results[0].value
    const actions = new Map(mocks.editor.addAction.mock.calls.map(([action]: any[]) => [action.id, action]))

    actions.get('plugin.editor.reveal-line-in-preview')!.run()
    ctx._actions.get('plugin.editor.focus-editor').handler()

    expect(ctx.view.highlightLine).not.toHaveBeenCalled()
    expect(ctx.view.disableSyncScrollAwhile).not.toHaveBeenCalled()
  })
})
