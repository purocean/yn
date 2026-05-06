const mocks = vi.hoisted(() => ({
  state: {
    currentRepo: null as any,
    currentRepoIndexStatus: null as any,
  },
  docs: {
    deleteByRepo: vi.fn(async () => undefined),
    deleteUnusedRepo: vi.fn(),
  },
  repos: [] as any[],
  loggerInfo: vi.fn(),
  clientChannels: [] as any[],
  serverChannels: [] as any[],
  clientCalls: {
    triggerWatchRepo: vi.fn(),
    stopWatch: vi.fn(),
    importScripts: vi.fn(async () => undefined),
  },
  serverAddModule: vi.fn(),
  workers: [] as any[],
  flagDemo: false,
  mode: 'normal',
}))

class MockWorker extends EventTarget {
  public messages: any[] = []

  constructor (public url: URL, public options: WorkerOptions) {
    super()
    mocks.workers.push(this)
  }

  postMessage (message: any) {
    this.messages.push(message)
  }
}

vi.stubGlobal('Worker', MockWorker)

vi.mock('jsonrpc-bridge', () => ({
  JSONRPCClient: class {
    call = { main: mocks.clientCalls }

    constructor (channel: any) {
      mocks.clientChannels.push(channel)
    }
  },
  JSONRPCServer: class {
    constructor (channel: any) {
      mocks.serverChannels.push(channel)
    }

    addModule = mocks.serverAddModule
  },
}))

vi.mock('@fe/support/store', () => ({
  default: { state: mocks.state },
}))

vi.mock('@fe/others/db', () => ({
  documents: mocks.docs,
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => ({ info: mocks.loggerInfo }),
}))

vi.mock('@fe/services/repo', () => ({
  getAllRepos: () => mocks.repos,
}))

vi.mock('@fe/context', () => ({
  default: { app: 'ctx' },
}))

vi.mock('@fe/support/args', () => ({
  FLAG_DEBUG: false,
  get FLAG_DEMO () {
    return mocks.flagDemo
  },
  get MODE () {
    return mocks.mode
  },
}))

vi.mock('@fe/others/indexer-worker?worker&url', () => ({
  default: '/indexer-worker.js',
}))

let service: typeof import('@fe/services/indexer')

beforeAll(async () => {
  vi.stubGlobal('Worker', MockWorker)
  service = await import('@fe/services/indexer')
})

beforeEach(() => {
  mocks.state.currentRepo = null
  mocks.state.currentRepoIndexStatus = null
  mocks.docs.deleteByRepo.mockClear()
  mocks.docs.deleteUnusedRepo.mockClear()
  mocks.repos = []
  mocks.loggerInfo.mockClear()
  mocks.clientCalls.triggerWatchRepo.mockClear()
  mocks.clientCalls.stopWatch.mockClear()
  mocks.clientCalls.importScripts.mockClear()
  mocks.flagDemo = false
  mocks.mode = 'normal'
})

test('constructs worker rpc channels and exposes document manager', async () => {
  await Promise.resolve()

  expect(mocks.workers[0].url.pathname).toBe('/indexer-worker.js')
  expect(mocks.workers[0].options).toStrictEqual({ type: 'module' })
  expect(mocks.clientChannels).toHaveLength(1)
  expect(mocks.serverChannels).toHaveLength(1)
  expect(mocks.serverAddModule).toHaveBeenCalledWith('ctx', { app: 'ctx' })
  expect(service.getDocumentsManager()).toBe(mocks.docs)
})

test('routes worker channel messages by direction and message shape', () => {
  const worker = mocks.workers[0]
  const clientChannel = mocks.clientChannels[0]
  const serverChannel = mocks.serverChannels[0]
  const clientHandler = vi.fn()
  const serverHandler = vi.fn()

  clientChannel.setMessageHandler(clientHandler)
  serverChannel.setMessageHandler(serverHandler)
  clientChannel.send({ id: 1, method: 'main.ping' })
  serverChannel.send({ id: 2, result: 'ok' })
  worker.dispatchEvent(new MessageEvent('message', { data: { from: 'worker', message: { id: 3, result: 'pong' } } }))
  worker.dispatchEvent(new MessageEvent('message', { data: { from: 'worker', message: { id: 4, method: 'ctx.get' } } }))
  worker.dispatchEvent(new MessageEvent('message', { data: { from: 'host', message: { id: 5, result: 'ignored' } } }))

  expect(worker.messages).toEqual([
    { from: 'host', message: { id: 1, method: 'main.ping' } },
    { from: 'host', message: { id: 2, result: 'ok' } },
  ])
  expect(clientHandler).toHaveBeenCalledWith({ id: 3, result: 'pong' })
  expect(serverHandler).toHaveBeenCalledWith({ id: 4, method: 'ctx.get' })
})

test('cleans current and unused repositories', async () => {
  mocks.state.currentRepo = { name: 'notes', enableIndexing: true }
  mocks.repos = [
    { name: 'notes', enableIndexing: true },
    { name: 'drafts', enableIndexing: false },
    { name: 'work', enableIndexing: true },
  ]

  await service.cleanCurrentRepo()
  service.cleanUnusedRepo()

  expect(mocks.state.currentRepoIndexStatus).toBeNull()
  expect(mocks.docs.deleteByRepo).toHaveBeenCalledWith('notes')
  expect(mocks.docs.deleteUnusedRepo).toHaveBeenCalledWith(['notes', 'work'])
})

test('watches current repo only when indexing is enabled and rebuilds by cleaning first', async () => {
  mocks.state.currentRepo = { name: 'disabled', enableIndexing: false }
  service.triggerWatchCurrentRepo()

  expect(mocks.clientCalls.stopWatch).toHaveBeenCalledTimes(1)
  expect(mocks.clientCalls.triggerWatchRepo).not.toHaveBeenCalled()

  mocks.state.currentRepo = { name: 'notes', enableIndexing: true, path: '/repo' }
  await service.rebuildCurrentRepo()

  expect(mocks.docs.deleteByRepo).toHaveBeenCalledWith('notes')
  expect(mocks.clientCalls.triggerWatchRepo).toHaveBeenCalledWith({ name: 'notes', enableIndexing: true, path: '/repo' })
  expect(mocks.docs.deleteUnusedRepo).toHaveBeenCalled()
})

test('updates index status and imports scripts unless disabled by runtime flags', async () => {
  service.updateIndexStatus({ name: 'notes' } as any, { ready: true, indexed: 2, cost: 5 } as any)
  await service.importScriptsToWorker(new URL('https://example.com/a.js'))
  await service.importScriptsToWorker('console.log(1)', true)

  expect(mocks.state.currentRepoIndexStatus).toStrictEqual({
    repo: 'notes',
    status: { ready: true, indexed: 2, cost: 5 },
  })
  expect(mocks.clientCalls.importScripts).toHaveBeenNthCalledWith(1, 'https://example.com/a.js', false)
  expect(mocks.clientCalls.importScripts).toHaveBeenNthCalledWith(2, 'console.log(1)', true)

  mocks.flagDemo = true
  await service.importScriptsToWorker('ignored')
  expect(mocks.clientCalls.importScripts).toHaveBeenCalledTimes(2)

  service.stopWatch()
  expect(mocks.clientCalls.stopWatch).toHaveBeenCalled()
})
