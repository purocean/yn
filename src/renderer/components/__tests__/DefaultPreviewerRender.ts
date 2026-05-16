import { h, reactive, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: undefined as any,
  actions: new Map<string, Function>(),
  hooks: new Map<string, Function>(),
  triggerHook: vi.fn(),
  render: vi.fn(),
  contextMenuShow: vi.fn(),
  getContextMenuItems: vi.fn(),
  getRenderIframe: vi.fn(),
  scrollTopTo: vi.fn(),
  getSetting: vi.fn(),
  isOutOfRepo: vi.fn(),
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: mocks.triggerHook,
  registerHook: (name: string, handler: Function) => mocks.hooks.set(name, handler),
  removeHook: (name: string) => mocks.hooks.delete(name),
}))

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action.handler),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/core/keybinding', () => ({
  CtrlCmd: 'Ctrl',
}))

vi.mock('@fe/services/document', () => ({
  toUri: (file: any) => file ? `${file.repo}:${file.path}` : '',
  isOutOfRepo: mocks.isOutOfRepo,
}))

vi.mock('@fe/services/renderer', () => ({
  render: mocks.render,
}))

vi.mock('@fe/services/view', () => ({
  getContextMenuItems: mocks.getContextMenuItems,
  getRenderIframe: mocks.getRenderIframe,
  scrollTopTo: mocks.scrollTopTo,
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: mocks.getSetting,
}))

vi.mock('@fe/support/ui/context-menu', () => ({
  useContextMenu: () => ({ show: mocks.contextMenuShow }),
}))

vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: { SOURCE_LINE_START: 'data-source-line' },
  MODE: 'normal',
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  sleep: () => Promise.resolve(),
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string) => key,
}))

vi.mock('@fe/support/store', () => ({
  default: {
    get state () { return mocks.storeState },
  },
}))

import DefaultPreviewerRender from '../DefaultPreviewerRender.ce.vue'

beforeEach(() => {
  vi.useRealTimers()
  mocks.storeState = reactive({
    presentation: false,
    inComposition: false,
    autoPreview: true,
    currentFile: { repo: 'repo', path: '/a.md', name: 'a.md' },
    currentContent: '# Hello',
  })
  mocks.actions.clear()
  mocks.hooks.clear()
  mocks.triggerHook.mockReset()
  mocks.triggerHook.mockResolvedValue(undefined)
  mocks.render.mockReset()
  mocks.render.mockImplementation((content: string) => h('section', { class: 'rendered' }, content))
  mocks.contextMenuShow.mockReset()
  mocks.getContextMenuItems.mockReset()
  mocks.getContextMenuItems.mockReturnValue([])
  mocks.getRenderIframe.mockReset()
  mocks.getRenderIframe.mockResolvedValue({
    getBoundingClientRect: () => ({ left: 10, top: 20 }),
    contentWindow: {
      innerHeight: 400,
      scrollY: 50,
      scrollTo: vi.fn(),
    },
  })
  mocks.scrollTopTo.mockReset()
  mocks.getSetting.mockReset()
  mocks.getSetting.mockReturnValue(80)
  mocks.isOutOfRepo.mockReset()
  mocks.isOutOfRepo.mockReturnValue(false)
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('DefaultPreviewerRender', () => {
  test('renders on mount, registers actions/hooks, exposes html and render env, then cleans up', async () => {
    const wrapper = mount(DefaultPreviewerRender)
    await flushPromises()
    await nextTick()

    expect(mocks.render).toHaveBeenCalledWith('# Hello', expect.objectContaining({
      source: '# Hello',
      safeMode: false,
      renderCount: 1,
    }))
    expect(wrapper.find('.rendered').text()).toBe('# Hello')
    expect(wrapper.find('.markdown-view').attributes('style')).toContain('--markdown-body-max-width: 80%;')
    expect(mocks.actions.has('view.refresh')).toBe(true)
    expect(mocks.hooks.has('SETTING_CHANGED')).toBe(true)

    expect(await mocks.actions.get('view.get-content-html')?.()).toContain('markdown-body')
    expect(mocks.actions.get('view.get-render-env')?.()).toMatchObject({ source: '# Hello' })

    await mocks.actions.get('view.render-immediately')?.()
    expect(mocks.render).toHaveBeenCalledTimes(2)

    wrapper.unmount()
    expect(mocks.actions.has('view.refresh')).toBe(false)
    expect(mocks.hooks.has('SETTING_CHANGED')).toBe(false)
  })

  test('handles preview DOM events, context menus, settings changes, and reveal line', async () => {
    const wrapper = mount(DefaultPreviewerRender)
    await flushPromises()

    const article = wrapper.find('article')
    await article.trigger('dblclick')
    await article.trigger('click')
    await article.trigger('error')
    expect(mocks.triggerHook).toHaveBeenCalledWith('VIEW_ELEMENT_DBCLICK', expect.any(Object), { breakable: true })
    expect(mocks.triggerHook).toHaveBeenCalledWith('VIEW_ELEMENT_CLICK', expect.any(Object), { breakable: true })
    expect(mocks.triggerHook).toHaveBeenCalledWith('VIEW_DOM_ERROR', expect.any(Object), { breakable: true })

    mocks.getContextMenuItems.mockReturnValue([{ id: 'copy', label: 'Copy' }])
    await article.trigger('contextmenu', { clientX: 5, clientY: 6 })
    await flushPromises()
    expect(mocks.contextMenuShow).toHaveBeenCalledWith([{ id: 'copy', label: 'Copy' }], {
      mouseX: 15,
      mouseY: 26,
    })

    mocks.getSetting.mockReturnValue(1200)
    mocks.hooks.get('SETTING_CHANGED')?.()
    await nextTick()
    expect(wrapper.find('.markdown-view').attributes('style')).toContain('--markdown-body-max-width: 1200px;')

    expect(await mocks.actions.get('view.reveal-line')?.(1)).toBeNull()
    expect(mocks.scrollTopTo).toHaveBeenCalledWith(0)

    const sourceEl = document.createElement('p')
    sourceEl.dataset.sourceLine = '5'
    article.element.appendChild(sourceEl)

    expect(await mocks.actions.get('view.reveal-line')?.(5)).toBe(sourceEl)
    expect(sourceEl.scrollIntoView).toHaveBeenCalled()
  })

  test('re-renders on content changes and renders an error block when renderer throws', async () => {
    const wrapper = mount(DefaultPreviewerRender)
    await flushPromises()

    mocks.render.mockImplementationOnce(() => {
      throw new Error('render failed')
    })

    await mocks.actions.get('view.render-immediately')?.()
    await flushPromises()
    expect(wrapper.text()).toContain('render failed')

    mocks.storeState.currentContent = 'Updated'
    await mocks.actions.get('view.render-immediately')?.()
    await flushPromises()

    expect(mocks.render).toHaveBeenCalledWith('Updated', expect.objectContaining({
      source: 'Updated',
    }))
  })
})
