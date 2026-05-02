const mocks = vi.hoisted(() => ({
  currentFile: { repo: 'repo-a', path: '/notes/current.md', name: 'current.md' } as any,
  getViewDom: vi.fn(),
  proxyFetch: vi.fn(),
  refreshTree: vi.fn(),
  replaceValue: vi.fn(),
  toast: { show: vi.fn(), hide: vi.fn() },
  upload: vi.fn(),
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/support/api', () => ({
  proxyFetch: mocks.proxyFetch,
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: {
      currentFile: mocks.currentFile,
    },
  },
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: vi.fn(() => mocks.toast),
}))

vi.mock('@fe/services/base', () => ({
  upload: mocks.upload,
}))

vi.mock('@fe/services/editor', () => ({
  replaceValue: mocks.replaceValue,
}))

vi.mock('@fe/services/tree', () => ({
  refreshTree: mocks.refreshTree,
}))

vi.mock('@fe/services/view', () => ({
  getViewDom: mocks.getViewDom,
}))

vi.mock('@fe/utils', () => ({
  encodeMarkdownLink: vi.fn((value: string) => value.replaceAll(' ', '%20')),
  removeQuery: vi.fn((value: string) => value.split('?')[0]),
}))

import imageLocalization from '../image-localization'

const actionName = 'plugin.image-localization.download-all'

function createCtx () {
  const actions = new Map<string, any>()
  const ctx = {
    action: {
      registerAction: vi.fn((action: any) => actions.set(action.name, action)),
      getActionHandler: vi.fn((name: string) => actions.get(name).handler),
    },
    doc: {
      isSameFile: vi.fn(() => true),
    },
    editor: {
      isDefault: vi.fn(() => true),
    },
    i18n: {
      t: vi.fn((key: string) => key),
    },
    statusBar: {
      tapMenus: vi.fn(),
    },
    store: {
      state: {
        currentFile: mocks.currentFile,
      },
    },
    ui: {
      useToast: vi.fn(() => mocks.toast),
    },
    view: {
      getRenderEnv: vi.fn(() => ({ file: mocks.currentFile })),
      tapContextMenus: vi.fn(),
    },
    actions,
  } as any

  return ctx
}

function makeResponse (blobType = 'image/png', headerType = blobType) {
  return {
    blob: vi.fn(async () => new Blob(['image'], { type: blobType })),
    headers: {
      get: vi.fn(() => headerType),
    },
  }
}

describe('image-localization plugin', () => {
  beforeEach(() => {
    mocks.currentFile.repo = 'repo-a'
    mocks.currentFile.path = '/notes/current.md'
    mocks.getViewDom.mockReset()
    mocks.proxyFetch.mockReset()
    mocks.refreshTree.mockReset()
    mocks.replaceValue.mockReset()
    mocks.toast.show.mockReset()
    mocks.toast.hide.mockReset()
    mocks.upload.mockReset()
    mocks.upload.mockResolvedValue('/notes/assets/local image.png')

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as any)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb: BlobCallback) {
      cb(new Blob(['canvas'], { type: 'image/png' }))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('registers mcp action, status-bar menu, and localizable image context menu', () => {
    const ctx = createCtx()
    imageLocalization.register(ctx)

    expect(ctx.action.registerAction).toHaveBeenCalledWith(expect.objectContaining({
      name: actionName,
      forMcp: true,
      when: expect.any(Function),
    }))
    expect(ctx.statusBar.tapMenus).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx.view.tapContextMenus).toHaveBeenCalledWith(expect.any(Function))

    const menus = { 'status-bar-tool': { list: [] as any[] } }
    ctx.statusBar.tapMenus.mock.calls[0][0](menus)
    expect(menus['status-bar-tool'].list[0]).toMatchObject({ id: actionName })

    const img = document.createElement('img')
    img.setAttribute('src', 'https://example.com/image.png')
    const contextMenus: any[] = []
    ctx.view.tapContextMenus.mock.calls[0][0](contextMenus, { target: img })
    expect(contextMenus[0]).toMatchObject({ id: 'plugin.image-localization.single-by-click' })
  })

  test('transforms all data-url images from the preview into local markdown links', async () => {
    const ctx = createCtx()
    imageLocalization.register(ctx)
    const img = document.createElement('img')
    img.setAttribute('src', 'data:image/png;base64,abc')
    Object.defineProperty(img, 'naturalWidth', { value: 10 })
    Object.defineProperty(img, 'naturalHeight', { value: 8 })
    const view = document.createElement('article')
    view.appendChild(img)
    mocks.getViewDom.mockReturnValue(view)

    await ctx.actions.get(actionName).handler()

    expect(mocks.toast.show).toHaveBeenCalledWith('info', '1/1')
    expect(mocks.upload).toHaveBeenCalledWith(expect.any(File), mocks.currentFile)
    expect(mocks.replaceValue).toHaveBeenCalledWith('data:image/png;base64,abc', '/notes/assets/local%20image.png')
    expect(mocks.refreshTree).toHaveBeenCalled()
  })

  test('returns early from transform-all when the preview dom is unavailable', async () => {
    const ctx = createCtx()
    imageLocalization.register(ctx)
    mocks.getViewDom.mockReturnValue(null)

    await ctx.actions.get(actionName).handler()

    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.replaceValue).not.toHaveBeenCalled()
  })

  test('context-menu action localizes remote images and hides loading toast', async () => {
    const ctx = createCtx()
    imageLocalization.register(ctx)
    mocks.proxyFetch.mockResolvedValue(makeResponse('image/png', 'image/png'))
    const img = document.createElement('img')
    img.setAttribute('src', 'https://example.com/photo.jpg?size=1')
    img.setAttribute('headers', '{"Authorization":"Bearer token"}')
    const menus: any[] = []
    ctx.view.tapContextMenus.mock.calls[0][0](menus, { target: img })

    await menus[0].onClick()

    expect(mocks.toast.show).toHaveBeenCalledWith('info', 'Loading……', 0)
    expect(mocks.proxyFetch).toHaveBeenCalledWith('https://example.com/photo.jpg?size=1', {
      headers: { Authorization: 'Bearer token' },
    })
    expect(mocks.upload).toHaveBeenCalledWith(expect.any(File), mocks.currentFile, undefined)
    expect(mocks.replaceValue).toHaveBeenCalledWith('https://example.com/photo.jpg?size=1', '/notes/assets/local%20image.png')
    expect(mocks.refreshTree).toHaveBeenCalled()
    expect(mocks.toast.hide).toHaveBeenCalled()
  })

  test('context-menu action reports non-image responses and ignores non-localizable targets', async () => {
    const ctx = createCtx()
    imageLocalization.register(ctx)
    mocks.proxyFetch.mockResolvedValue(makeResponse('text/plain', 'text/plain'))
    const img = document.createElement('img')
    img.setAttribute('src', 'https://example.com/not-image.txt')
    const menus: any[] = []
    ctx.view.tapContextMenus.mock.calls[0][0](menus, { target: img })

    await menus[0].onClick()

    expect(mocks.toast.show).toHaveBeenCalledWith('warning', 'Not an image')
    expect(mocks.replaceValue).not.toHaveBeenCalled()

    const ignored: any[] = []
    const local = document.createElement('img')
    local.setAttribute('src', '/assets/local.png')
    ctx.view.tapContextMenus.mock.calls[0][0](ignored, { target: local })
    expect(ignored).toEqual([])
  })
})
