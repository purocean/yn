import customStyles from '../custom-styles'

function createCtx (demo = false) {
  const hooks = new Map<string, Function[]>()
  const renderStyle = document.createElement('style')
  const schema = {
    properties: {
      'custom-css': {
        enum: [] as string[],
        options: { enum_titles: [] as string[] },
      },
    },
  }
  const editorInput = document.createElement('textarea')
  const settingEditor = {
    getEditor: vi.fn((key: string) => key === 'root.render.extra-css-style'
      ? {
          input: editorInput,
          getValue: vi.fn(() => '.watch { color: red; }'),
        }
      : null),
    watch: vi.fn(),
  }

  const ctx = {
    api: {
      fetchCustomStyles: vi.fn(() => Promise.resolve(['alpha.css', 'beta.css'])),
    },
    args: {
      FLAG_DEMO: demo,
    },
    base: {
      reloadMainWindow: vi.fn(),
    },
    i18n: {
      t: vi.fn((key: string) => key),
    },
    lib: {
      lodash: {
        debounce: vi.fn((fn: Function) => {
          const debounced = vi.fn((...args: any[]) => fn(...args))
          return debounced
        }),
      },
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    setting: {
      changeSchema: vi.fn((fn: Function) => fn(schema)),
      getSetting: vi.fn((_key: string, fallback: any) => fallback),
    },
    theme: {
      getThemeStyles: vi.fn(() => [
        { name: 'Alpha', css: 'alpha.css' },
        { name: 'Beta', css: 'beta.css' },
      ]),
      registerThemeStyle: vi.fn(),
      removeThemeStyle: vi.fn(),
    },
    ui: {
      useModal: vi.fn(() => ({ confirm: vi.fn(() => Promise.resolve(true)) })),
    },
    utils: {
      sleep: vi.fn(() => Promise.resolve()),
    },
    view: {
      addStyleLink: vi.fn(),
      addStyles: vi.fn(() => Promise.resolve(renderStyle)),
    },
    _editorInput: editorInput,
    _hooks: hooks,
    _renderStyle: renderStyle,
    _schema: schema,
    _settingEditor: settingEditor,
  } as any

  return ctx
}

describe('custom-styles plugin', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('startup injects custom css link and demo mode adds github render style only', () => {
    const ctx = createCtx(true)
    const fakeHead = { appendChild: vi.fn() }
    vi.spyOn(document, 'getElementsByTagName').mockReturnValueOnce([fakeHead] as any)

    customStyles.register(ctx)
    ctx._hooks.get('STARTUP')()

    const link = fakeHead.appendChild.mock.calls[0][0] as HTMLLinkElement
    expect(link).toMatchObject({
      id: 'custom-css',
      rel: 'stylesheet',
      type: 'text/css',
    })
    expect(link.getAttribute('href')).toBe('/github.css')
    expect(ctx.view.addStyleLink).toHaveBeenCalledWith('/github.css')
    expect(Array.from(ctx._hooks.keys())).toEqual(['STARTUP'])
  })

  test('setting panel refreshes custom theme styles and schema enum values', async () => {
    const ctx = createCtx()

    customStyles.register(ctx)
    await ctx._hooks.get('SETTING_PANEL_BEFORE_SHOW')()

    expect(ctx.theme.removeThemeStyle).toHaveBeenCalledWith(expect.any(Function))
    const predicate = ctx.theme.removeThemeStyle.mock.calls[0][0]
    expect(predicate({ from: 'custom' })).toBe(true)
    expect(predicate({ from: 'built-in' })).toBe(false)
    expect(ctx.theme.registerThemeStyle.mock.calls.map(([style]: any[]) => style)).toEqual([
      { from: 'custom', name: 'alpha.css', css: 'alpha.css' },
      { from: 'custom', name: 'beta.css', css: 'beta.css' },
    ])
    expect(ctx._schema.properties['custom-css'].enum).toEqual(['alpha.css', 'beta.css'])
    expect(ctx._schema.properties['custom-css'].options.enum_titles).toEqual(['Alpha', 'Beta'])
  })

  test('setting changes reload main window or update render extra style', async () => {
    const ctx = createCtx()

    customStyles.register(ctx)
    await ctx._hooks.get('SETTING_CHANGED')({ changedKeys: ['custom-css'] })
    expect(ctx.base.reloadMainWindow).toHaveBeenCalled()

    ctx.setting.getSetting.mockReturnValueOnce('.preview { color: blue; }')
    await ctx._hooks.get('SETTING_CHANGED')({ changedKeys: ['render.extra-css-style'] })
    expect(ctx.view.addStyles).toHaveBeenCalledWith('.preview { color: blue; }')

    ctx.setting.getSetting.mockReturnValueOnce('.preview { color: green; }')
    await ctx._hooks.get('SETTING_CHANGED')({ changedKeys: ['render.extra-css-style'] })
    expect(ctx._renderStyle.textContent).toBe('.preview { color: green; }')
  })

  test('setting panel editor input and close hooks preview and restore render extra style', async () => {
    const ctx = createCtx()

    customStyles.register(ctx)
    ctx._hooks.get('SETTING_PANEL_AFTER_SHOW')({ editor: ctx._settingEditor })

    ctx._editorInput.value = '.input { color: red; }'
    ctx._editorInput.dispatchEvent(new Event('input'))
    await Promise.resolve()
    expect(ctx.view.addStyles).toHaveBeenCalledWith('.input { color: red; }')

    const watchHandler = ctx._settingEditor.watch.mock.calls[0][1]
    watchHandler()
    await Promise.resolve()
    expect(ctx._renderStyle.textContent).toBe('.watch { color: red; }')

    ctx.setting.getSetting.mockReturnValueOnce('.saved { color: red; }')
    await ctx._hooks.get('SETTING_PANEL_BEFORE_CLOSE')()
    expect(ctx.utils.sleep).toHaveBeenCalledWith(100)
    expect(ctx._renderStyle.textContent).toBe('.saved { color: red; }')
  })
})
