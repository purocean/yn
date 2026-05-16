const mocks = vi.hoisted(() => ({
  currentFile: null as any,
  getAttachmentURL: vi.fn((doc: any) => `/attachment/${doc.name}`),
  sleep: vi.fn(() => Promise.resolve()),
  viewerInstances: [] as any[],
}))

vi.mock('viewerjs/dist/viewer.css', () => ({}))

vi.mock('viewerjs', () => ({
  default: class FakeViewer {
    bind = vi.fn()
    destroy = vi.fn()
    images = [] as any[]
    navbar = { style: { display: '' } }
    options: any
    unbind = vi.fn()
    update = vi.fn()

    constructor (public element: any, options: any) {
      this.options = options
      mocks.viewerInstances.push(this)
    }

    initList = vi.fn(() => 'initialized')
  },
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: {
      get currentFile () {
        return mocks.currentFile
      },
      set currentFile (value: any) {
        mocks.currentFile = value
      },
    },
  },
}))

vi.mock('@fe/services/base', () => ({
  getAttachmentURL: mocks.getAttachmentURL,
}))

vi.mock('@fe/utils', () => ({
  sleep: mocks.sleep,
}))

import { mount } from '@vue/test-utils'
import imageViewer from '../image-viewer'

function createCtx () {
  const hooks = new Map<string, Function>()
  const viewDom = document.createElement('main')
  return {
    editor: {
      registerCustomEditor: vi.fn(),
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    theme: {
      addStyles: vi.fn(),
    },
    view: {
      addStyles: vi.fn(),
      getViewDom: vi.fn(() => viewDom),
    },
    _hooks: hooks,
    _viewDom: viewDom,
  } as any
}

describe('image-viewer plugin', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mocks.currentFile = null
    mocks.getAttachmentURL.mockClear()
    mocks.sleep.mockClear()
    mocks.viewerInstances.length = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('registers preview hooks, styles, and an image-only custom editor', () => {
    const ctx = createCtx()

    imageViewer.register(ctx)
    const customEditor = ctx.editor.registerCustomEditor.mock.calls[0][0]

    expect(ctx.registerHook).toHaveBeenCalledWith('VIEW_MOUNTED', expect.any(Function))
    expect(ctx.theme.addStyles).toHaveBeenCalledWith(expect.stringContaining('.viewer-backdrop'))
    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('body.viewer-open'), true)
    expect(customEditor).toMatchObject({
      name: 'image-viewer',
      displayName: 'Image Viewer',
      hiddenPreview: true,
    })
    expect(customEditor.when({ doc: { name: 'photo.PNG' } })).toBe(true)
    expect(customEditor.when({ doc: { name: 'vector.svg', plain: true } })).toBe(true)
    expect(customEditor.when({ doc: { name: 'photo.png', plain: true } })).toBe(false)
    expect(customEditor.when({ doc: { name: 'note.md' } })).toBe(false)
    expect(customEditor.when({ doc: null })).toBe(false)
  })

  test('creates a viewer for the rendered preview and updates it after view render', async () => {
    vi.useFakeTimers()
    const ctx = createCtx()

    imageViewer.register(ctx)
    ctx._hooks.get('VIEW_MOUNTED')()
    await vi.runOnlyPendingTimersAsync()

    const viewer = mocks.viewerInstances[0]
    expect(viewer.element).toBe(ctx._viewDom)
    expect(viewer.options.container).toBe(document.body)

    viewer.images = new Array(6).fill({})
    expect(viewer.initList()).toBe('initialized')
    expect(viewer.options.navbar).toBe(false)
    expect(viewer.navbar.style.display).toBe('none')

    const originalElement = viewer.element
    viewer.bind()
    viewer.unbind()
    expect(viewer.element).toBe(originalElement)

    ctx._hooks.get('VIEW_RENDERED')()
    await vi.advanceTimersByTimeAsync(500)
    expect(viewer.update).toHaveBeenCalled()
  })

  test('custom editor component creates and cleans an inline viewer for current image files', async () => {
    const ctx = createCtx()
    mocks.currentFile = { name: 'diagram.svg', path: '/diagram.svg' }
    imageViewer.register(ctx)
    const component = ctx.editor.registerCustomEditor.mock.calls[0][0].component

    const wrapper = mount(component)
    await Promise.resolve()
    await Promise.resolve()

    const viewer = mocks.viewerInstances[0]
    expect(viewer.options.inline).toBe(true)
    expect(viewer.options.navbar).toBe(false)
    expect(viewer.options.url()).toBe('/attachment/diagram.svg')

    wrapper.unmount()
    expect(viewer.destroy).toHaveBeenCalled()
  })

  test('custom editor component skips plain non-svg documents and missing docs', async () => {
    const ctx = createCtx()
    imageViewer.register(ctx)
    const component = ctx.editor.registerCustomEditor.mock.calls[0][0].component

    mocks.currentFile = { name: 'photo.png', plain: true }
    mount(component)
    await Promise.resolve()
    await Promise.resolve()
    expect(mocks.viewerInstances).toHaveLength(0)

    mocks.currentFile = null
    mount(component)
    await Promise.resolve()
    await Promise.resolve()
    expect(mocks.viewerInstances).toHaveLength(0)
  })
})
