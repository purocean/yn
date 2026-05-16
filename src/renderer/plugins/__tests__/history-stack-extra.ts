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

describe('history-stack plugin extra branches', () => {
  test('does not navigate past stack boundaries or record history-stack switches', async () => {
    const ctx = createCtx()
    historyStack.register(ctx)

    ctx.actions.get('plugin.document-history-stack.back')()
    ctx.hooks.get('DOC_SWITCHED')![0]({ doc: docA, opts: { source: 'history-stack' } })
    ctx.actions.get('plugin.document-history-stack.forward')()
    await Promise.resolve()

    expect(ctx.doc.switchDoc).not.toHaveBeenCalled()
  })

  test('ignores switch events without a doc and without a fallback current file', () => {
    const ctx = createCtx()
    historyStack.register(ctx)

    ctx.hooks.get('DOC_SWITCHED')![0]({ doc: null, opts: {} })
    ctx.actions.get('plugin.document-history-stack.back')()

    expect(ctx.workbench.ControlCenter.refresh).not.toHaveBeenCalled()
    expect(ctx.doc.switchDoc).not.toHaveBeenCalled()
  })

  test('records in-page skipped switches, dedupes equal positions, and removes failed docs', async () => {
    const ctx = createCtx()
    historyStack.register(ctx)
    const position = { anchor: 'same' }

    ctx.hooks.get('DOC_SWITCH_SKIPPED')![0]({ doc: docA, opts: { position } })
    ctx.hooks.get('DOC_SWITCH_SKIPPED')![0]({ doc: docA, opts: { position: { anchor: 'same' } } })
    ctx.hooks.get('DOC_SWITCH_SKIPPED')![0]({ doc: docA, opts: { position: { anchor: 'next' } } })
    ctx.actions.get('plugin.document-history-stack.back')()
    await Promise.resolve()

    expect(ctx.doc.switchDoc).toHaveBeenCalledWith(expect.objectContaining({ path: '/a.md' }), {
      source: 'history-stack',
      position,
    })

    ctx.hooks.get('DOC_SWITCH_FAILED')![0]({ doc: docA })
    ctx.doc.switchDoc.mockClear()
    ctx.actions.get('plugin.document-history-stack.forward')()
    await Promise.resolve()
    expect(ctx.doc.switchDoc).not.toHaveBeenCalled()
  })

  test('removes deleted and moved docs and clamps the current index', async () => {
    const ctx = createCtx()
    historyStack.register(ctx)

    ctx.hooks.get('DOC_SWITCHED')![0]({ doc: docA, opts: {} })
    ctx.hooks.get('DOC_SWITCHED')![0]({ doc: docB, opts: {} })
    ctx.hooks.get('DOC_DELETED')![0]({ doc: docB })
    ctx.actions.get('plugin.document-history-stack.back')()
    await Promise.resolve()
    expect(ctx.doc.switchDoc).not.toHaveBeenCalled()

    ctx.hooks.get('DOC_MOVED')![0]({ oldDoc: docA })
    const menus = { 'status-bar-navigation': { list: [] as any[] } }
    ctx.hooks.get('STARTUP')![0]()
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)
    expect(menus['status-bar-navigation'].list.map((item: any) => item.disabled)).toEqual([true, true])
  })
})
