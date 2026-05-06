vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

import editorPathCompletion from '../editor-path-completion'

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

function createModel (line: string, source = line) {
  return {
    getLineContent: vi.fn(() => line),
    getValue: vi.fn(() => source),
  }
}

function createCtx (renderEnv: any = {}) {
  let provider: any
  const markdownit = class {
    parse (content: string) {
      return content.split('\n').flatMap(line => {
        const match = line.match(/^(#{1,6})\s+(.+)$/)
        return match
          ? [
              { type: 'heading_open', tag: `h${match[1].length}` },
              { type: 'inline', content: match[2] },
            ]
          : []
      })
    }
  }

  const ctx = {
    api: {
      fetchTree: vi.fn(async () => [
        {
          type: 'dir',
          name: 'remote',
          path: '/notes',
          children: [{ type: 'file', name: 'Remote.md', path: '/notes/Remote.md' }],
        },
      ]),
      readFile: vi.fn(async () => ({ content: '# Remote Heading\n## Deep Heading' })),
    },
    editor: {
      whenEditorReady: vi.fn(() => Promise.resolve({
        monaco: {
          Range,
          languages: {
            CompletionItemKind: {
              File: 1,
              Folder: 2,
              Reference: 3,
            },
            registerCompletionItemProvider: vi.fn((_language: string, itemProvider: any) => {
              provider = itemProvider
            }),
          },
        },
      })),
    },
    lib: { markdownit },
    store: {
      state: {
        currentFile: { repo: 'repo-a', path: '/notes/current.md' },
        currentRepo: { name: 'repo-a' },
        tree: [
          {
            type: 'dir',
            name: 'notes',
            path: '/notes',
            children: [
              { type: 'dir', name: 'assets', path: '/notes/assets', children: [{ type: 'file', name: 'photo one.png', path: '/notes/assets/photo one.png' }] },
              { type: 'file', name: 'Topic.md', path: '/notes/Topic.md' },
              { type: 'file', name: 'brack[et].md', path: '/notes/brack[et].md' },
            ],
          },
        ],
      },
    },
    utils: {
      encodeMarkdownLink: vi.fn((value: string) => value.replaceAll(' ', '%20')),
      path: {
        dirname: vi.fn((path: string) => path.replace(/\/[^/]*$/, '') || '/'),
        extname: vi.fn((path: string) => {
          const name = path.split('/').pop() || ''
          const index = name.lastIndexOf('.')
          return index >= 0 ? name.slice(index) : ''
        }),
        resolve: vi.fn((base: string, target: string) => {
          if (target.startsWith('/')) return target
          const parts = `${base}/${target}`.split('/')
          const out: string[] = []
          for (const part of parts) {
            if (!part || part === '.') continue
            if (part === '..') out.pop()
            else out.push(part)
          }
          return '/' + out.join('/')
        }),
      },
    },
    view: {
      getRenderEnv: vi.fn(() => renderEnv),
    },
  } as any

  return {
    ctx,
    getProvider: () => provider,
  }
}

async function registerProvider (ctx: any) {
  editorPathCompletion.register(ctx)
  await Promise.resolve()
}

describe('editor-path-completion plugin', () => {
  test('registers a markdown completion provider', async () => {
    const { ctx, getProvider } = createCtx()

    await registerProvider(ctx)

    expect(ctx.editor.whenEditorReady).toHaveBeenCalled()
    expect(getProvider().triggerCharacters).toEqual(['/', ':', '#', '['])
  })

  test('suggests current document headings for empty link and anchor contexts', async () => {
    const tokens = [
      { type: 'heading_open', tag: 'h1' },
      { type: 'inline', content: 'Intro Heading' },
      { type: 'heading_open', tag: 'h2' },
      { type: 'inline', content: 'Second Part' },
    ]
    const { ctx, getProvider } = createCtx({ tokens })
    await registerProvider(ctx)

    const result = await getProvider().provideCompletionItems(createModel('[Go]('), new Position(1, 6))
    const anchor = await getProvider().provideCompletionItems(createModel('[Go](#Se)'), new Position(1, 9))

    expect(result.suggestions.map((item: any) => item.insertText)).toEqual(['#Intro-Heading', '#Second-Part', 'assets/', 'Topic.md', 'brack[et].md'])
    expect(anchor.suggestions.map((item: any) => item.label)).toEqual(['# H1 Intro Heading', '# H2 Second Part'])
    expect(anchor.suggestions[0].range.replace.endColumn).toBe(9)
  })

  test('suggests files from the current repo tree and keeps suggesting after folders', async () => {
    const { ctx, getProvider } = createCtx()
    await registerProvider(ctx)

    const root = await getProvider().provideCompletionItems(createModel('[Go]('), new Position(1, 6))
    const nested = await getProvider().provideCompletionItems(createModel('[Go](assets/'), new Position(1, 13))

    expect(root.suggestions.map((item: any) => item.label)).toEqual(['assets/', 'Topic.md', 'brack[et].md'])
    expect(root.suggestions[0].command).toEqual({ id: 'editor.action.triggerSuggest', title: '' })
    expect(nested.suggestions).toMatchObject([{ label: 'photo one.png', insertText: 'photo%20one.png' }])
  })

  test('normalizes wiki link labels and reads non-current repo trees', async () => {
    const { ctx, getProvider } = createCtx()
    ctx.store.state.currentFile.repo = 'repo-b'
    await registerProvider(ctx)

    const result = await getProvider().provideCompletionItems(createModel('[[brack'), new Position(1, 8))

    expect(ctx.api.fetchTree).toHaveBeenCalledWith('repo-b', { by: 'name', order: 'asc' }, undefined, true)
    expect(result.suggestions).toEqual([{ label: 'Remote', insertText: 'Remote', kind: 1, range: expect.any(Object), command: undefined, sortText: '      1' }])
  })

  test('reads headings from another markdown document for cross-document anchors', async () => {
    const { ctx, getProvider } = createCtx()
    await registerProvider(ctx)

    const result = await getProvider().provideCompletionItems(createModel('[Go](other#Re)'), new Position(1, 13))
    const ignored = await getProvider().provideCompletionItems(createModel('[Go](image.png#Re)'), new Position(1, 17))

    expect(ctx.api.readFile).toHaveBeenCalledWith({ repo: 'repo-a', path: '/notes/other.md' })
    expect(result.suggestions.map((item: any) => item.insertText)).toEqual(['#Remote-Heading', '#Deep-Heading'])
    expect(ignored.suggestions).toEqual([])
  })

  test('suggests reference definitions and skips URL-like link prefixes', async () => {
    const { ctx, getProvider } = createCtx()
    await registerProvider(ctx)

    const refs = await getProvider().provideCompletionItems(
      createModel('[ref', '[alpha]: <https://example.com>\n[beta]: local.md'),
      new Position(1, 5)
    )
    const url = await getProvider().provideCompletionItems(createModel('[Go](https:'), new Position(1, 12))
    const none = await getProvider().provideCompletionItems(createModel('plain text'), new Position(1, 6))

    expect(refs.suggestions.map((item: any) => item.label)).toEqual(['alpha', 'beta'])
    expect(url.suggestions).toEqual([])
    expect(none.suggestions).toEqual([])
  })
})
