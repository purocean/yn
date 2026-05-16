const mocks = vi.hoisted(() => ({
  debug: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@fe/utils', () => ({
  getLogger: vi.fn(() => ({
    debug: mocks.debug,
    error: mocks.error,
  })),
}))

import watchFileRefresh from '../watch-file-refresh'

function createCtx () {
  const hooks = new Map<string, Function>()
  const watchHandler = { abort: vi.fn() }
  let watchResult: Function | null = null
  let watchError: Function | null = null
  const currentFile = {
    repo: 'repo',
    path: '/a.md',
    absolutePath: '/repo/a.md',
    content: 'local',
    contentHash: 'old',
    stat: { mtime: 100 },
  }
  const ctx = {
    api: {
      readFile: vi.fn(() => Promise.resolve({ hash: 'remote' })),
      watchFs: vi.fn((_repo: string, _path: string, _options: any, onResult: Function, onError: Function) => {
        watchResult = onResult
        watchError = onError
        return Promise.resolve(watchHandler)
      }),
    },
    args: {
      FLAG_DEMO: false,
      HELP_REPO_NAME: '__help__',
      MODE: 'normal',
    },
    doc: {
      isSameFile: vi.fn((a: any, b: any) => a?.repo === b?.repo && a?.path === b?.path),
      switchDoc: vi.fn(),
    },
    editor: {
      isDefault: vi.fn(() => true),
    },
    env: {
      isWindows: true,
    },
    i18n: {
      t: vi.fn((key: string) => key),
    },
    lib: {
      asynclock: class {
        acquire (_key: string, fn: Function) {
          ctx._lastAcquire = fn(vi.fn())
          return ctx._lastAcquire
        }
      },
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    store: {
      getters: {
        isSaved: { value: true },
      },
      state: {
        currentContent: 'edited',
        currentFile,
      },
    },
    ui: {
      useModal: vi.fn(() => ({ confirm: vi.fn(() => Promise.resolve(true)) })),
    },
    utils: {
      path: {
        normalizeSep: vi.fn((value: string) => value.replaceAll('\\', '/')),
      },
      sleep: vi.fn(() => Promise.resolve()),
    },
    _hooks: hooks,
    _lastAcquire: null as Promise<void> | null,
    get _watchError () {
      return watchError!
    },
    get _watchResult () {
      return watchResult!
    },
    _watchHandler: watchHandler,
  } as any

  return ctx
}

describe('watch-file-refresh plugin', () => {
  beforeEach(() => {
    mocks.debug.mockClear()
    mocks.error.mockClear()
  })

  test('does not register hooks in demo or non-normal modes', () => {
    const demoCtx = createCtx()
    demoCtx.args.FLAG_DEMO = true
    watchFileRefresh.register(demoCtx)
    expect(demoCtx.registerHook).not.toHaveBeenCalled()

    const readonlyCtx = createCtx()
    readonlyCtx.args.MODE = 'readonly'
    watchFileRefresh.register(readonlyCtx)
    expect(readonlyCtx.registerHook).not.toHaveBeenCalled()
  })

  test('starts and replaces watchers on document switches', async () => {
    const ctx = createCtx()

    watchFileRefresh.register(ctx)
    ctx._hooks.get('DOC_SWITCHED')({ doc: ctx.store.state.currentFile })
    await ctx._lastAcquire

    expect(ctx.api.watchFs).toHaveBeenCalledWith(
      'repo',
      '/a.md',
      expect.objectContaining({
        alwaysStat: true,
        usePolling: true,
      }),
      expect.any(Function),
      expect.any(Function),
    )

    const nextDoc = { ...ctx.store.state.currentFile, path: '/b.md', absolutePath: '/repo/b.md' }
    ctx.store.state.currentFile = nextDoc
    ctx._hooks.get('DOC_SWITCHED')({ doc: nextDoc })
    await ctx._lastAcquire

    expect(ctx._watchHandler.abort).toHaveBeenCalled()
    expect(ctx.api.watchFs).toHaveBeenCalledTimes(2)
  })

  test('refreshes saved docs and prompts before replacing unsaved changed docs', async () => {
    const ctx = createCtx()

    watchFileRefresh.register(ctx)
    ctx._hooks.get('DOC_SWITCHED')({ doc: ctx.store.state.currentFile })
    await ctx._lastAcquire

    ctx._watchResult({ eventName: 'ready' })
    ctx._watchResult({
      eventName: 'change',
      path: '/repo/a.md',
      stats: { mtimeMs: 200 },
    })
    expect(ctx.doc.switchDoc).toHaveBeenCalledWith(ctx.store.state.currentFile, { force: true })

    ctx.doc.switchDoc.mockClear()
    ctx.store.getters.isSaved.value = false
    ctx._watchResult({
      eventName: 'change',
      path: '/repo/a.md',
      stats: { mtimeMs: 300 },
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(ctx.store.state.currentContent).toBe('local')
    expect(ctx.doc.switchDoc).toHaveBeenCalledWith(ctx.store.state.currentFile, { force: true })
  })

  test('aborts stale watches and retries non-system watch errors', async () => {
    const ctx = createCtx()

    watchFileRefresh.register(ctx)
    ctx._hooks.get('DOC_SWITCHED')({ doc: ctx.store.state.currentFile })
    await ctx._lastAcquire

    ctx._watchResult({
      eventName: 'change',
      path: '/repo/other.md',
      stats: { mtimeMs: 300 },
    })
    expect(ctx._watchHandler.abort).toHaveBeenCalled()

    await ctx._watchError({ syscall: 'stat' })
    expect(ctx.utils.sleep).not.toHaveBeenCalled()

    await ctx._watchError(new Error('watch failed'))
    expect(ctx.utils.sleep).toHaveBeenCalledWith(2000)
    expect(ctx.api.watchFs).toHaveBeenCalledTimes(2)
  })

  test('stops watch for help repo docs', async () => {
    const ctx = createCtx()
    const helpDoc = { ...ctx.store.state.currentFile, repo: '__help__' }
    ctx.store.state.currentFile = helpDoc

    watchFileRefresh.register(ctx)
    ctx._hooks.get('DOC_SWITCHED')({ doc: helpDoc })
    await ctx._lastAcquire

    expect(ctx.api.watchFs).not.toHaveBeenCalled()
  })
})
