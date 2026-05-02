const mocks = vi.hoisted(() => ({
  registerHook: vi.fn(),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: mocks.registerHook,
}))

import editorRestoreState from '../editor-restore-state'

function createCtx () {
  const vueWatchers: Function[] = []
  const viewStateCache: Record<string, any> = {}
  const modelA = {
    uri: {
      scheme: 'yn',
      toString: () => 'yn://repo/a.md',
    },
    dispose: vi.fn(),
  }
  const modelB = {
    uri: {
      scheme: 'yn',
      toString: () => 'yn://repo/b.md',
    },
    dispose: vi.fn(),
  }
  const editorCallbacks = new Map<string, Function>()
  const editor = {
    getModel: vi.fn(() => modelA),
    onDidChangeCursorPosition: vi.fn((fn: Function) => editorCallbacks.set('cursor', fn)),
    onDidChangeModel: vi.fn((fn: Function) => editorCallbacks.set('model', fn)),
    onDidScrollChange: vi.fn((fn: Function) => editorCallbacks.set('scroll', fn)),
    restoreViewState: vi.fn(),
    saveViewState: vi.fn(() => ({ cursor: 1 })),
  }
  const monaco = {
    editor: {
      getModels: vi.fn(() => [modelA, modelB]),
    },
  }
  const ctx = {
    doc: {
      URI_SCHEME: 'yn',
    },
    editor: {
      whenEditorReady: vi.fn(() => Promise.resolve({ editor, monaco })),
    },
    lib: {
      lodash: {
        debounce: vi.fn((fn: Function) => vi.fn((...args: any[]) => fn(...args))),
      },
      vue: {
        shallowReactive: vi.fn((value: any) => Object.assign(viewStateCache, value)),
        watch: vi.fn((_source: any, fn: Function) => vueWatchers.push(fn)),
      },
    },
    storage: {
      get: vi.fn(() => ({
        'yn://repo/a.md': { _t: 1, v: { saved: true } },
        'yn://repo/old.md': { _t: 0, v: { old: true } },
      })),
      set: vi.fn(),
    },
    store: {
      state: {
        tabs: [
          { key: 'yn://repo/a.md' },
        ],
      },
    },
    utils: {
      getLogger: vi.fn(() => ({ debug: vi.fn() })),
    },
    _editor: editor,
    _editorCallbacks: editorCallbacks,
    _modelA: modelA,
    _modelB: modelB,
    _viewStateCache: viewStateCache,
    _vueWatchers: vueWatchers,
  } as any

  return ctx
}

describe('editor-restore-state plugin', () => {
  beforeEach(() => {
    mocks.registerHook.mockClear()
    vi.useFakeTimers()
    vi.setSystemTime(1000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('saves state before switching and restores cached state when model changes', async () => {
    const ctx = createCtx()

    editorRestoreState.register(ctx)
    await Promise.all(ctx.editor.whenEditorReady.mock.results.map((result: any) => result.value))

    const beforeSwitch = mocks.registerHook.mock.calls[0][1]
    beforeSwitch()
    await Promise.resolve()

    expect(ctx._viewStateCache['yn://repo/a.md']).toStrictEqual({
      _t: 1000,
      v: { cursor: 1 },
    })

    ctx._editorCallbacks.get('model')({ newModelUrl: { toString: () => 'yn://repo/a.md' } })
    expect(ctx._editor.restoreViewState).toHaveBeenCalledWith({ cursor: 1 })

    ctx._editorCallbacks.get('cursor')()
    ctx._editorCallbacks.get('scroll')()
    expect(ctx._viewStateCache['yn://repo/a.md'].v).toStrictEqual({ cursor: 1 })
  })

  test('persists only the latest ten cached states and cleans closed tabs and models', async () => {
    const ctx = createCtx()
    for (let i = 0; i < 12; i++) {
      ctx._viewStateCache[`yn://repo/${i}.md`] = { _t: i, v: i }
    }

    editorRestoreState.register(ctx)
    await Promise.all(ctx.editor.whenEditorReady.mock.results.map((result: any) => result.value))

    ctx._vueWatchers[0]()
    const saved = ctx.storage.set.mock.calls[0][1]
    expect(Object.keys(saved)).toHaveLength(10)
    expect(saved['yn://repo/11.md']).toStrictEqual({ _t: 11, v: 11 })

    ctx._vueWatchers[1]()
    await Promise.resolve()

    expect(ctx._viewStateCache['yn://repo/a.md']).toBeDefined()
    expect(ctx._viewStateCache['yn://repo/old.md']).toBeUndefined()
    expect(ctx._modelA.dispose).not.toHaveBeenCalled()
    expect(ctx._modelB.dispose).toHaveBeenCalled()
  })
})
