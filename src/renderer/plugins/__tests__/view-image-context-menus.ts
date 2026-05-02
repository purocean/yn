const mocks = vi.hoisted(() => ({
  copyImageAt: vi.fn(),
  existsFile: vi.fn(),
  openInOS: vi.fn(),
  openPath: vi.fn(),
  showItemInFolder: vi.fn(),
  switchDoc: vi.fn(),
  deleteDoc: vi.fn(),
  replaceValue: vi.fn(),
  getRenderIframe: vi.fn(),
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

import viewImageContextMenus from '../view-image-context-menus'

const DOM_ATTR_NAME = {
  LOCAL_IMAGE: 'data-local-image',
  TARGET_REPO: 'data-target-repo',
  TARGET_PATH: 'data-target-path',
  ORIGIN_SRC: 'data-origin-src',
}

function createCtx (isElectron = false) {
  return {
    api: {
      existsFile: mocks.existsFile,
    },
    args: {
      DOM_ATTR_NAME,
      HELP_REPO_NAME: 'help',
    },
    base: {
      openPath: mocks.openPath,
      showItemInFolder: mocks.showItemInFolder,
    },
    doc: {
      deleteDoc: mocks.deleteDoc,
      openInOS: mocks.openInOS,
      switchDoc: mocks.switchDoc,
    },
    editor: {
      replaceValue: mocks.replaceValue,
    },
    env: {
      isElectron,
      getElectronRemote: vi.fn(() => ({
        getCurrentWebContents: vi.fn(() => ({
          copyImageAt: mocks.copyImageAt,
        })),
      })),
    },
    i18n: {
      t: vi.fn((key: string) => key),
    },
    lib: {
      lodash: {
        escapeRegExp: vi.fn((value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      },
      mime: {
        getType: vi.fn((filePath: string) => filePath.endsWith('.png') ? 'image/png' : 'text/plain'),
      },
    },
    utils: {
      path: {
        basename: vi.fn((filePath: string) => filePath.split('/').pop()),
      },
    },
    view: {
      getRenderIframe: mocks.getRenderIframe,
      tapContextMenus: vi.fn(),
    },
  } as any
}

function createImage (attrs: Record<string, string> = {}) {
  const img = document.createElement('img')
  Object.entries(attrs).forEach(([key, value]) => img.setAttribute(key, value))
  return img
}

function getMenus (ctx: any, target: EventTarget, event: Partial<MouseEvent> = {}) {
  const menus: any[] = []
  ctx.view.tapContextMenus.mock.calls[0][0](menus, {
    target,
    clientX: 7,
    clientY: 11,
    ...event,
  })
  return menus
}

describe('view-image-context-menus plugin', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mocks.copyImageAt.mockClear()
    mocks.existsFile.mockReset()
    mocks.openInOS.mockReset()
    mocks.openPath.mockReset()
    mocks.showItemInFolder.mockReset()
    mocks.switchDoc.mockReset()
    mocks.deleteDoc.mockReset()
    mocks.replaceValue.mockReset()
    mocks.getRenderIframe.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('registers a context menu tap and ignores non-image targets', () => {
    const ctx = createCtx()

    viewImageContextMenus.register(ctx)

    expect(ctx.view.tapContextMenus).toHaveBeenCalledWith(expect.any(Function))
    expect(getMenus(ctx, document.createElement('div'))).toEqual([])
  })

  test('adds local image document actions and deletes the markdown image reference', async () => {
    const ctx = createCtx()
    viewImageContextMenus.register(ctx)
    const img = createImage({
      [DOM_ATTR_NAME.LOCAL_IMAGE]: '1',
      [DOM_ATTR_NAME.TARGET_REPO]: 'repo-a',
      [DOM_ATTR_NAME.TARGET_PATH]: '/assets/photo.png',
      [DOM_ATTR_NAME.ORIGIN_SRC]: './assets/photo.png',
    })

    const menus = getMenus(ctx, img)

    expect(menus.map(menu => menu.id || menu.type)).toEqual([
      'view-image-context-menus-copy-image',
      'view-image-context-menus-open-in-new-tab',
      'separator',
      'view-image-context-menus-delete-image',
      'separator',
      'view-image-context-menu-reveal-in-os',
      'view-image-context-menu-open-in-os',
      'separator',
    ])

    menus[1].onClick()
    expect(mocks.switchDoc).toHaveBeenCalledWith({
      repo: 'repo-a',
      path: '/assets/photo.png',
      type: 'file',
      name: 'photo.png',
    })

    await menus[3].onClick()
    expect(mocks.deleteDoc).toHaveBeenCalledWith({ repo: 'repo-a', path: '/assets/photo.png' })
    expect(mocks.replaceValue).toHaveBeenCalledWith(expect.any(RegExp), '')
    expect('![Img](./assets/photo.png?x=1)'.replace(mocks.replaceValue.mock.calls[0][0], '')).toBe('')
  })

  test('uses fallback absolute image paths when repo lookup fails for reveal and open actions', async () => {
    const ctx = createCtx()
    viewImageContextMenus.register(ctx)
    const img = createImage({
      [DOM_ATTR_NAME.LOCAL_IMAGE]: '1',
      [DOM_ATTR_NAME.TARGET_REPO]: 'repo-a',
      [DOM_ATTR_NAME.TARGET_PATH]: '/tmp/outside.png',
      [DOM_ATTR_NAME.ORIGIN_SRC]: './outside.png',
    })
    mocks.existsFile.mockResolvedValue(false)

    const menus = getMenus(ctx, img)
    await menus[5].onClick()
    await menus[6].onClick()

    expect(mocks.showItemInFolder).toHaveBeenCalledWith('/tmp/outside.png')
    expect(mocks.openPath).toHaveBeenCalledWith('/tmp/outside.png')
    expect(mocks.openInOS).not.toHaveBeenCalled()
  })

  test('falls back to doc open-in-os when the repo file exists and skips help repo actions', async () => {
    const ctx = createCtx()
    viewImageContextMenus.register(ctx)
    mocks.existsFile.mockResolvedValue(true)
    const img = createImage({
      [DOM_ATTR_NAME.LOCAL_IMAGE]: '1',
      [DOM_ATTR_NAME.TARGET_REPO]: 'repo-a',
      [DOM_ATTR_NAME.TARGET_PATH]: '/assets/photo.png',
      [DOM_ATTR_NAME.ORIGIN_SRC]: './assets/photo.png',
    })

    const menus = getMenus(ctx, img)
    await menus[5].onClick()
    await menus[6].onClick()

    expect(mocks.openInOS).toHaveBeenCalledWith({ repo: 'repo-a', path: '/assets/photo.png' }, true)
    expect(mocks.openInOS).toHaveBeenCalledWith({ repo: 'repo-a', path: '/assets/photo.png' })

    const helpMenus = getMenus(ctx, createImage({
      [DOM_ATTR_NAME.LOCAL_IMAGE]: '1',
      [DOM_ATTR_NAME.TARGET_REPO]: 'help',
      [DOM_ATTR_NAME.TARGET_PATH]: '/assets/help.png',
      [DOM_ATTR_NAME.ORIGIN_SRC]: './help.png',
    }))
    expect(helpMenus.map(menu => menu.id)).toEqual(['view-image-context-menus-copy-image'])
  })

  test('copies image at cursor position through Electron webContents', async () => {
    vi.useFakeTimers()
    const ctx = createCtx(true)
    mocks.getRenderIframe.mockResolvedValue({
      getBoundingClientRect: () => ({ left: 10.3, top: 20.4 }),
    })
    viewImageContextMenus.register(ctx)

    getMenus(ctx, createImage())[0].onClick()
    await vi.advanceTimersByTimeAsync(500)

    expect(mocks.copyImageAt).toHaveBeenCalledWith(17, 31)
  })

  test('copies local browser images through canvas and clipboard APIs', async () => {
    const write = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      value: { write },
      configurable: true,
    })
    vi.stubGlobal('ClipboardItem', class {
      items: any

      constructor (items: any) {
        this.items = items
      }
    })
    vi.stubGlobal('FileReader', class {
      result = ''
      onload: (() => void) | null = null
      readAsDataURL () {
        this.result = 'data:image/png;base64,abc'
        this.onload?.()
      }
    })
    vi.stubGlobal('Image', class {
      width = 9
      height = 6
      onload: (() => void) | null = null
      set src (_value: string) {
        Promise.resolve().then(() => this.onload?.())
      }
    })
    vi.stubGlobal('fetch', vi.fn(async () => ({
      blob: async () => new Blob(['raw'], { type: 'image/png' }),
    })))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as any)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb: BlobCallback) {
      cb(new Blob(['png'], { type: 'image/png' }))
    })
    const ctx = createCtx(false)
    viewImageContextMenus.register(ctx)
    const img = createImage({ [DOM_ATTR_NAME.LOCAL_IMAGE]: '1' })
    Object.defineProperty(img, 'src', { value: 'http://localhost/image.png' })

    getMenus(ctx, img)[0].onClick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetch).toHaveBeenCalledWith('http://localhost/image.png')
    expect(write).toHaveBeenCalledWith([expect.objectContaining({ items: expect.any(Object) })])
  })
})
