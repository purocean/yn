const mocks = vi.hoisted(() => ({
  editor: {
    addAction: vi.fn(),
    getContribution: vi.fn(),
    getPosition: vi.fn(() => ({ lineNumber: 4, column: 2 })),
  },
  whenEditorReady: vi.fn(),
}))

vi.mock('@fe/services/editor', () => ({
  whenEditorReady: mocks.whenEditorReady,
}))

import externalFileReadonly from '../external-file-readonly'

function createCtx () {
  const hooks = new Map<string, Function[]>()
  const schema = { properties: {} as Record<string, any> }
  const ctx = {
    doc: {
      isOutOfRepo: vi.fn((doc: any) => !!doc.external),
      isSameFile: vi.fn((a: any, b: any) => a?.repo === b?.repo && a?.path === b?.path),
      toUri: vi.fn((doc: any) => `${doc.repo}:${doc.path}`),
    },
    i18n: {
      t: vi.fn((key: string, ...args: string[]) => [key, ...args].join('|')),
    },
    lib: {
      vue: {
        watch: vi.fn(),
      },
    },
    registerHook: vi.fn((name: string, fn: Function) => {
      hooks.set(name, [...(hooks.get(name) || []), fn])
    }),
    setting: {
      changeSchema: vi.fn((fn: Function) => fn(schema)),
      getSetting: vi.fn((_key: string, fallback: any) => fallback),
      showSettingPanel: vi.fn(),
    },
    store: {
      state: {
        currentFile: null as any,
        tabs: [] as any[],
      },
    },
    _hooks: hooks,
    _schema: schema,
  } as any

  return ctx
}

describe('external-file-readonly plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.editor.addAction.mockClear()
    mocks.editor.getContribution.mockReset()
    mocks.editor.getPosition.mockClear()
    mocks.whenEditorReady.mockReset()
    mocks.whenEditorReady.mockResolvedValue({ editor: mocks.editor })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('registers schema, hooks, editor actions, and tab cleanup watcher', async () => {
    const ctx = createCtx()

    externalFileReadonly.register(ctx)
    await Promise.all(mocks.whenEditorReady.mock.results.map((result: any) => result.value))

    expect(ctx._schema.properties['editor.external-file-readonly']).toMatchObject({
      defaultValue: true,
      type: 'boolean',
      group: 'editor',
    })
    expect(Array.from(ctx._hooks.keys())).toEqual([
      'DOC_SWITCHED',
      'EDITOR_ATTEMPT_READONLY_EDIT',
      'SETTING_CHANGED',
    ])
    expect(mocks.editor.addAction.mock.calls.map(([action]: any[]) => action.id)).toEqual([
      'plugin.external-file-readonly.enable-edit',
      'plugin.external-file-readonly.open-setting',
    ])
    expect(ctx.lib.vue.watch).toHaveBeenCalledWith(expect.any(Function), expect.any(Function))
  })

  test('marks external writable docs readonly and lets the enable-edit action restore them', async () => {
    const ctx = createCtx()
    const doc = { repo: 'external', path: '/a.md', external: true, writeable: true }
    ctx.store.state.currentFile = doc

    externalFileReadonly.register(ctx)
    await Promise.all(mocks.whenEditorReady.mock.results.map((result: any) => result.value))
    ctx._hooks.get('DOC_SWITCHED')[0]({ doc })

    expect(ctx.store.state.currentFile).toMatchObject({ path: '/a.md', writeable: false })

    const enableEdit = mocks.editor.addAction.mock.calls[0][0]
    enableEdit.run()
    expect(ctx.store.state.currentFile).toMatchObject({ path: '/a.md', writeable: true })

    ctx._hooks.get('DOC_SWITCHED')[0]({ doc: ctx.store.state.currentFile })
    expect(ctx.store.state.currentFile).toMatchObject({ path: '/a.md', writeable: true })
  })

  test('responds to setting changes and ignores system readonly or non-external files', () => {
    const ctx = createCtx()
    const externalDoc = { repo: 'repo', path: '/outside.md', external: true, writeable: true }
    ctx.store.state.currentFile = externalDoc

    externalFileReadonly.register(ctx)
    ctx._hooks.get('DOC_SWITCHED')[0]({ doc: { ...externalDoc, writeable: false } })
    expect(ctx.store.state.currentFile.writeable).toBe(true)

    ctx._hooks.get('SETTING_CHANGED')[0]({ changedKeys: ['editor.external-file-readonly'] })
    expect(ctx.store.state.currentFile.writeable).toBe(false)

    ctx.setting.getSetting.mockReturnValueOnce(false)
    ctx._hooks.get('SETTING_CHANGED')[0]({ changedKeys: ['editor.external-file-readonly'] })
    expect(ctx.store.state.currentFile.writeable).toBe(true)

    ctx.store.state.currentFile = { repo: 'repo', path: '/inside.md', external: false, writeable: true }
    ctx._hooks.get('SETTING_CHANGED')[0]({ changedKeys: ['editor.external-file-readonly'] })
    expect(ctx.store.state.currentFile.writeable).toBe(true)
  })

  test('shows readonly message for external file-not-writable attempts and opens setting action', async () => {
    const ctx = createCtx()
    const closeMessage = vi.fn()
    const showMessage = vi.fn()
    mocks.editor.getContribution.mockReturnValue({ closeMessage, showMessage })

    externalFileReadonly.register(ctx)
    await Promise.all(mocks.whenEditorReady.mock.results.map((result: any) => result.value))

    const openSetting = mocks.editor.addAction.mock.calls[1][0]
    openSetting.run()
    expect(ctx.setting.showSettingPanel).toHaveBeenCalledWith('editor.external-file-readonly')

    await ctx._hooks.get('EDITOR_ATTEMPT_READONLY_EDIT')[0]({
      doc: { repo: 'repo', path: '/outside.md', external: true },
      readonlyType: 'file-not-writable',
    })
    await vi.runAllTimersAsync()

    expect(closeMessage).toHaveBeenCalled()
    expect(showMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        isTrusted: true,
        value: expect.stringContaining('plugin.external-file-readonly.enable-edit'),
      }),
      { lineNumber: 4, column: 2 },
    )

    showMessage.mockClear()
    await ctx._hooks.get('EDITOR_ATTEMPT_READONLY_EDIT')[0]({
      doc: { repo: 'repo', path: '/inside.md', external: false },
      readonlyType: 'file-not-writable',
    })
    await vi.runAllTimersAsync()
    expect(showMessage).not.toHaveBeenCalled()
  })
})
