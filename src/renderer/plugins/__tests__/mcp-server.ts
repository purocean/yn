import mcpServer from '../mcp-server'

function createCtx () {
  const actions: any[] = []
  const hooks = new Map<string, Function>()
  const schema = { properties: {} as Record<string, any> }
  const ctx = {
    action: {
      registerAction: vi.fn((action: any) => actions.push(action)),
    },
    i18n: {
      t: vi.fn((key: string) => `T_${key}`),
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    setting: {
      changeSchema: vi.fn((fn: Function) => fn(schema)),
      getSetting: vi.fn((_key: string, fallback: any) => fallback),
    },
    utils: {
      copyText: vi.fn(),
    },
    _actions: actions,
    _hooks: hooks,
    _schema: schema,
  } as any

  return ctx
}

function setUrl (url: string) {
  window.history.pushState({}, '', url)
}

describe('mcp-server plugin', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  test('registers copy endpoint action using explicit query port', () => {
    const ctx = createCtx()
    setUrl('/?port=3456')

    mcpServer.register(ctx)
    ctx._actions[0].handler()

    expect(ctx.action.registerAction).toHaveBeenCalledWith(expect.objectContaining({
      name: 'plugin.mcp-server.copy-endpoint',
      description: 'T_copy',
    }))
    expect(ctx.utils.copyText).toHaveBeenCalledWith('http://127.0.0.1:3456/api/mcp/message')
  })

  test('derives endpoint from location port when no explicit query port exists', () => {
    const ctx = createCtx()
    setUrl('/')

    mcpServer.register(ctx)
    ctx._actions[0].handler()
    expect(ctx.utils.copyText).toHaveBeenCalledWith('http://127.0.0.1:3000/api/mcp/message')
  })

  test('adds setting schema before showing the setting panel', () => {
    const ctx = createCtx()

    mcpServer.register(ctx)
    ctx._hooks.get('SETTING_PANEL_BEFORE_SHOW')()

    expect(ctx._schema.properties['mcp.enabled']).toMatchObject({
      defaultValue: false,
      title: 'T_plugin-mcp-server.enable',
      type: 'boolean',
      group: 'other',
      format: 'checkbox',
      required: true,
    })
  })

  test('appends endpoint link after showing setting panel and avoids duplicates', () => {
    const ctx = createCtx()
    setUrl('/?port=4567')
    const label = document.createElement('label')
    const editor = {
      getEditor: vi.fn((key: string) => key === 'root.mcp.enabled' ? { label } : null),
    }

    mcpServer.register(ctx)
    ctx._hooks.get('SETTING_PANEL_AFTER_SHOW')({ editor })
    ctx._hooks.get('SETTING_PANEL_AFTER_SHOW')({ editor })

    expect(editor.getEditor).toHaveBeenCalledWith('root.mcp.enabled')
    expect(label.querySelectorAll('.setting-mcp-endpoint')).toHaveLength(1)
    expect(label.textContent).toContain('http://127.0.0.1:4567/api/mcp/message')

    const link = label.querySelector('.setting-mcp-endpoint') as HTMLAnchorElement
    expect(link.textContent).toBe('T_copy')
    expect(link.title).toBe('T_click-to-copy')
    expect(link.href).toContain("ctx.action.getActionHandler('plugin.mcp-server.copy-endpoint')")
  })

  test('does not append endpoint link when setting editor label is missing', () => {
    const ctx = createCtx()
    const editor = { getEditor: vi.fn(() => null) }

    mcpServer.register(ctx)
    expect(() => ctx._hooks.get('SETTING_PANEL_AFTER_SHOW')({ editor })).not.toThrow()
  })
})
