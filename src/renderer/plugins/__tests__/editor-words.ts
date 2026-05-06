import editorWords from '../editor-words'

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
}

function createMonaco () {
  return {
    Range,
    languages: {
      CompletionItemKind: { Text: 1 },
      registerCompletionItemProvider: vi.fn(),
    },
  }
}

function createCtx (selection: any = { isEmpty: () => true }) {
  return {
    editor: {
      getEditor: vi.fn(() => ({ getSelection: vi.fn(() => selection) })),
      whenEditorReady: vi.fn(() => Promise.resolve({ monaco: createMonaco() })),
    },
  } as any
}

function createModel (value: string, word = '') {
  return {
    getValue: vi.fn(() => value),
    getWordUntilPosition: vi.fn(() => ({ word, startColumn: 3, endColumn: 7 })),
  } as any
}

async function getProvider (ctx = createCtx()) {
  editorWords.register(ctx)
  await ctx.editor.whenEditorReady.mock.results[0].value
  return ctx.editor.whenEditorReady.mock.results[0].value.then(({ monaco }: any) => {
    expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith('markdown', expect.any(Object))
    return monaco.languages.registerCompletionItemProvider.mock.calls[0][1]
  })
}

describe('editor-words plugin', () => {
  test('registers a markdown completion provider when editor is ready', async () => {
    const ctx = createCtx()
    const provider = await getProvider(ctx)

    expect(editorWords.name).toBe('editor-words')
    expect(provider).toEqual(expect.objectContaining({
      provideCompletionItems: expect.any(Function),
    }))
  })

  test('suggests unique document words and skips the current word', async () => {
    const provider = await getProvider()
    const model = createModel('alpha beta beta _camelCase id tooLongIdentifierName alpha', 'beta')

    const result = await provider.provideCompletionItems(model, { lineNumber: 2, column: 7 })

    expect(result.suggestions.map((item: any) => item.insertText)).toEqual(['alpha', '_camelCase'])
    expect(result.suggestions[0]).toMatchObject({
      label: { label: 'alpha' },
      kind: 1,
      range: { startLineNumber: 2, startColumn: 3, endLineNumber: 2, endColumn: 7 },
      sortText: '  alpha',
    })
  })

  test('does not suggest words while text is selected or when content is too large', async () => {
    const selectedProvider = await getProvider(createCtx({ isEmpty: () => false }))

    await expect(selectedProvider.provideCompletionItems(createModel('alpha beta'), { lineNumber: 1, column: 1 })).resolves.toBeUndefined()

    const provider = await getProvider()
    const result = await provider.provideCompletionItems(createModel('word '.repeat(30000)), { lineNumber: 1, column: 1 })

    expect(result).toEqual({ suggestions: [] })
  })
})
