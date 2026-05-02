const mocks = vi.hoisted(() => ({
  close: vi.fn(),
  readFile: vi.fn(),
  send: vi.fn(),
  watcherHandlers: {} as Record<string, Function>,
  watch: vi.fn(),
}))

vi.mock('chokidar', () => ({
  __esModule: true,
  default: {
    watch: (...args: any[]) => mocks.watch(...args),
  }
}))

vi.mock('fs-extra', () => ({
  readFile: (...args: any[]) => mocks.readFile(...args),
}))

function nextTick () {
  return new Promise(resolve => setTimeout(resolve, 0))
}

describe('main server watch-worker module', () => {
  let onSpy: ReturnType<typeof vi.spyOn>
  let offSpy: ReturnType<typeof vi.spyOn>
  let listeners: Record<string, Function[]>
  let originalSend: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    listeners = {}
    mocks.watcherHandlers = {}
    mocks.watch.mockReturnValue({
      on: (event: string, handler: Function) => {
        mocks.watcherHandlers[event] = handler
      },
      close: (...args: any[]) => mocks.close(...args),
    })
    mocks.readFile.mockResolvedValue('markdown content')
    originalSend = (process as any).send
    Object.defineProperty(process, 'send', {
      value: (...args: any[]) => mocks.send(...args),
      configurable: true,
    })
    onSpy = vi.spyOn(process, 'on').mockImplementation(((event: string, handler: Function) => {
      listeners[event] ||= []
      listeners[event].push(handler)
      return process
    }) as any)
    offSpy = vi.spyOn(process, 'off').mockImplementation(((event: string, handler: Function) => {
      listeners[event] = (listeners[event] || []).filter(x => x !== handler)
      return process
    }) as any)
    await import('../watch-worker')
  })

  afterEach(() => {
    onSpy.mockRestore()
    offSpy.mockRestore()
    Object.defineProperty(process, 'send', {
      value: originalSend,
      configurable: true,
    })
  })

  test('initializes chokidar with regex ignored option and enqueues markdown content', async () => {
    listeners.message[0]({
      id: 7,
      type: 'init',
      payload: {
        filePath: '/repo',
        options: { ignored: '^node_modules/$', mdContent: true, mdFilesOnly: true },
      },
    })

    expect(mocks.watch).toHaveBeenCalledWith('/repo', {
      ignored: expect.any(Function),
      mdContent: true,
      mdFilesOnly: true,
    })
    const ignored = mocks.watch.mock.calls[0][1].ignored
    expect(ignored('/repo/node_modules/pkg/index.js')).toBe(true)
    expect(ignored('/repo/src/index.js')).toBe(false)

    await mocks.watcherHandlers.all('add', '/repo/a.md', {
      isFile: () => true,
      isDirectory: () => false,
      size: 10,
    })
    await nextTick()

    expect(mocks.readFile).toHaveBeenCalledWith('/repo/a.md', 'utf-8')
    expect(mocks.send).toHaveBeenCalledWith({
      id: 7,
      type: 'enqueue',
      payload: {
        type: 'result',
        data: {
          eventName: 'add',
          path: '/repo/a.md',
          content: 'markdown content',
          stats: expect.objectContaining({
            isFile: true,
            isDirectory: false,
            size: 10,
          }),
        },
      },
    })

    mocks.send.mockClear()
    await mocks.watcherHandlers.all('add', '/repo/a.txt')
    await nextTick()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  test('handles ready, error, stop, and disconnect events', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined as never) as any)
    listeners.message[0]({
      id: 8,
      type: 'init',
      payload: {
        filePath: '/repo',
        options: {},
      },
    })

    mocks.watcherHandlers.ready()
    await nextTick()
    expect(mocks.send).toHaveBeenCalledWith({
      id: 8,
      type: 'enqueue',
      payload: { type: 'result', data: { eventName: 'ready' } },
    })

    const error = new Error('watch failed')
    mocks.watcherHandlers.error(error)
    expect(mocks.send).toHaveBeenCalledWith({
      id: 8,
      type: 'enqueue',
      payload: { type: 'error', data: error },
    })

    listeners.message[1]({ id: 99, type: 'stop' })
    expect(mocks.close).not.toHaveBeenCalled()
    listeners.message[1]({ id: 8, type: 'stop' })
    expect(mocks.close).toHaveBeenCalled()
    expect(offSpy).toHaveBeenCalledWith('message', expect.any(Function))

    listeners.disconnect[0]()
    expect(exitSpy).toHaveBeenCalled()
    exitSpy.mockRestore()
  })
})
