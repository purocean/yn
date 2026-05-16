import editorMdSyntax from '../editor-md-syntax'

class Range {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number

  constructor (startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number) {
    this.startLineNumber = startLineNumber
    this.startColumn = startColumn
    this.endLineNumber = endLineNumber
    this.endColumn = endColumn
  }

  collapseToStart () {
    return new Range(this.startLineNumber, this.startColumn, this.startLineNumber, this.startColumn)
  }

  isEmpty () {
    return this.startLineNumber === this.endLineNumber && this.startColumn === this.endColumn
  }

  static spansMultipleLines (range: Range) {
    return range.startLineNumber !== range.endLineNumber
  }
}

function createMonaco () {
  return {
    Range,
    SelectionDirection: { LTR: 1 },
    languages: {
      CompletionItemKind: { Keyword: 17 },
      CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      IndentAction: { None: 0 },
      registerCodeActionProvider: vi.fn(),
      registerCompletionItemProvider: vi.fn(),
      setLanguageConfiguration: vi.fn(),
    },
  }
}

function createCtx (selection: any = new Range(1, 1, 1, 1)) {
  const monaco = createMonaco()
  const simpleItems = [
    { language: 'markdown', label: 'Block', insertText: '# $1', block: true },
    { language: 'markdown', label: 'Inline', insertText: '**$1**', surroundSelection: '$1', detail: 'bold' },
    { language: 'latex', label: 'Latex', insertText: '\\alpha' },
  ]

  return {
    editor: {
      getEditor: vi.fn(() => ({ getSelection: vi.fn(() => selection) })),
      getLineLanguageId: vi.fn(() => 'markdown'),
      getSimpleCompletionItems: vi.fn(() => simpleItems),
      tapMarkdownMonarchLanguage: vi.fn((fn: any) => fn({ tokenizer: { root: [] } })),
      tapSimpleCompletionItems: vi.fn((fn: any) => fn(simpleItems)),
      whenEditorReady: vi.fn(() => Promise.resolve({ monaco })),
    },
    i18n: { t: vi.fn((key: string) => key) },
    setting: { getSetting: vi.fn(() => 'on') },
  } as any
}

function createModel (line: string) {
  return {
    getLineContent: vi.fn(() => line),
    getLineMaxColumn: vi.fn(() => line.length + 1),
  } as any
}

async function setup (ctx = createCtx()) {
  editorMdSyntax.register(ctx)
  const { monaco } = await ctx.editor.whenEditorReady.mock.results[0].value
  return {
    ctx,
    monaco,
    provider: monaco.languages.registerCompletionItemProvider.mock.calls[0][1],
    codeActionProvider: monaco.languages.registerCodeActionProvider.mock.calls[0][1],
  }
}

describe('editor-md-syntax plugin', () => {
  test('registers completion, language configuration, code actions, snippets, and monarch rules', async () => {
    const { ctx, monaco } = await setup()

    expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith('markdown', expect.any(Object))
    expect(monaco.languages.setLanguageConfiguration).toHaveBeenCalledWith('markdown', expect.objectContaining({
      surroundingPairs: expect.arrayContaining([{ open: '$', close: '$' }]),
      autoClosingPairs: expect.arrayContaining([{ open: '{', close: '}' }]),
      onEnterRules: expect.any(Array),
    }))
    expect(monaco.languages.registerCodeActionProvider).toHaveBeenCalledWith('*', expect.any(Object))
    expect(ctx.editor.tapSimpleCompletionItems).toHaveBeenCalled()
    expect(ctx.editor.tapMarkdownMonarchLanguage).toHaveBeenCalled()
  })

  test('filters block snippets by line position and expands range for duplicate suffix text', async () => {
    const { provider } = await setup()
    const result = await provider.provideCompletionItems(createModel('hello **'), { lineNumber: 1, column: 8 })
    const inline = result.suggestions.find((item: any) => item.label.label === 'Inline')

    expect(result.suggestions.map((item: any) => item.label.label)).not.toContain('Block')
    expect(inline).toMatchObject({
      insertText: '**$1**',
      insertTextRules: 4,
      range: { startLineNumber: 1, startColumn: 7, endLineNumber: 1, endColumn: 9 },
      detail: 'bold',
    })
  })

  test('returns selection snippets and collapses multi-line selection ranges', async () => {
    const selection = new Range(2, 1, 3, 4)
    ;(selection as any).isEmpty = () => false
    const { provider } = await setup(createCtx(selection))

    const result = await provider.provideCompletionItems(createModel('text'), { lineNumber: 3, column: 4 })
    const inline = result.suggestions.find((item: any) => item.label.label === 'Inline')

    expect(inline.insertText).toBe('**$TM_SELECTED_TEXT**')
    expect(inline.range).toMatchObject({ startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 })
  })

  test('code action provider only offers trigger suggest for reverse non-empty selections when enabled', async () => {
    const { codeActionProvider, ctx } = await setup()
    const range = {
      isEmpty: () => false,
      getDirection: () => 2,
    }

    expect(codeActionProvider.provideCodeActions(null, range).actions).toEqual([
      expect.objectContaining({
        title: 'trigger-suggestions',
        command: { id: 'editor.action.triggerSuggest', title: 'trigger-suggestions' },
        isPreferred: true,
      }),
    ])

    ctx.setting.getSetting.mockReturnValueOnce(false)
    expect(codeActionProvider.provideCodeActions(null, range).actions).toEqual([])
    expect(codeActionProvider.provideCodeActions(null, { isEmpty: () => true }).actions).toEqual([])
  })
})
