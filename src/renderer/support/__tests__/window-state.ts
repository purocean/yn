import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: undefined as any,
  isSaved: undefined as any,
  win: undefined as any,
  listeners: new Map<string, Function>(),
  hooks: new Map<string, Function>(),
  isElectron: true,
  isMacOS: true,
  colorScheme: 'light',
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => mocks.hooks.set(name, handler),
  removeHook: (name: string) => mocks.hooks.delete(name),
}))

vi.mock('@fe/support/store', () => ({
  default: {
    get state () { return mocks.storeState },
    getters: {
      get isSaved () { return mocks.isSaved },
    },
  },
}))

vi.mock('@fe/support/env', () => ({
  get isElectron () { return mocks.isElectron },
  get isMacOS () { return mocks.isMacOS },
  get nodeRequire () { return mocks.isElectron },
  getElectronRemote: () => ({
    getCurrentWindow: () => mocks.win,
  }),
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@fe/services/theme', () => ({
  getColorScheme: () => mocks.colorScheme,
}))

import { isWindowAlwaysOnTop, toggleWindowAlwaysOnTop, useWindowState } from '../window-state'

const TestComponent = defineComponent({
  setup () {
    useWindowState()
    return () => h('div')
  },
})

beforeEach(() => {
  mocks.storeState = reactive({
    currentFile: { repo: 'repo', path: '/docs/a.md', name: 'a.md', status: 'saved' },
    isFullscreen: false,
  })
  mocks.isSaved = ref(false)
  mocks.listeners.clear()
  mocks.hooks.clear()
  mocks.isElectron = true
  mocks.isMacOS = true
  mocks.colorScheme = 'light'
  mocks.win = {
    isAlwaysOnTop: vi.fn(() => false),
    setAlwaysOnTop: vi.fn(),
    setTitleBarOverlay: vi.fn(),
    setDocumentEdited: vi.fn(),
    on: vi.fn((name: string, handler: Function) => mocks.listeners.set(name, handler)),
    removeListener: vi.fn((name: string) => mocks.listeners.delete(name)),
  }
  isWindowAlwaysOnTop.value = false
  window.onbeforeunload = null
})

describe('window state', () => {
  test('tracks document and Electron window state without rendering a title bar', async () => {
    const wrapper = mount(TestComponent)

    expect(document.title).toBe('a.md')
    expect(window.documentSaved).toBe(false)
    expect(mocks.win.setDocumentEdited).toHaveBeenCalledWith(true)

    toggleWindowAlwaysOnTop()
    expect(mocks.win.setAlwaysOnTop).toHaveBeenCalledWith(true)

    mocks.win.isAlwaysOnTop.mockReturnValue(true)
    mocks.listeners.get('always-on-top-changed')?.()
    expect(isWindowAlwaysOnTop.value).toBe(true)

    mocks.listeners.get('maximize')?.()
    expect(mocks.win.setAlwaysOnTop).toHaveBeenLastCalledWith(false)

    mocks.listeners.get('enter-full-screen')?.()
    expect(mocks.storeState.isFullscreen).toBe(true)
    expect(mocks.win.setAlwaysOnTop).toHaveBeenLastCalledWith(false)
    mocks.listeners.get('leave-full-screen')?.()
    expect(mocks.storeState.isFullscreen).toBe(false)

    mocks.isSaved.value = true
    await nextTick()
    expect(window.documentSaved).toBe(true)
    expect(mocks.win.setDocumentEdited).toHaveBeenLastCalledWith(false)

    wrapper.unmount()
    expect(mocks.win.removeListener).toHaveBeenCalledWith('maximize', expect.any(Function))
    expect(mocks.win.removeListener).toHaveBeenCalledWith('leave-full-screen', expect.any(Function))
  })

  test('keeps native window controls legible when the app theme changes', () => {
    mocks.isMacOS = false
    const wrapper = mount(TestComponent)

    expect(mocks.win.setTitleBarOverlay).toHaveBeenLastCalledWith({
      color: '#00000000',
      symbolColor: '#151518',
      height: 30,
    })

    mocks.colorScheme = 'dark'
    mocks.hooks.get('THEME_CHANGE')?.()
    expect(mocks.win.setTitleBarOverlay).toHaveBeenLastCalledWith({
      color: '#00000000',
      symbolColor: '#e6e6e6',
      height: 30,
    })

    wrapper.unmount()
    expect(mocks.hooks.has('THEME_CHANGE')).toBe(false)
  })

  test('keeps the browser unsaved-document prompt', () => {
    mocks.isElectron = false
    const wrapper = mount(TestComponent)

    expect(window.onbeforeunload?.({} as BeforeUnloadEvent)).toBe(true)
    mocks.isSaved.value = true
    expect(window.onbeforeunload?.({} as BeforeUnloadEvent)).toBeNull()

    wrapper.unmount()
    expect(window.onbeforeunload).toBeNull()
  })
})
