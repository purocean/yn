vi.mock('@fe/context', () => ({
  Ctx: class {},
  Plugin: class {},
}))

vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: {
    LOCAL_IMAGE: 'data-local-image',
    ORIGIN_SRC: 'data-origin-src',
    TARGET_REPO: 'data-target-repo',
  },
  FLAG_DEMO: false,
}))

import imageHostingPicgo from '../image-hosting-picgo'

const settingKeyUrl = 'plugin.image-hosting-picgo.server-url'
const settingKeyPaste = 'plugin.image-hosting-picgo.enable-paste-image'
const uploadActionName = 'plugin.image-hosting-picgo.upload'

function createCtx () {
  const actions = new Map<string, any>()
  const hooks = new Map<string, Function>()
  const toast = { show: vi.fn(), hide: vi.fn() }
  const editorAction = { addAction: vi.fn() }
  const settings: Record<string, any> = {
    [settingKeyUrl]: 'http://127.0.0.1:36677/upload',
    [settingKeyPaste]: false,
  }
  const schema = { properties: {} as Record<string, any> }
  const ctx = {
    action: {
      registerAction: vi.fn((action: any) => actions.set(action.name, action.handler)),
      getActionHandler: vi.fn((name: string) => actions.get(name)),
    },
    api: {
      deleteTmpFile: vi.fn(),
      fetchHttp: vi.fn(async () => new Response(new Blob(['image'], { type: 'image/png' }))),
      proxyFetch: vi.fn(async () => ({ json: async () => ({ result: ['https://cdn.example.com/image.png'] }) })),
      writeTmpFile: vi.fn(async () => ({ data: { path: '/tmp/picgo-image.png' } })),
    },
    args: {
      DOM_ATTR_NAME: {
        LOCAL_IMAGE: 'data-local-image',
        ORIGIN_SRC: 'data-origin-src',
      },
      HELP_REPO_NAME: 'help',
    },
    doc: {
      createCurrentDocChecker: vi.fn(() => ({ throwErrorIfChanged: vi.fn() })),
      isSameFile: vi.fn(() => true),
    },
    editor: {
      insert: vi.fn(),
      isDefault: vi.fn(() => true),
      replaceValue: vi.fn(),
      whenEditorReady: vi.fn(() => Promise.resolve({ editor: editorAction })),
    },
    i18n: {
      t: vi.fn((key: string) => key),
    },
    lib: {
      mime: {
        getType: vi.fn(() => 'image/png'),
      },
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    setting: {
      changeSchema: vi.fn((fn: Function) => fn(schema)),
      getSettings: vi.fn(() => settings),
      showSettingPanel: vi.fn(),
    },
    statusBar: {
      tapMenus: vi.fn(),
    },
    store: {
      state: {
        currentFile: { repo: 'repo-a', path: '/notes/current.md' },
      },
    },
    ui: {
      useToast: vi.fn(() => toast),
    },
    utils: {
      encodeMarkdownLink: vi.fn((value: string) => value.replaceAll(' ', '%20')),
      fileToBase64URL: vi.fn(async () => 'data:image/png;base64,ZmFrZQ=='),
      getLogger: vi.fn(() => ({ debug: vi.fn() })),
      path: {
        basename: vi.fn((path: string) => path.split('/').pop()),
      },
      removeQuery: vi.fn((value: string) => value.split('?')[0]),
    },
    view: {
      getRenderEnv: vi.fn(() => ({ file: { repo: 'repo-a', path: '/notes/current.md' } })),
      tapContextMenus: vi.fn(),
    },
    actions,
    editorAction,
    hooks,
    schema,
    settings,
    toast,
  } as any

  return ctx
}

describe('image-hosting-picgo plugin', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('registers settings, upload action, paste hook, editor action, and menus', async () => {
    const ctx = createCtx()

    imageHostingPicgo.register(ctx)
    await Promise.resolve()

    expect(ctx.schema.properties[settingKeyUrl]).toMatchObject({ type: 'string', group: 'image' })
    expect(ctx.schema.properties[settingKeyPaste]).toMatchObject({ type: 'boolean', format: 'checkbox' })
    expect(ctx.actions.has(uploadActionName)).toBe(true)
    expect(ctx.registerHook).toHaveBeenCalledWith('EDITOR_PASTE_IMAGE', expect.any(Function))
    expect(ctx.editor.whenEditorReady).toHaveBeenCalled()
    expect(ctx.statusBar.tapMenus).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx.view.tapContextMenus).toHaveBeenCalledWith(expect.any(Function))
  })

  test('uploads through remote multipart mode and reports failures', async () => {
    const ctx = createCtx()
    ctx.settings[settingKeyUrl] = 'https://picgo.example/upload?key=secret'
    imageHostingPicgo.register(ctx)
    const file = new File(['x'], 'remote.png', { type: 'image/png' })

    await expect(ctx.actions.get(uploadActionName)(file)).resolves.toBe('https://cdn.example.com/image.png')
    expect(ctx.api.proxyFetch).toHaveBeenCalledWith('https://picgo.example/upload?key=secret', {
      method: 'post',
      body: expect.any(FormData),
    })

    ctx.api.proxyFetch.mockRejectedValueOnce(new Error('down'))
    await expect(ctx.actions.get(uploadActionName)(file)).rejects.toThrow('picgo.upload-failed')
  })

  test('uploads through local tmp-file mode and always cleans tmp files', async () => {
    const ctx = createCtx()
    imageHostingPicgo.register(ctx)
    const file = new File(['x'], 'local.png', { type: 'image/png' })

    await expect(ctx.actions.get(uploadActionName)(file)).resolves.toBe('https://cdn.example.com/image.png')

    expect(ctx.api.writeTmpFile).toHaveBeenCalledWith('picgo-local.png', 'data:image/png;base64,ZmFrZQ==', true)
    expect(ctx.api.proxyFetch).toHaveBeenCalledWith('http://127.0.0.1:36677/upload', {
      method: 'post',
      body: { list: ['/tmp/picgo-image.png'] },
      jsonBody: true,
    })
    expect(ctx.api.deleteTmpFile).toHaveBeenCalledWith('picgo-local.png')

    ctx.api.writeTmpFile.mockRejectedValueOnce(new Error('disk full'))
    await expect(ctx.actions.get(uploadActionName)(file)).rejects.toThrow('picgo.upload-failed')
    expect(ctx.api.deleteTmpFile).toHaveBeenCalledTimes(2)
  })

  test('warns and opens settings when upload url is empty', async () => {
    const ctx = createCtx()
    ctx.settings[settingKeyUrl] = ''
    imageHostingPicgo.register(ctx)

    await expect(ctx.actions.get(uploadActionName)(new File(['x'], 'empty.png'))).rejects.toThrow('picgo.need-api')

    expect(ctx.setting.showSettingPanel).toHaveBeenCalled()
    expect(ctx.toast.show).toHaveBeenCalledWith('warning', 'picgo.need-api')
  })

  test('handles paste image only when enabled and inserts uploaded markdown', async () => {
    const ctx = createCtx()
    imageHostingPicgo.register(ctx)
    const pasteHook = ctx.hooks.get('EDITOR_PASTE_IMAGE')
    const file = new File(['x'], 'pasted.png')

    await expect(pasteHook({ file })).resolves.toBe(false)

    ctx.settings[settingKeyPaste] = true
    await expect(pasteHook({ file })).resolves.toBe(true)

    expect(ctx.editor.insert).toHaveBeenCalledWith('![Img](https://cdn.example.com/image.png)\n')
  })

  test('adds visible menus only for the active markdown preview and uploads all local image tokens', async () => {
    const ctx = createCtx()
    const localImageToken = {
      tag: 'img',
      children: undefined,
      attrGet: vi.fn((name: string) => ({
        'data-local-image': 'true',
        src: '/api/file/assets/a.png',
        'data-origin-src': 'assets/a.png?raw=1',
      } as any)[name]),
    }
    const parentToken = { children: [localImageToken], attrGet: vi.fn(), tag: 'p' }
    ctx.view.getRenderEnv.mockReturnValue({
      file: { repo: 'repo-a', path: '/notes/current.md' },
      tokens: [parentToken],
    })
    imageHostingPicgo.register(ctx)
    await Promise.resolve()
    const menus = {
      'status-bar-insert': { list: [] as any[] },
      'status-bar-tool': { list: [] as any[] },
    }

    ctx.statusBar.tapMenus.mock.calls[0][0](menus)
    await menus['status-bar-tool'].list[0].onClick()

    expect(menus['status-bar-insert'].list[0].id).toBe('plugin.image-hosting-picgo.add-image')
    expect(ctx.api.fetchHttp).toHaveBeenCalledWith('/api/file/assets/a.png')
    expect(ctx.editor.replaceValue).toHaveBeenCalledWith('assets/a.png?raw=1', 'https://cdn.example.com/image.png')

    ctx.doc.isSameFile.mockReturnValue(false)
    const hiddenMenus = {
      'status-bar-insert': { list: [] as any[] },
      'status-bar-tool': { list: [] as any[] },
    }
    ctx.statusBar.tapMenus.mock.calls[0][0](hiddenMenus)
    expect(hiddenMenus['status-bar-insert'].list).toEqual([])
    expect(hiddenMenus['status-bar-tool'].list).toEqual([])
  })

  test('adds context-menu upload for local preview images and replaces markdown link', async () => {
    const ctx = createCtx()
    imageHostingPicgo.register(ctx)
    const tap = ctx.view.tapContextMenus.mock.calls[0][0]
    const img = document.createElement('img')
    img.setAttribute('data-local-image', 'true')
    img.setAttribute('data-origin-src', 'assets/my photo.png')
    img.setAttribute('src', '/api/file/assets/my%20photo.png')
    const menus: any[] = []

    tap(menus, { target: img })
    await menus[0].onClick()

    expect(menus[0].id).toBe('plugin.image-hosting-picgo.upload-single-image')
    expect(ctx.api.fetchHttp).toHaveBeenCalledWith('/api/file/assets/my%20photo.png')
    expect(ctx.editor.replaceValue).toHaveBeenCalledWith('assets/my%20photo.png', 'https://cdn.example.com/image.png')

    img.setAttribute('data-target-repo', 'help')
    const ignored: any[] = []
    tap(ignored, { target: img })
    expect(ignored).toEqual([])
  })

  test('context-menu upload reports errors without replacing markdown', async () => {
    const ctx = createCtx()
    imageHostingPicgo.register(ctx)
    const tap = ctx.view.tapContextMenus.mock.calls[0][0]
    const img = document.createElement('img')
    img.setAttribute('data-local-image', 'true')
    img.setAttribute('data-origin-src', 'assets/missing.png')
    img.setAttribute('src', '/api/file/assets/missing.png')
    const menus: any[] = []

    tap(menus, { target: img })
    ctx.store.state.currentFile = null
    await menus[0].onClick()

    expect(ctx.toast.show).toHaveBeenCalledWith('warning', 'No file opened.')
    expect(ctx.editor.replaceValue).not.toHaveBeenCalled()
  })
})
