vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

import historyStack from '../history-stack'

function createCtx () {
  const hooks = new Map<string, Function[]>()
  const actions = new Map<string, Function>()
  const ctx = {
    action: {
      registerAction: vi.fn((action: any) => actions.set(action.name, action.handler)),
      getActionHandler: vi.fn((name: string) => actions.get(name)),
    },
    doc: {
      isSameFile: vi.fn((a: any, b: any) => a?.repo === b?.repo && a?.path === b?.path),
      isSubOrSameFile: vi.fn((a: any, b: any) => !!a && !!b && a.repo === b.repo && b.path.startsWith(a.path)),
      switchDoc: vi.fn(() => Promise.resolve()),
    },
    editor: {
      getEditor: vi.fn(() => ({ getScrollTop: vi.fn(() => 22) })),
    },
    i18n: { t: vi.fn((key: string, arg?: string) => arg ? `${key}:${arg}` : key) },
    keybinding: {
      Alt: 'Alt',
      BracketLeft: '[',
      BracketRight: ']',
      getKeysLabel: vi.fn((id: string) => `keys:${id}`),
    },
    lib: {
      lodash: {
        isEqual: (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b),
      },
    },
    registerHook: vi.fn((name: string, fn: Function) => {
      hooks.set(name, [...(hooks.get(name) || []), fn])
    }),
    routines: {
      changePosition: vi.fn(),
    },
    statusBar: {
      refreshMenu: vi.fn(),
      tapMenus: vi.fn(),
    },
    store: {
      state: {
        currentFile: null,
      },
    },
    utils: {
      getLogger: vi.fn(() => ({ debug: vi.fn() })),
    },
    view: {
      getScrollTop: vi.fn(() => 11),
    },
    workbench: {
      ControlCenter: {
        refresh: vi.fn(),
        tapSchema: vi.fn(),
      },
    },
    actions,
    hooks,
  } as any

  return ctx
}

const docA = { type: 'file', repo: 'repo', name: 'a.md', path: '/a.md' }
const docB = { type: 'file', repo: 'repo', name: 'b.md', path: '/b.md' }

describe('history-stack plugin', () => {
  test('registers document hooks, actions, status menu, and control-center schema', () => {
    const ctx = createCtx()

    historyStack.register(ctx)

    expect(ctx.registerHook.mock.calls.map(([name]: any[]) => name)).toEqual([
      'DOC_PRE_SWITCH',
      'DOC_SWITCHED',
      'DOC_SWITCH_SKIPPED',
      'DOC_DELETED',
      'DOC_MOVED',
      'DOC_SWITCH_FAILED',
      'STARTUP',
    ])
    expect(ctx.action.registerAction.mock.calls.map(([action]: any[]) => action.name)).toEqual([
      'plugin.document-history-stack.back',
      'plugin.document-history-stack.forward',
    ])
    expect(ctx.workbench.ControlCenter.tapSchema).toHaveBeenCalledWith(expect.any(Function))
  })

  test('records switched docs and action handlers navigate backward and forward', async () => {
    const ctx = createCtx()
    historyStack.register(ctx)

    ctx.hooks.get('DOC_SWITCHED')[0]({ doc: docA, opts: {} })
    ctx.hooks.get('DOC_SWITCHED')[0]({ doc: docB, opts: {} })
    ctx.actions.get('plugin.document-history-stack.back')()
    await Promise.resolve()

    expect(ctx.doc.switchDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/a.md' }),
      { source: 'history-stack', position: null },
    )

    ctx.actions.get('plugin.document-history-stack.forward')()
    await Promise.resolve()

    expect(ctx.doc.switchDoc).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: '/b.md' }),
      { source: 'history-stack', position: null },
    )
  })

  test('saves scroll position before switch and restores it for later doc switches', () => {
    const ctx = createCtx()
    historyStack.register(ctx)

    ctx.store.state.currentFile = docA
    ctx.hooks.get('DOC_SWITCHED')[0]({ doc: docA, opts: {} })
    ctx.hooks.get('DOC_PRE_SWITCH')[0]()
    ctx.hooks.get('DOC_SWITCHED')[0]({ doc: docB, opts: {} })
    ctx.hooks.get('DOC_SWITCHED')[0]({ doc: docA, opts: {} })

    expect(ctx.routines.changePosition).toHaveBeenCalledWith({ viewScrollTop: 11, editorScrollTop: 22 })
  })

  test('startup and control-center items expose disabled state from stack position', () => {
    const ctx = createCtx()
    historyStack.register(ctx)
    const menus = { 'status-bar-navigation': { list: [] as any[] } }
    const schema = { navigation: { items: [] as any[] } }

    ctx.hooks.get('STARTUP')[0]()
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)
    ctx.workbench.ControlCenter.tapSchema.mock.calls[0][0](schema)

    expect(menus['status-bar-navigation'].list.map(item => item.disabled)).toEqual([true, true])
    expect(schema.navigation.items.map(item => item.disabled)).toEqual([true, true])
  })
})
