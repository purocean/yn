import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  currentFile: null as any,
  getAttachmentURL: vi.fn((doc: any) => `/attachment/${doc.name}`),
  isElectron: false,
  sleep: vi.fn(() => Promise.resolve()),
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: {
      get currentFile () {
        return mocks.currentFile
      },
    },
  },
}))

vi.mock('@fe/services/base', () => ({
  getAttachmentURL: mocks.getAttachmentURL,
}))

vi.mock('@fe/support/env', () => ({
  get isElectron () {
    return mocks.isElectron
  },
}))

vi.mock('@fe/utils', () => ({
  sleep: mocks.sleep,
}))

import mediaPlayer from '../media-player'

function createCtx () {
  const hooks = new Map<string, Function>()
  const viewDom = document.createElement('div')
  const audioNone = document.createElement('audio')
  audioNone.preload = 'none'
  const audioMetadata = document.createElement('audio')
  audioMetadata.preload = 'metadata'
  viewDom.append(audioNone, audioMetadata)
  const ctx = {
    editor: {
      registerCustomEditor: vi.fn(),
    },
    lib: {
      lodash: {
        debounce: vi.fn((fn: Function) => vi.fn(function (this: any, ...args: any[]) {
          return fn.apply(this, args)
        })),
      },
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    view: {
      getViewDom: vi.fn(() => viewDom),
    },
    _audioNone: audioNone,
    _hooks: hooks,
  } as any

  return ctx
}

describe('media-player plugin', () => {
  beforeEach(() => {
    mocks.currentFile = null
    mocks.isElectron = false
    mocks.getAttachmentURL.mockClear()
    mocks.sleep.mockClear()
  })

  test('registers custom editor for audio and video files only', () => {
    const ctx = createCtx()

    mediaPlayer.register(ctx)

    const customEditor = ctx.editor.registerCustomEditor.mock.calls[0][0]
    expect(customEditor).toMatchObject({
      name: 'image-player',
      displayName: 'Image Viewer',
      hiddenPreview: true,
    })
    expect(customEditor.when({ doc: { name: 'clip.mp4' } })).toBe(true)
    expect(customEditor.when({ doc: { name: 'song.mp3' } })).toBe(true)
    expect(customEditor.when({ doc: { name: 'note.md' } })).toBe(false)
    expect(customEditor.when({ doc: { name: 'clip.mp4', plain: true } })).toBe(false)
    expect(customEditor.when({ doc: null })).toBe(false)
  })

  test('renders video, audio, electron file URLs, and pauses detached picture-in-picture media', async () => {
    const ctx = createCtx()
    mediaPlayer.register(ctx)
    const component = ctx.editor.registerCustomEditor.mock.calls[0][0].component

    mocks.currentFile = null
    let wrapper = mount(component)
    await flushPromises()
    expect(wrapper.html()).toBe('')
    wrapper.unmount()

    mocks.currentFile = { name: 'clip.mp4' }
    wrapper = mount(component)
    await flushPromises()
    expect(wrapper.find('video').attributes('src')).toBe('/attachment/clip.mp4')
    wrapper.unmount()

    mocks.currentFile = { name: 'song.mp3' }
    wrapper = mount(component)
    await flushPromises()
    expect(wrapper.find('audio').attributes('src')).toBe('/attachment/song.mp3')
    wrapper.unmount()

    mocks.isElectron = true
    mocks.currentFile = { name: 'local.mp4', absolutePath: '/tmp/local.mp4' }
    wrapper = mount(component)
    await flushPromises()
    const video = wrapper.find('video')
    expect(video.attributes('src')).toBe('file:///tmp/local.mp4')

    const pause = vi.fn()
    const leaveEvent = new Event('leavepictureinpicture')
    Object.defineProperty(leaveEvent, 'target', { value: { isConnected: false, pause } })
    video.element.dispatchEvent(leaveEvent)
    expect(pause).toHaveBeenCalledTimes(1)

    const connectedPause = vi.fn()
    const connectedEvent = new Event('leavepictureinpicture')
    Object.defineProperty(connectedEvent, 'target', { value: { isConnected: true, pause: connectedPause } })
    video.element.dispatchEvent(connectedEvent)
    expect(connectedPause).not.toHaveBeenCalled()
  })

  test('preloads rendered audio only after it intersects and cleans old observers', () => {
    const observers: any[] = []
    class FakeIntersectionObserver {
      callback: Function
      disconnect = vi.fn()
      observe = vi.fn()
      unobserve = vi.fn()

      constructor (callback: Function) {
        this.callback = callback
        observers.push(this)
      }
    }
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    const ctx = createCtx()

    mediaPlayer.register(ctx)
    ctx._hooks.get('VIEW_RENDERED')()

    expect(observers[0].observe).toHaveBeenCalledWith(ctx._audioNone)
    observers[0].callback([{ target: ctx._audioNone, isIntersecting: true }])
    expect(ctx._audioNone.preload).toBe('metadata')
    expect(observers[0].unobserve).toHaveBeenCalledWith(ctx._audioNone)

    ctx._hooks.get('VIEW_RENDERED')()
    expect(observers[0].disconnect).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  test('skips audio observer setup when no audio nodes are rendered', () => {
    const observers: any[] = []
    class FakeIntersectionObserver {
      constructor () {
        observers.push(this)
      }
      disconnect = vi.fn()
      observe = vi.fn()
      unobserve = vi.fn()
    }
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    const ctx = createCtx()
    ctx.view.getViewDom.mockReturnValue(document.createElement('div'))

    mediaPlayer.register(ctx)
    ctx._hooks.get('VIEW_RENDERED')()

    expect(observers).toHaveLength(0)
    vi.unstubAllGlobals()
  })
})
