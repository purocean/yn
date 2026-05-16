import { reactive, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: undefined as any,
  setContainerDom: vi.fn(),
  emitResize: vi.fn(),
  toggleEditor: vi.fn((val: boolean) => { mocks.storeState.showEditor = val }),
  toggleSide: vi.fn((val: boolean) => { mocks.storeState.showSide = val }),
  toggleView: vi.fn((val: boolean) => { mocks.storeState.showView = val }),
  toggleContentRightSide: vi.fn((val: boolean) => { mocks.storeState.showContentRightSide = val }),
  toggleXterm: vi.fn((val: boolean) => { mocks.storeState.showXterm = val }),
  args: new Map<string, string>(),
}))

vi.mock('@fe/support/store', () => ({
  default: {
    get state () { return mocks.storeState },
  },
}))

vi.mock('@fe/services/layout', () => ({
  setContainerDom: mocks.setContainerDom,
  emitResize: mocks.emitResize,
  toggleEditor: mocks.toggleEditor,
  toggleSide: mocks.toggleSide,
  toggleView: mocks.toggleView,
  toggleContentRightSide: mocks.toggleContentRightSide,
  toggleXterm: mocks.toggleXterm,
}))

vi.mock('@fe/support/env', () => ({
  isElectron: true,
}))

vi.mock('@fe/support/args', () => ({
  FLAG_DISABLE_XTERM: false,
  $args: () => ({
    get: (key: string) => mocks.args.get(key),
  }),
}))

import Layout from '../Layout.vue'

beforeEach(() => {
  mocks.storeState = reactive({
    showView: true,
    showXterm: true,
    showSide: true,
    showEditor: true,
    presentation: false,
    isFullscreen: false,
    showContentRightSide: true,
  })
  mocks.args.clear()
  mocks.setContainerDom.mockClear()
  mocks.emitResize.mockClear()
  mocks.toggleEditor.mockClear()
  mocks.toggleSide.mockClear()
  mocks.toggleView.mockClear()
  mocks.toggleContentRightSide.mockClear()
  mocks.toggleXterm.mockClear()
})

describe('Layout', () => {
  test('registers container DOM nodes and clears them on unmount', () => {
    const wrapper = mount(Layout, {
      slots: {
        header: '<div class="slot-header">header</div>',
        left: '<div class="slot-left">left</div>',
        editor: '<div class="slot-editor">editor</div>',
        preview: '<div class="slot-preview">preview</div>',
        footer: '<div class="slot-footer">footer</div>',
      },
    })

    expect(mocks.setContainerDom).toHaveBeenCalledWith('layout', expect.any(HTMLElement))
    expect(mocks.setContainerDom).toHaveBeenCalledWith('preview', expect.any(HTMLElement))
    expect(wrapper.find('.slot-header').exists()).toBe(true)
    expect(wrapper.find('.slot-footer').exists()).toBe(true)

    wrapper.unmount()

    expect(mocks.setContainerDom).toHaveBeenCalledWith('layout', null)
    expect(mocks.setContainerDom).toHaveBeenCalledWith('contentRightSide', null)
  })

  test('resizes side panels, toggles hidden panels at min size, and resets width', async () => {
    const wrapper = mount(Layout)
    const aside = wrapper.find('.left').element as HTMLElement

    Object.defineProperty(aside, 'clientWidth', { configurable: true, value: 220 })

    await wrapper.find('.sash-right').trigger('mousedown', { clientX: 100, clientY: 0 })
    window.document.dispatchEvent(new MouseEvent('mousemove', { clientX: -100, clientY: 0, buttons: 1 }))

    expect(aside.style.width).toBe('130px')
    expect(aside.style.filter).toBe('opacity(0.5)')
    expect(mocks.emitResize).toHaveBeenCalled()

    window.document.dispatchEvent(new MouseEvent('mouseup'))
    expect(mocks.toggleSide).toHaveBeenCalledWith(false)
    expect(aside.style.width).toBe('220px')
    expect(aside.style.filter).toBe('')

    await wrapper.find('.sash-right').trigger('dblclick')
    expect(aside.style.width).toBe('')
    expect(mocks.emitResize).toHaveBeenCalledTimes(2)
  })

  test('clears editor sizing when only one of editor or preview is visible', async () => {
    const wrapper = mount(Layout)
    const editor = wrapper.find('.editor').element as HTMLElement

    editor.style.width = '400px'
    editor.style.minWidth = '400px'
    editor.style.maxWidth = '400px'

    mocks.storeState.showEditor = false
    await nextTick()

    expect(editor.style.width).toBe('')
    expect(editor.style.minWidth).toBe('')
    expect(editor.style.maxWidth).toBe('')
  })

  test('ignores floating editor width when resizing content right side', async () => {
    mocks.storeState.showEditor = false
    const wrapper = mount(Layout)
    const content = wrapper.find('.content').element as HTMLElement
    const editor = wrapper.find('.editor').element as HTMLElement
    const contentRightSide = wrapper.find('.content-right-side').element as HTMLElement

    editor.classList.add('floating-editor-active')
    Object.defineProperty(content, 'clientWidth', { configurable: true, value: 900 })
    Object.defineProperty(editor, 'clientWidth', { configurable: true, value: 450 })
    Object.defineProperty(contentRightSide, 'clientWidth', { configurable: true, value: 250 })

    await wrapper.find('.content-right-side .sash-left').trigger('mousedown', { clientX: 500, clientY: 0 })
    window.document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 0, buttons: 1 }))

    expect(contentRightSide.style.width).toBe('700px')
    expect(contentRightSide.style.minWidth).toBe('700px')
    expect(contentRightSide.style.maxWidth).toBe('700px')
  })
})
