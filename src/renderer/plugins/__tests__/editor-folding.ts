const mocks = vi.hoisted(() => ({
  indentRanges: [
    { start: 3, end: 4 },
    { start: 11, end: 12 },
  ],
  sleep: vi.fn(() => Promise.resolve()),
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: {
    SOURCE_LINE_START: 'data-source-line-start',
    SOURCE_LINE_END: 'data-source-line-end',
  },
}))

vi.mock('@fe/others/monaco-indent-range-provider.js', () => ({
  IndentRangeProvider: class {
    compute = vi.fn(async () => ({
      length: mocks.indentRanges.length,
      getStartLineNumber: (idx: number) => mocks.indentRanges[idx].start,
      getEndLineNumber: (idx: number) => mocks.indentRanges[idx].end,
    }))
  },
}))

import editorFolding, { MdFoldingProvider } from '../editor-folding'

function createModel (options: {
  uri?: string,
  length?: number,
  lineCount?: number,
  blankLines?: number[],
} = {}) {
  const blankLines = new Set(options.blankLines || [])
  return {
    uri: { toString: vi.fn(() => options.uri || 'yn://repo/current.md') },
    getValueLength: vi.fn(() => options.length || 100),
    getLineContent: vi.fn((line: number) => blankLines.has(line) ? '   ' : `line ${line}`),
    getLineCount: vi.fn(() => options.lineCount || 60),
  } as any
}

function createProvider (tokens: any[] = [], uri = 'yn://repo/current.md') {
  const ctx = {
    doc: {
      toUri: vi.fn(() => uri),
    },
    utils: {
      sleep: mocks.sleep,
    },
    view: {
      getRenderEnv: vi.fn(() => ({ file: { repo: 'repo', path: '/current.md' }, tokens })),
    },
  } as any

  return {
    ctx,
    provider: new MdFoldingProvider({ languages: {} } as any, ctx),
  }
}

describe('editor-folding plugin', () => {
  beforeEach(() => {
    mocks.indentRanges = [
      { start: 3, end: 4 },
      { start: 11, end: 12 },
    ]
    mocks.sleep.mockClear()
  })

  test('registers a markdown folding range provider when editor is ready', async () => {
    const registerFoldingRangeProvider = vi.fn()
    const ctx = {
      editor: {
        whenEditorReady: vi.fn(() => Promise.resolve({
          monaco: {
            languages: { registerFoldingRangeProvider },
          },
        })),
      },
    } as any

    editorFolding.register(ctx)
    await Promise.resolve()

    expect(registerFoldingRangeProvider).toHaveBeenCalledWith('markdown', expect.any(MdFoldingProvider))
  })

  test('retries once for a stale model uri and returns no ranges if it still mismatches', async () => {
    const { provider } = createProvider([], 'yn://repo/current.md')

    await expect(provider.provideFoldingRanges(
      createModel({ uri: 'yn://repo/other.md' }),
      {} as any,
      {} as any,
    )).resolves.toEqual([])

    expect(mocks.sleep).toHaveBeenCalledWith(1000)
  })

  test('skips very large markdown documents', async () => {
    const { provider } = createProvider()

    await expect(provider.provideFoldingRanges(
      createModel({ length: 50001 }),
      {} as any,
      {} as any,
    )).resolves.toEqual([])
  })

  test('combines heading, block, comment, container, uml, and indent ranges', async () => {
    const tokens = [
      { type: 'heading_open', tag: 'h1', map: [0, 0], meta: {} },
      { type: 'heading_open', tag: 'h2', map: [2, 2], meta: {} },
      { type: 'heading_open', tag: 'h1', map: [5, 5], meta: {} },
      { type: 'heading_open', tag: 'h3', meta: {} },
      { type: 'fence', map: [7, 10], meta: {} },
      { type: 'paragraph_open', map: [99, 100], meta: { attrs: { 'data-source-line-start': '20', 'data-source-line-end': '22' } } },
      { type: 'html_block', content: '<!-- comment -->', map: [23, 26], meta: {} },
      { type: 'container_warning', map: [30, 31], meta: {} },
      { type: 'uml_diagram', map: [40, 41], meta: {} },
      { type: 'html_block', content: '<div></div>', map: [50, 51], meta: {} },
      { type: 'text', map: [55, 58], meta: {} },
    ]
    const { provider } = createProvider(tokens)

    const ranges = await provider.provideFoldingRanges(
      createModel({ blankLines: [10], lineCount: 60 }),
      {} as any,
      {} as any,
    )

    expect(ranges).toEqual(expect.arrayContaining([
      { start: 1, end: 5 },
      { start: 3, end: 5 },
      { start: 6, end: 60 },
      { start: 8, end: 9, kind: undefined },
      { start: 20, end: 21, kind: undefined },
      { start: 24, end: 26, kind: { value: 'comment' } },
      { start: 31, end: 32, kind: undefined },
      { start: 41, end: 42, kind: undefined },
      { start: 3, end: 4 },
      { start: 11, end: 12 },
    ]))
    expect(ranges).toHaveLength(10)
  })

  test('limits returned folding ranges to the provider cap', async () => {
    mocks.indentRanges = Array.from({ length: 5005 }, (_, idx) => ({ start: idx + 1, end: idx + 2 }))
    const { provider } = createProvider([])

    const ranges = await provider.provideFoldingRanges(createModel(), {} as any, {} as any)

    expect(ranges).toHaveLength(5000)
  })
})
