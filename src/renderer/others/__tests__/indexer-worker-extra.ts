const apiMocks = vi.hoisted(() => ({
  fetchTree: vi.fn(async () => []),
  readFile: vi.fn(async () => ({ content: '# From disk\n[local](./a.md)' })),
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
    findAllMtimeMsByRepo: vi.fn(async () => new Map()),
    findByRepoAndPath: vi.fn(async () => ({ id: 9, mtimeMs: 1 })),
    bulkPut: vi.fn(async () => [31, 32]),
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

const pureMocks = vi.hoisted(() => ({
  sleep: vi.fn(async () => undefined),
  debug: vi.fn(),
  error: vi.fn(),
}))

const rpcMocks = vi.hoisted(() => ({
  modules: {} as Record<string, any>,
  channels: {} as Record<string, any>,
  updateIndexStatus: vi.fn(),
  getSetting: vi.fn(async () => ''),
  triggerHostHook: vi.fn(),
}))

vi.mock('@fe/support/api', () => ({
  fetchTree: apiMocks.fetchTree,
  readFile: apiMocks.readFile,
  watchFs: apiMocks.watchFs,
}))
vi.mock('@fe/others/db', () => ({ documents: dbMocks.documents }))
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
  getLogger: () => ({ debug: pureMocks.debug, error: pureMocks.error }),
  sleep: pureMocks.sleep,
}))
vi.mock('@fe/core/hook', () => hookMocks)
vi.mock('@fe/plugins/markdown-link/lib', () => ({
  isAnchorToken: (token: any) => token.type === 'link_open',
  isDataUrl: (value: string) => value.startsWith('data:'),
  isResourceToken: (token: any) => token.type === 'image',
  parseLink: (_doc: any, href: string, wiki?: boolean) => {
    if (href.startsWith('http')) return { type: 'external' }
    if (href === 'ignore') return null
    return { type: 'internal', path: wiki ? `/wiki/${href}` : href, position: wiki ? '#h' : null }
  },
}))
vi.mock('@fe/plugins/markdown-hashtags/lib', () => ({
  isTagToken: (token: any) => token.type === 'tag',
}))
vi.mock('jsonrpc-bridge', () => ({
  JSONRPCServer: vi.fn(function JSONRPCServer (this: any, channel: any) {
    rpcMocks.channels.server = channel
    this.addModule = vi.fn((name: string, mod: any) => {
      rpcMocks.modules[name] = mod
    })
  }),
  JSONRPCClient: vi.fn(function JSONRPCClient (this: any, channel: any) {
    rpcMocks.channels.client = channel
    this.call = {
      ctx: {
        indexer: { updateIndexStatus: rpcMocks.updateIndexStatus },
        setting: { getSetting: rpcMocks.getSetting },
      },
    }
    this.notify = { ctx: { triggerHook: rpcMocks.triggerHostHook } }
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
  return rpcMocks.modules.main
}

describe('indexer worker extra boundaries', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    rpcMocks.modules = {}
    rpcMocks.channels = {}
    apiMocks.onResult = undefined
    apiMocks.onError = undefined
    apiMocks.handler = { abort: vi.fn() }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('worker channel routes only matching host messages and outbound payloads', async () => {
    await loadWorker()
    const serverCallback = vi.fn()
    const clientCallback = vi.fn()
    rpcMocks.channels.server.setMessageHandler(serverCallback)
    rpcMocks.channels.client.setMessageHandler(clientCallback)

    rpcMocks.channels.server.send({ id: 1, result: 'ok' })
    rpcMocks.channels.server.send({ id: 2, method: 'ignored' })
    rpcMocks.channels.client.send({ id: 3, method: 'hostCall', params: [] })
    rpcMocks.channels.client.send({ id: 4, result: 'ignored' })

    expect(self.postMessage).toHaveBeenCalledTimes(2)
    expect(self.postMessage).toHaveBeenCalledWith({ from: 'worker', message: { id: 1, result: 'ok' } })
    expect(self.postMessage).toHaveBeenCalledWith({ from: 'worker', message: { id: 3, method: 'hostCall', params: [] } })

    self.dispatchEvent(new MessageEvent('message', { data: { from: 'other', message: { id: 1, method: 'x' } } }))
    self.dispatchEvent(new MessageEvent('message', { data: { from: 'host', message: { id: 2, method: 'serverCall' } } }))
    self.dispatchEvent(new MessageEvent('message', { data: { from: 'host', message: { id: 3, result: 'clientResult' } } }))

    expect(serverCallback).toHaveBeenCalledWith({ id: 2, method: 'serverCall' })
    expect(clientCallback).toHaveBeenCalledWith({ id: 3, result: 'clientResult' })
    expect(serverCallback).toHaveBeenCalledTimes(1)
    expect(clientCallback).toHaveBeenCalledTimes(1)
  })

  test('indexes hook-added tags, wiki links, data-url filtering, and ready fs notifications', async () => {
    const main = await loadWorker()
    const repo = { name: 'notes', path: '/repo', enableIndexing: true }
    ;(self as any).ctx.markdown.core.ruler.push('extra_tokens', (state: any) => {
      state.env.attributes = { tags: ['front', ''] }
      const tag = new state.Token('tag', '', 0)
      tag.content = '#inline'
      state.tokens.push(tag)
      const visit = (tokens: any[]) => {
        for (const token of tokens) {
          if (token.type === 'link_open' && token.attrGet('href') === 'Page.md') {
            token.attrSet('data-wiki-link', 'true')
          }
          if (token.type === 'image' && token.attrGet('src') === 'pic.png') {
            token.attrSet('data-target-path', '/assets/pic.png')
          }
          if (token.children) visit(token.children)
        }
      }
      visit(state.tokens)
    })

    main.triggerWatchRepo(repo)
    await vi.waitFor(() => expect(apiMocks.watchFs).toHaveBeenCalledTimes(1))
    await apiMocks.onResult({
      eventName: 'add',
      path: '/repo/doc.md',
      content: '[wiki](Page.md){data-wiki-link="true"} [data](data:text/plain,ok) ![inline](data:image/png,abc) ![res](pic.png){data-target-path="/assets/pic.png"}',
      stats: { ctimeMs: 1, mtimeMs: 2, size: 3 },
    })
    await apiMocks.onResult({ eventName: 'ready', path: '/repo' })
    await apiMocks.onResult({ eventName: 'addDir', path: '/repo/folder' })
    await vi.advanceTimersByTimeAsync(500)

    expect(dbMocks.documents.bulkPut).toHaveBeenCalledWith([
      expect.objectContaining({
        tags: ['#front', '#inline'],
        links: [expect.objectContaining({ href: 'Page.md', internal: '/wiki/Page.md', position: '#h' })],
        resources: [expect.objectContaining({ src: 'pic.png', internal: '/assets/pic.png' })],
        frontmatter: { tags: ['front', ''] },
      }),
    ])
    expect(rpcMocks.triggerHostHook).toHaveBeenCalledWith('INDEXER_FS_CHANGE', { repo })
  })

  test('handles watcher processing failures, syscall errors, and non-system retries', async () => {
    const main = await loadWorker()
    const repo = { name: 'notes', path: '/repo', enableIndexing: true }
    main.triggerWatchRepo(repo)
    await vi.waitFor(() => expect(apiMocks.watchFs).toHaveBeenCalledTimes(1))

    dbMocks.documents.findAllMtimeMsByRepo.mockResolvedValueOnce(new Map())
    dbMocks.documents.bulkPut.mockRejectedValueOnce(new Error('bulk failed'))
    await apiMocks.onResult({ eventName: 'ready', path: '/repo' })
    expect(pureMocks.error).not.toHaveBeenCalledWith('processFile error', expect.anything())

    dbMocks.documents.findByRepoAndPath.mockResolvedValueOnce(null)
    apiMocks.readFile.mockRejectedValueOnce(new Error('read failed'))
    await apiMocks.onResult({ eventName: 'change', path: '/repo/bad.md', stats: { mtimeMs: 5 } })
    expect(pureMocks.error).toHaveBeenCalledWith('processFile error', expect.any(Error))

    await apiMocks.onError(Object.assign(new Error('system'), { syscall: 'stat' }))
    expect(pureMocks.sleep).not.toHaveBeenCalled()

    await apiMocks.onError(new Error('network'))
    expect(pureMocks.sleep).toHaveBeenCalledWith(2000)
    await vi.waitFor(() => expect(apiMocks.watchFs).toHaveBeenCalledTimes(2))
  })
})
