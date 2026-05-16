import emojiPlugin from '../emoji'
import MarkdownItEmoji from 'markdown-it-emoji/dist/full.cjs.js'

vi.mock('markdown-it-emoji/dist/full.cjs.js', () => ({
  default: vi.fn(),
}))

vi.mock('markdown-it-emoji/lib/data/full.mjs', () => ({
  default: {
    smile: '😄',
    rocket: '🚀',
  },
}))

class Position {
  lineNumber: number
  column: number

  constructor (lineNumber: number, column: number) {
    this.lineNumber = lineNumber
    this.column = column
  }

  delta (lineDelta: number, columnDelta: number) {
    return new Position(this.lineNumber + lineDelta, this.column + columnDelta)
  }
}

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

function createCtx () {
  let provider: any
  const hooks = new Map<string, Function>()
  const schema = { properties: {} as Record<string, any> }
  const md = {
    renderer: { rules: {} as Record<string, Function> },
    use: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  }
  const monaco = {
    Range,
    languages: {
      CompletionItemKind: { EnumMember: 7 },
      registerCompletionItemProvider: vi.fn((_language: string, itemProvider: any) => {
        provider = itemProvider
      }),
    },
  }
  const ctx = {
    editor: {
      getLineLanguageId: vi.fn(() => 'markdown'),
      whenEditorReady: vi.fn(async () => ({ monaco })),
    },
    lib: {
      vue: {
        Text: Symbol('Text'),
        createVNode: vi.fn((type: any, props: any, children: any) => ({ type, props, children })),
      },
    },
    markdown: {
      registerPlugin: vi.fn((fn: Function) => fn(md)),
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    setting: {
      changeSchema: vi.fn((fn: Function) => fn(schema)),
      getSetting: vi.fn(() => true),
    },
    _hooks: hooks,
    _md: md,
    _schema: schema,
    getProvider: () => provider,
  } as any

  return ctx
}

function createModel (line: string) {
  return {
    getLineContent: vi.fn(() => line),
  }
}

describe('emoji plugin', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  test('registers markdown emoji rendering and settings', () => {
    const ctx = createCtx()

    emojiPlugin.register(ctx)

    expect(ctx._md.use).toHaveBeenCalledWith(MarkdownItEmoji)
    expect(ctx._schema.properties).toMatchObject({
      'render.md-emoji': {
        defaultValue: true,
        group: 'render',
        format: 'checkbox',
      },
      'editor.complete-emoji': {
        defaultValue: true,
        group: 'editor',
        format: 'checkbox',
      },
    })

    const vnode = ctx._md.renderer.rules.emoji([{ content: '😄' }], 0)
    expect(ctx.lib.vue.createVNode).toHaveBeenCalledWith(ctx.lib.vue.Text, null, '😄')
    expect(vnode.children).toBe('😄')
  })

  test('toggles markdown emoji rule before rendering', () => {
    const ctx = createCtx()

    emojiPlugin.register(ctx)
    ctx.setting.getSetting.mockReturnValueOnce(true)
    ctx._hooks.get('MARKDOWN_BEFORE_RENDER')({ md: ctx._md })
    expect(ctx._md.enable).toHaveBeenCalledWith('emoji', true)

    ctx.setting.getSetting.mockReturnValueOnce(false)
    ctx._hooks.get('MARKDOWN_BEFORE_RENDER')({ md: ctx._md })
    expect(ctx._md.disable).toHaveBeenCalledWith('emoji', true)
  })

  test('provides markdown emoji completions only in valid colon contexts', async () => {
    const ctx = createCtx()
    emojiPlugin.register(ctx)
    await Promise.resolve()

    const provider = ctx.getProvider()
    expect(ctx.editor.whenEditorReady).toHaveBeenCalled()
    expect(provider.triggerCharacters).toEqual([':'])

    const result = provider.provideCompletionItems(createModel('hello :ro'), new Position(1, 10))
    expect(result.suggestions).toEqual([
      expect.objectContaining({
        label: { label: ':smile:😄' },
        insertText: '😄',
        range: expect.any(Range),
      }),
      expect.objectContaining({
        label: { label: ':rocket:🚀' },
        insertText: '🚀',
      }),
    ])
    expect(result.suggestions[0].range.startColumn).toBe(7)
    expect(result.suggestions[0].sortText).toBe('      0')

    ctx.setting.getSetting.mockReturnValueOnce(false)
    expect(provider.provideCompletionItems(createModel(':ro'), new Position(1, 4)).suggestions).toEqual([])

    ctx.setting.getSetting.mockReturnValue(true)
    ctx.editor.getLineLanguageId.mockReturnValueOnce('plaintext')
    expect(provider.provideCompletionItems(createModel(':ro'), new Position(1, 4)).suggestions).toEqual([])

    expect(provider.provideCompletionItems(createModel('[[page :ro'), new Position(1, 11)).suggestions).toEqual([])
    expect(provider.provideCompletionItems(createModel('time ::ro'), new Position(1, 10)).suggestions).toEqual([])
    expect(provider.provideCompletionItems(createModel('plain text'), new Position(1, 6)).suggestions).toEqual([])
  })
})
