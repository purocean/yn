const apiMocks = vi.hoisted(() => ({
  fetchTree: vi.fn(async () => [{ name: '/', path: '/', type: 'dir', repo: 'notes', children: [] }]),
  readFile: vi.fn(async () => ({ content: '# Fallback' })),
  watchFs: vi.fn(async (_repo: string, _glob: string, _opts: any, onResult: any, onError: any) => {
    apiMocks.onResult = onResult
    apiMocks.onError = onError
    return apiMocks.handler
  }),
  onResult: undefined as any,
  onError: undefined as any,
  handler: { abort: vi.fn() },
}))

const dbMocks = vi.hoisted(() => ({
  documents: {
    findAllMtimeMsByRepo: vi.fn(async () => new Map([
      ['/skip.md', { id: 7, mtimeMs: 10 }],
    ])),
    findByRepoAndPath: vi.fn(async () => null),
    bulkPut: vi.fn(async () => [101]),
    deleteUnusedInRepo: vi.fn(async () => undefined),
    deletedByRepoAndPath: vi.fn(async () => undefined),
    put: vi.fn(async () => undefined),
  },
}))

const hookMocks = vi.hoisted(() => ({
  registerHook: vi.fn(),
  removeHook: vi.fn(),
  triggerHook: vi.fn(async () => undefined),
}))

const jsonRpcMocks = vi.hoisted(() => ({
  modules: {} as Record<string, any>,
  updateIndexStatus: vi.fn(),
  getSetting: vi.fn(async () => '^node_modules/'),
  triggerHostHook: vi.fn(),
}))

vi.mock('@fe/support/api', () => ({
  fetchTree: apiMocks.fetchTree,
  readFile: apiMocks.readFile,
  watchFs: apiMocks.watchFs,
}))

vi.mock('@fe/others/db', () => ({
  documents: dbMocks.documents,
}))

vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: {
    TARGET_PATH: 'data-target-path',
    WIKI_LINK: 'data-wiki-link',
  },
  FLAG_DEBUG: false,
  FLAG_DEMO: false,
  HELP_REPO_NAME: '__help__',
  MODE: 'normal',
}))

vi.mock('@fe/utils/pure', () => ({
  path: {
    relative: (from: string, to: string) => to.replace(new RegExp(`^${from}/?`), ''),
    basename: (value: string) => value.split('/').filter(Boolean).pop() || '',
  },
  getLogger: () => new Proxy({}, { get: () => () => undefined }),
  sleep: vi.fn(async () => undefined),
}))

vi.mock('@fe/core/hook', () => hookMocks)

vi.mock('@fe/plugins/markdown-link/lib', () => ({
  isAnchorToken: (token: any) => token.type === 'link_open',
  isDataUrl: (value: string) => value.startsWith('data:'),
  isResourceToken: (token: any) => token.type === 'image',
  parseLink: (_doc: any, href: string) => href.startsWith('http')
    ? { type: 'external' }
    : { type: 'internal', path: href, position: null },
}))

vi.mock('@fe/plugins/markdown-hashtags/lib', () => ({
  isTagToken: () => false,
}))

vi.mock('jsonrpc-bridge', () => ({
  JSONRPCServer: vi.fn(function JSONRPCServer (this: any) {
    this.addModule = vi.fn((name: string, mod: any) => {
      jsonRpcMocks.modules[name] = mod
    })
  }),
  JSONRPCClient: vi.fn(function JSONRPCClient (this: any) {
    this.call = {
      ctx: {
        indexer: { updateIndexStatus: jsonRpcMocks.updateIndexStatus },
        setting: { getSetting: jsonRpcMocks.getSetting },
      },
    }
    this.notify = {
      ctx: {
        triggerHook: jsonRpcMocks.triggerHostHook,
      },
    }
  }),
}))

async function loadWorker () {
  vi.resetModules()
  Object.assign(globalThis.self, {
    ctx: undefined,
    postMessage: vi.fn(),
    location: { href: 'worker.js' },
  })

  await import('@fe/others/indexer-worker')
  return jsonRpcMocks.modules.main
}

describe('indexer worker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    jsonRpcMocks.modules = {}
    apiMocks.onResult = undefined
    apiMocks.onError = undefined
    apiMocks.handler = { abort: vi.fn() }
    dbMocks.documents.findAllMtimeMsByRepo.mockResolvedValue(new Map([
      ['/skip.md', { id: 7, mtimeMs: 10 }],
    ]))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('initializes worker context and starts repo watch with indexed content flow', async () => {
    const main = await loadWorker()
    const repo = { name: 'notes', path: '/repo', enableIndexing: true }

    expect(main).toEqual(expect.objectContaining({
      triggerWatchRepo: expect.any(Function),
      stopWatch: expect.any(Function),
      importScripts: expect.any(Function),
    }))
    expect((self as any).ctx).toEqual(expect.objectContaining({
      markdown: expect.any(Object),
      bridgeClient: expect.any(Object),
      registerHook: hookMocks.registerHook,
      removeHook: hookMocks.removeHook,
    }))

    main.triggerWatchRepo(repo)
    await vi.waitFor(() => expect(apiMocks.watchFs).toHaveBeenCalled())

    expect(apiMocks.fetchTree).toHaveBeenCalledWith('notes', { by: 'mtime', order: 'desc' }, '/$|.md$', true)
    expect(dbMocks.documents.findAllMtimeMsByRepo).toHaveBeenCalledWith('notes')
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('WORKER_INDEXER_BEFORE_START_WATCH', { repo }, { breakable: true })
    expect(apiMocks.watchFs).toHaveBeenCalledWith(
      'notes',
      '/**/*',
      expect.objectContaining({ ignored: '^node_modules/', mdContent: true, mdFilesOnly: true }),
      expect.any(Function),
      expect.any(Function),
    )

    await apiMocks.onResult({
      eventName: 'add',
      path: '/repo/new.md',
      content: '[site](https://example.com)\n![alt](img.png)',
      stats: { ctimeMs: 1, mtimeMs: 2, size: 33 },
    })
    await apiMocks.onResult({
      eventName: 'add',
      path: '/repo/skip.md',
      content: 'skip',
      stats: { ctimeMs: 1, mtimeMs: 10, size: 4 },
    })
    await apiMocks.onResult({ eventName: 'ready', path: '/repo' })
    await vi.advanceTimersByTimeAsync(500)

    expect(dbMocks.documents.bulkPut).toHaveBeenCalledWith([
      expect.objectContaining({
        repo: 'notes',
        path: '/new.md',
        name: 'new.md',
        links: [expect.objectContaining({ href: 'https://example.com', internal: null })],
        resources: [expect.objectContaining({ src: 'img.png', tag: 'img' })],
        ctimeMs: 1,
        mtimeMs: 2,
        size: 33,
      }),
    ])
    expect(dbMocks.documents.deleteUnusedInRepo).toHaveBeenCalledWith('notes', [7, 101])
    expect(jsonRpcMocks.updateIndexStatus).toHaveBeenCalledWith(repo, expect.objectContaining({
      ready: true,
      total: 2,
      indexed: 2,
      processing: null,
    }))

    await apiMocks.onResult({
      eventName: 'change',
      path: '/repo/fallback.md',
      stats: { ctimeMs: 3, mtimeMs: 4, size: 10 },
    })
    expect(apiMocks.readFile).toHaveBeenCalledWith({ repo: 'notes', path: '/fallback.md' })
    expect(dbMocks.documents.put).toHaveBeenCalledWith(expect.objectContaining({
      path: '/fallback.md',
      frontmatter: {},
    }))

    await apiMocks.onResult({ eventName: 'unlink', path: '/repo/old.md' })
    expect(dbMocks.documents.deletedByRepoAndPath).toHaveBeenCalledWith('notes', '/old.md')

    main.stopWatch()
    expect(apiMocks.handler.abort).toHaveBeenCalled()
  })

  test('skips watching disabled repos and handles null repo requests', async () => {
    const main = await loadWorker()

    main.triggerWatchRepo({ name: 'notes', path: '/repo', enableIndexing: false })
    await Promise.resolve()
    await Promise.resolve()
    expect(apiMocks.watchFs).not.toHaveBeenCalled()

    main.triggerWatchRepo(null)
    await Promise.resolve()
    expect(apiMocks.watchFs).not.toHaveBeenCalled()
  })
})
