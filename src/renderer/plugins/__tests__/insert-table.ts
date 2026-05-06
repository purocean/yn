vi.mock('../insert-table/InsertTable.vue', () => ({
  default: { name: 'InsertTable' },
}))

vi.mock('@fe/services/editor', () => ({
  SimpleCompletionItem: class {},
}))

import insertTable from '../insert-table'

function createCtx () {
  const actions = new Map<string, Function>()
  const completionTaps: Function[] = []
  const statusMenus = { 'status-bar-insert': { list: [] as any[] } }
  const modal = {
    confirm: vi.fn(() => Promise.resolve(true)),
    ok: vi.fn(),
  }
  const toast = { show: vi.fn() }
  const editor = {
    addAction: vi.fn(),
    focus: vi.fn(),
    getPosition: vi.fn(() => ({ lineNumber: 3, column: 1 })),
  }
  const ctx = {
    action: {
      registerAction: vi.fn((action: any) => actions.set(action.name, action.handler)),
      getActionHandler: vi.fn((name: string) => actions.get(name)),
    },
    doc: {
      isMarkdownFile: vi.fn(() => true),
    },
    editor: {
      getEditor: vi.fn(() => editor),
      getLineContent: vi.fn(() => ''),
      getLinesContent: vi.fn(() => '| A | B |\n| -- | -- |'),
      insert: vi.fn(),
      tapSimpleCompletionItems: vi.fn((fn: Function) => completionTaps.push(fn)),
      whenEditorReady: vi.fn(() => Promise.resolve({ editor })),
    },
    i18n: { t: vi.fn((key: string) => key) },
    lib: {
      vue: {
        h: vi.fn((component: any, props: any) => ({ component, props })),
        ref: vi.fn((value: any) => ({ value })),
      },
    },
    statusBar: {
      tapMenus: vi.fn((fn: Function) => fn(statusMenus)),
    },
    store: {
      state: {
        currentFile: { repo: 'repo', path: '/a.md' },
      },
    },
    ui: {
      useModal: vi.fn(() => modal),
      useToast: vi.fn(() => toast),
    },
    _actions: actions,
    _completionTaps: completionTaps,
    _editor: editor,
    _modal: modal,
    _statusMenus: statusMenus,
    _toast: toast,
  } as any

  return ctx
}

describe('insert-table plugin', () => {
  test('registers editor action, completion tap, user action, and status menu', async () => {
    const ctx = createCtx()

    insertTable.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    expect(ctx._editor.addAction).toHaveBeenCalledWith(expect.objectContaining({
      id: 'plugin.insert-table',
      contextMenuGroupId: 'modification',
    }))
    expect(ctx.editor.tapSimpleCompletionItems).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx.action.registerAction).toHaveBeenCalledWith(expect.objectContaining({
      name: 'plugin.insert-table',
      forMcp: true,
      when: expect.any(Function),
    }))
    expect(ctx._statusMenus['status-bar-insert'].list[0]).toMatchObject({
      id: 'plugin.insert-table',
      hidden: false,
    })
  })

  test('adds table row completion when previous two lines are table shaped', async () => {
    const ctx = createCtx()
    insertTable.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    const items: any[] = []
    ctx._completionTaps[0](items)

    expect(items).toEqual([expect.objectContaining({
      label: '/ ||| Table Row',
      insertText: '| ${1:--} | ${2:--} |\n',
      block: true,
    })])
  })

  test('opens modal and inserts generated compact table when command completion is allowed', async () => {
    const ctx = createCtx()
    ctx.editor.getLinesContent.mockReturnValue('')
    ctx.editor.getLineContent.mockImplementation((line: number) => line === 2 ? 'previous text' : '')
    ctx._modal.confirm.mockImplementationOnce(({ component }: any) => {
      const rendered = component()
      rendered.props.onChange({ rows: 1, cols: 3, compact: true })
      rendered.props.onConfirm()
      return Promise.resolve(true)
    })
    insertTable.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    await ctx._actions.get('plugin.insert-table')()
    await Promise.resolve()

    expect(ctx._editor.focus).toHaveBeenCalled()
    expect(ctx._modal.ok).toHaveBeenCalled()
    expect(ctx.editor.insert).toHaveBeenCalledWith('\n| TH_1 | TH_2 | TH_3 |\n| -- | -- | -- |\n| TD_1_1 | TD_1_2 | TD_1_3 |\n{.small}\n')
  })

  test('returns no completions outside markdown and warns when inserting in a table row', async () => {
    const ctx = createCtx()
    ctx.doc.isMarkdownFile.mockReturnValue(false)
    insertTable.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    const items: any[] = []
    ctx._completionTaps[0](items)
    expect(items).toEqual([])

    ctx.doc.isMarkdownFile.mockReturnValue(true)
    ctx.editor.getLineContent.mockReturnValue('| current | row |')
    await ctx._actions.get('plugin.insert-table')()

    expect(ctx._toast.show).toHaveBeenCalledWith('warning', 'Cannot insert table here')
  })
})
