const mocks = vi.hoisted(() => {
  class CancellationTokenSource {
    token = { isCancellationRequested: false }

    cancel = vi.fn(() => {
      this.token.isCancellationRequested = true
    })
  }

  class TextSearchEngineAdapter {
    static instances: TextSearchEngineAdapter[] = []

    rgPath: string
    query: any
    resolveSearch: (success: boolean) => void = () => undefined
    rejectSearch: (error: Error) => void = () => undefined
    search = vi.fn()

    constructor (rgPath: string, query: any) {
      this.rgPath = rgPath
      this.query = query
      TextSearchEngineAdapter.instances.push(this)
      this.search.mockImplementation(() => new Promise((resolve, reject) => {
        this.resolveSearch = resolve
        this.rejectSearch = reject
      }))
    }
  }

  return {
    arch: vi.fn(() => 'arm64'),
    platform: vi.fn(() => 'linux'),
    convertAppPath: vi.fn((value: string) => value.replace('app.asar', 'app.asar.unpacked')),
    CancellationTokenSource,
    TextSearchEngineAdapter
  }
})

vi.mock('os', () => ({
  default: {
    platform: (...args: any[]) => mocks.platform(...args),
    arch: (...args: any[]) => mocks.arch(...args)
  }
}))

vi.mock('ripgrep-wrapper', () => ({
  CancellationTokenSource: mocks.CancellationTokenSource,
  TextSearchEngineAdapter: mocks.TextSearchEngineAdapter
}))

vi.mock('@vscode/ripgrep', () => ({
  rgPath: '/app.asar/bin/rg'
}))

vi.mock('../../constant', () => ({
  BIN_DIR: '/bin'
}))

vi.mock('../../helper', async importOriginal => ({
  ...(await importOriginal() as any),
  convertAppPath: (...args: any[]) => mocks.convertAppPath(...args)
}))

async function loadSearch () {
  vi.resetModules()
  mocks.TextSearchEngineAdapter.instances = []
  return await import('../search')
}

async function readStream (stream: NodeJS.ReadableStream) {
  const chunks: any[] = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return chunks.join('')
}

describe('server search module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.platform.mockReturnValue('linux')
    mocks.arch.mockReturnValue('arm64')
    mocks.convertAppPath.mockImplementation((value: string) => value.replace('app.asar', 'app.asar.unpacked'))
  })

  test('applies a default max file size and streams result, message, and done events', async () => {
    const { search } = await loadSearch()
    const query: any = { folderQueries: [{ folder: '/repo' }], contentPattern: { pattern: 'needle' } }

    const response = await search(query)
    const adapter = mocks.TextSearchEngineAdapter.instances[0]
    const [, onResult, onMessage] = adapter.search.mock.calls[0]

    onResult({ path: '/repo/a.md' })
    onMessage({ text: 'searched' })
    const outputPromise = readStream(response)
    adapter.resolveSearch(true)

    await expect(outputPromise).resolves.toBe([
      '{"type":"result","payload":{"path":"/repo/a.md"}}',
      '{"type":"message","payload":{"text":"searched"}}',
      '{"type":"done","payload":true}',
      ''
    ].join('\n'))
    expect(query.maxFileSize).toBe(3 * 1024 * 1024)
    expect(adapter.rgPath).toBe('/app.asar.unpacked/bin/rg')
  })

  test('uses the bundled darwin ripgrep binary without converting the package path', async () => {
    mocks.platform.mockReturnValue('darwin')
    mocks.arch.mockReturnValue('x64')

    const { search } = await loadSearch()
    await search({ maxFileSize: 10 } as any)

    expect(mocks.TextSearchEngineAdapter.instances[0].rgPath).toBe('/bin/rg-darwin-x64')
    expect(mocks.convertAppPath).not.toHaveBeenCalled()
  })

  test('streams search errors and cancels when the response closes', async () => {
    const { search } = await loadSearch()
    const response = await search({ maxFileSize: 1 } as any)
    const adapter = mocks.TextSearchEngineAdapter.instances[0]
    const token = adapter.search.mock.calls[0][0]

    const outputPromise = readStream(response)
    adapter.rejectSearch(new Error('rg failed'))

    await expect(outputPromise).resolves.toBe([
      '{"type":"error","payload":{}}',
      ''
    ].join('\n'))
    response.emit('close')

    expect(token.isCancellationRequested).toBe(true)
  })
})
