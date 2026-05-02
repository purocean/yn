const mocks = vi.hoisted(() => ({
  component: null as any,
  confirm: vi.fn(),
  copyText: vi.fn(),
  fetchHttp: vi.fn(),
  getContentHtml: vi.fn(),
  getRenderIframe: vi.fn(),
  options: null as any,
  refValues: [] as any[],
  toast: { show: vi.fn() },
  watch: vi.fn(),
  writeToClipboard: vi.fn(),
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

import copyContent from '../copy-content'

function createToken (attrs: Record<string, string>, children?: any[]) {
  return {
    tag: 'img',
    children,
    attrGet: vi.fn((name: string) => attrs[name]),
  }
}

function createCtx () {
  const actions = new Map<string, any>()
  return {
    action: {
      getActionHandler: vi.fn(() => vi.fn(async () => 'https://cdn.example.com/uploaded.png')),
      registerAction: vi.fn((action: any) => actions.set(action.name, action)),
    },
    api: {
      fetchHttp: mocks.fetchHttp,
    },
    args: {
      DOM_ATTR_NAME: {
        LOCAL_IMAGE: 'data-local-image',
        ORIGIN_SRC: 'data-origin-src',
      },
    },
    base: {
      writeToClipboard: mocks.writeToClipboard,
    },
    i18n: {
      t: vi.fn((key: string, value?: string) => value ? `${key}:${value}` : key),
    },
    keybinding: {
      CtrlCmd: 'CtrlCmd',
      Shift: 'Shift',
      getKeysLabel: vi.fn(() => 'Ctrl+Shift+C'),
    },
    lib: {
      mime: {
        getType: vi.fn(() => 'image/png'),
      },
      vue: {
        defineComponent: vi.fn((component: any) => {
          mocks.component = component
          return component
        }),
        reactive: vi.fn((value: any) => {
          mocks.options = value
          return value
        }),
        ref: vi.fn((value: any) => {
          const ref = { value }
          mocks.refValues.push(ref)
          return ref
        }),
        watch: mocks.watch,
      },
    },
    statusBar: {
      tapMenus: vi.fn(),
    },
    store: {
      state: {
        currentContent: '![Alt](./local image.png)',
      },
    },
    theme: {
      addStyles: vi.fn(),
    },
    ui: {
      useModal: vi.fn(() => ({ confirm: mocks.confirm })),
      useToast: vi.fn(() => mocks.toast),
    },
    utils: {
      copyText: mocks.copyText,
      encodeMarkdownLink: vi.fn((value: string) => value.replaceAll(' ', '%20')),
      fileToBase64URL: vi.fn(async () => 'data:image/png;base64,abc'),
      path: {
        basename: vi.fn((filePath: string) => filePath.split('/').pop()),
      },
      removeQuery: vi.fn((value: string) => value.split('?')[0]),
    },
    view: {
      getContentHtml: mocks.getContentHtml,
      getRenderEnv: vi.fn(() => ({ tokens: [] as any[] })),
      getRenderIframe: mocks.getRenderIframe,
    },
    _actions: actions,
  } as any
}

describe('copy-content plugin', () => {
  beforeEach(() => {
    mocks.component = null
    mocks.confirm.mockReset()
    mocks.confirm.mockResolvedValue(true)
    mocks.copyText.mockReset()
    mocks.fetchHttp.mockReset()
    mocks.fetchHttp.mockResolvedValue({ blob: vi.fn(async () => new Blob(['img'], { type: 'image/png' })) })
    mocks.getContentHtml.mockReset()
    mocks.getContentHtml.mockResolvedValue('<p>selected</p>')
    mocks.getRenderIframe.mockReset()
    mocks.getRenderIframe.mockResolvedValue({
      contentWindow: {
        getSelection: vi.fn(() => ({ toString: () => ' selected text ' })),
      },
    })
    mocks.options = null
    mocks.refValues.length = 0
    mocks.toast.show.mockReset()
    mocks.watch.mockReset()
    mocks.writeToClipboard.mockReset()
  })

  test('registers action, status-bar menu, panel component, and styles', () => {
    const ctx = createCtx()

    copyContent.register(ctx)

    expect(ctx.action.registerAction).toHaveBeenCalledWith(expect.objectContaining({
      name: 'plugin.copy-content.copy-content',
      forMcp: true,
      keys: ['CtrlCmd', 'Shift', 'c'],
    }))
    const menus = { 'status-bar-tool': { list: [] as any[] } }
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)
    expect(menus['status-bar-tool'].list[0]).toMatchObject({
      id: 'plugin.copy-content.copy-content',
      subTitle: 'Ctrl+Shift+C',
    })
    expect(ctx.theme.addStyles).toHaveBeenCalledWith(expect.stringContaining('.copy-content'))
  })

  test('panel watcher keeps inline and upload image options mutually exclusive', () => {
    const ctx = createCtx()
    copyContent.register(ctx)

    mocks.component.setup()
    const watchCallback = mocks.watch.mock.calls[0][1]

    mocks.options.inlineLocalImage = true
    mocks.options.uploadLocalImage = true
    watchCallback({ inlineLocalImage: true, uploadLocalImage: true }, { inlineLocalImage: true, uploadLocalImage: false })
    expect(mocks.options.inlineLocalImage).toBe(false)

    mocks.options.inlineLocalImage = true
    mocks.options.uploadLocalImage = true
    watchCallback({ inlineLocalImage: true, uploadLocalImage: true }, { inlineLocalImage: false, uploadLocalImage: true })
    expect(mocks.options.uploadLocalImage).toBe(false)
  })

  test('copies rich text HTML using the rendered selected content', async () => {
    const ctx = createCtx()
    copyContent.register(ctx)

    await ctx._actions.get('plugin.copy-content.copy-content').handler()

    expect(mocks.getContentHtml).toHaveBeenCalledWith(expect.objectContaining({
      type: 'rt',
      onlySelected: true,
    }))
    expect(mocks.writeToClipboard).toHaveBeenCalledWith('text/html', '<p>selected</p>')
    expect(mocks.toast.show).toHaveBeenCalledWith('info', 'copied')
  })

  test('copies generated HTML as plain text for html mode', async () => {
    const ctx = createCtx()
    copyContent.register(ctx)
    mocks.options.type = 'html'

    await ctx._actions.get('plugin.copy-content.copy-content').handler()

    expect(mocks.copyText).toHaveBeenCalledWith('<p>selected</p>')
    expect(mocks.writeToClipboard).not.toHaveBeenCalled()
  })

  test('transforms markdown local images to inline base64 URLs before copying', async () => {
    const ctx = createCtx()
    ctx.store.state.currentContent = '![Alt](./local%20image.png)'
    const child = createToken({
      'data-local-image': '1',
      'data-origin-src': './local image.png',
      src: 'http://localhost/local.png?cache=1',
    })
    ctx.view.getRenderEnv.mockReturnValue({ tokens: [{ children: [child], tag: 'span', attrGet: vi.fn() }] })
    copyContent.register(ctx)
    mocks.options.type = 'markdown'
    mocks.options.inlineLocalImage = true

    await ctx._actions.get('plugin.copy-content.copy-content').handler()

    expect(mocks.fetchHttp).toHaveBeenCalledWith('http://localhost/local.png?cache=1')
    expect(mocks.copyText).toHaveBeenCalledWith('![Alt](data:image/png;base64,abc)')
  })

  test('uploads markdown local images when upload mode is selected', async () => {
    const ctx = createCtx()
    ctx.store.state.currentContent = '![Alt](./local%20image.png)'
    const img = createToken({
      'data-local-image': '1',
      'data-origin-src': './local image.png',
      src: 'http://localhost/local.png',
    })
    ctx.view.getRenderEnv.mockReturnValue({ tokens: [img] })
    copyContent.register(ctx)
    mocks.options.type = 'markdown'
    mocks.options.uploadLocalImage = true

    await ctx._actions.get('plugin.copy-content.copy-content').handler()

    expect(ctx.action.getActionHandler).toHaveBeenCalledWith('plugin.image-hosting-picgo.upload')
    expect(mocks.copyText).toHaveBeenCalledWith('![Alt](https://cdn.example.com/uploaded.png)')
  })

  test('returns early for markdown copy without content or tokens and ignores cancelled modal', async () => {
    const ctx = createCtx()
    copyContent.register(ctx)
    mocks.options.type = 'markdown'
    ctx.store.state.currentContent = ''

    await ctx._actions.get('plugin.copy-content.copy-content').handler()
    expect(mocks.copyText).toHaveBeenCalledWith(undefined)

    mocks.copyText.mockClear()
    mocks.confirm.mockResolvedValueOnce(false)
    await ctx._actions.get('plugin.copy-content.copy-content').handler()
    expect(mocks.copyText).not.toHaveBeenCalled()
  })

  test('reports copy errors as warnings', async () => {
    const ctx = createCtx()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    copyContent.register(ctx)
    mocks.getContentHtml.mockRejectedValue(new Error('render failed'))

    await ctx._actions.get('plugin.copy-content.copy-content').handler()

    expect(errorSpy).toHaveBeenCalled()
    expect(mocks.toast.show).toHaveBeenCalledWith('warning', 'render failed')
  })
})
