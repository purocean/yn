import { nextTick, reactive } from 'vue'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: undefined as any,
  isElectron: true,
  hooks: new Map<string, Function>(),
  fileTabsMounts: 0,
  resizeCallback: undefined as (() => void) | undefined,
  observe: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('@fe/support/store', () => ({
  default: {
    get state () { return mocks.storeState },
  },
}))

vi.mock('@fe/support/env', () => ({
  get isElectron () { return mocks.isElectron },
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => mocks.hooks.set(name, handler),
  removeHook: (name: string) => mocks.hooks.delete(name),
}))

vi.mock('../FileTabs.vue', () => ({
  default: {
    name: 'FileTabs',
    created: () => { mocks.fileTabsMounts++ },
    template: '<div class="file-tabs-stub">tabs</div>',
  },
}))

import TitleBarTabs from '../TitleBarTabs.vue'
import { setTitleBarTabsLeft, titleBarTabsContainer } from '@fe/support/title-bar'

beforeEach(() => {
  document.body.innerHTML = ''
  mocks.storeState = reactive({ isFullscreen: false, showSide: true })
  mocks.isElectron = true
  mocks.hooks.clear()
  mocks.fileTabsMounts = 0
  mocks.resizeCallback = undefined
  mocks.observe.mockReset()
  mocks.disconnect.mockReset()
  titleBarTabsContainer.value = null
  setTitleBarTabsLeft(0)

  vi.stubGlobal('ResizeObserver', class {
    constructor (callback: () => void) {
      mocks.resizeCallback = callback
    }

    observe = mocks.observe
    disconnect = mocks.disconnect
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TitleBarTabs', () => {
  test('teleports one FileTabs instance and reports the layout anchor position', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)

    const wrapper = mount(TitleBarTabs, { attachTo: document.body })
    await nextTick()

    expect(wrapper.find('.file-tabs-stub').exists()).toBe(true)
    titleBarTabsContainer.value = target
    await nextTick()

    expect(target.querySelectorAll('.file-tabs-stub')).toHaveLength(1)
    expect(mocks.fileTabsMounts).toBe(1)
    expect(wrapper.find('.file-tabs-stub').exists()).toBe(false)
    expect(mocks.hooks.has('GLOBAL_RESIZE')).toBe(true)
    expect(mocks.observe).toHaveBeenCalledWith(wrapper.find('.title-bar-tabs-anchor').element)

    const anchor = wrapper.find('.title-bar-tabs-anchor').element as HTMLElement
    anchor.getBoundingClientRect = () => ({ left: 320 } as DOMRect)
    mocks.resizeCallback?.()
    expect(target.style.getPropertyValue('--tabs-left')).toBe('320px')

    mocks.storeState.isFullscreen = true
    await nextTick()
    expect(wrapper.find('.file-tabs-stub').exists()).toBe(false)
    expect(target.querySelectorAll('.file-tabs-stub')).toHaveLength(1)
    expect(mocks.fileTabsMounts).toBe(1)

    wrapper.unmount()
    expect(mocks.hooks.has('GLOBAL_RESIZE')).toBe(false)
    expect(mocks.disconnect).toHaveBeenCalled()
  })

  test('keeps file tabs in the normal layout in browser mode', async () => {
    mocks.isElectron = false
    const target = document.createElement('div')
    document.body.appendChild(target)
    titleBarTabsContainer.value = target

    const wrapper = mount(TitleBarTabs)
    await nextTick()

    expect(wrapper.find('.file-tabs-stub').exists()).toBe(true)
    expect(target.querySelector('.file-tabs-stub')).toBeNull()
    expect(mocks.hooks.has('GLOBAL_RESIZE')).toBe(false)
  })
})
