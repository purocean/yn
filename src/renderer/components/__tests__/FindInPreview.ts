import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  actions: new Map<string, any>(),
  hooks: new Map<string, Function>(),
  iframeWindow: undefined as any,
  getRenderIframe: vi.fn(),
  getEditor: vi.fn(() => ({ hasTextFocus: () => false })),
  storeState: { showView: true },
  loggerError: vi.fn(),
  instances: [] as any[],
  BrowserFindInPreview: class {
    exec = vi.fn()
    next = vi.fn(() => true)
    prev = vi.fn(() => false)
    getStats = vi.fn(() => ({ count: 2, exceed: false }))

    constructor (public win: Window, public options: any) {
      mocks.instances.push(this)
    }
  },
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    $t: (key: string, value?: any) => value ? `${key}:${value}` : key,
  }),
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    error: mocks.loggerError,
  }),
  sleep: () => Promise.resolve(),
}))

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => mocks.hooks.set(name, handler),
  removeHook: (name: string) => mocks.hooks.delete(name),
}))

vi.mock('@fe/core/keybinding', () => ({
  CtrlCmd: 'Cmd',
}))

vi.mock('@fe/services/view', () => ({
  getRenderIframe: mocks.getRenderIframe,
}))

vi.mock('@fe/services/editor', () => ({
  getEditor: mocks.getEditor,
}))

vi.mock('@fe/others/find-in-preview', () => ({
  BrowserFindInPreview: mocks.BrowserFindInPreview,
}))

vi.mock('@fe/support/store', () => ({
  default: { state: mocks.storeState },
}))

vi.mock('@fe/components/SvgIcon.vue', () => ({
  default: {
    name: 'SvgIcon',
    props: ['name'],
    template: '<span class="svg-icon" @click="$emit(\'click\')">{{ name }}</span>',
  },
}))

import FindInPreview from '../FindInPreview.vue'

const directives = {
  upDownHistory: {},
  placeholder: {},
  autoResize: {},
}

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

beforeEach(() => {
  vi.useFakeTimers()
  mocks.actions.clear()
  mocks.hooks.clear()
  mocks.instances.length = 0
  mocks.getEditor.mockReturnValue({ hasTextFocus: () => false })
  mocks.storeState.showView = true
  mocks.loggerError.mockClear()
  document.body.innerHTML = ''
  mocks.iframeWindow = {
    document,
    getSelection: vi.fn(() => ({ toString: () => 'selected text' })),
  }
  mocks.getRenderIframe.mockResolvedValue({ contentWindow: mocks.iframeWindow })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('FindInPreview', () => {
  test('registers action, opens from preview selection, searches and toggles options', async () => {
    const wrapper = mount(FindInPreview, {
      global: { directives },
    })

    const action = mocks.actions.get('view.show-find-in-preview')
    expect(action.keys).toEqual(['Cmd', 'f'])
    expect(action.when()).toBe(true)

    await action.handler()
    await flush()
    vi.runOnlyPendingTimers()

    expect(wrapper.find('.find-in-preview').classes()).toContain('visible')
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('selected text')
    expect(mocks.instances[0].options).toMatchObject({ maxMatchCount: 1000, wrapAround: true })

    await wrapper.find('input').setValue('needle')
    await wrapper.find('input').trigger('keydown.enter', { key: 'Enter' })
    await flush()

    expect(mocks.instances[0].exec).toHaveBeenCalledWith('needle', { caseSensitive: false, regex: false })
    expect(mocks.instances[0].next).toHaveBeenCalled()
    expect(wrapper.text()).toContain('find-in-preview.results:2')
    expect(document.body.classList.contains('find-in-preview-highlight')).toBe(true)

    await wrapper.findAll('.option-btn')[0].trigger('click')
    expect(mocks.instances[0].exec).toHaveBeenLastCalledWith('needle', { caseSensitive: true, regex: false })

    mocks.hooks.get('VIEW_RENDERED')?.()
    await nextTick()
    expect(wrapper.text()).not.toContain('find-in-preview.results:2')

    wrapper.unmount()
    expect(mocks.actions.has('view.show-find-in-preview')).toBe(false)
    expect(mocks.hooks.has('VIEW_RENDERED')).toBe(false)
  })

  test('guards disabled action, empty search, search errors and close cleanup', async () => {
    const wrapper = mount(FindInPreview, {
      global: { directives },
    })
    const action = mocks.actions.get('view.show-find-in-preview')

    mocks.getEditor.mockReturnValue({ hasTextFocus: () => true })
    expect(action.when()).toBe(false)

    await action.handler()
    await flush()
    vi.runOnlyPendingTimers()

    await wrapper.find('input').setValue('')
    await wrapper.find('input').trigger('keydown.enter', { key: 'Enter' })
    await nextTick()
    expect(wrapper.text()).not.toContain('find-in-preview.results')

    await wrapper.find('input').setValue('[')
    mocks.instances[0].exec.mockImplementationOnce(() => {
      throw new Error('bad regexp')
    })
    await wrapper.find('input').trigger('keydown.enter', { key: 'Enter' })
    expect(mocks.loggerError).toHaveBeenCalled()

    await wrapper.find('input').trigger('keydown.escape')
    await flush()
    expect(wrapper.find('.find-in-preview').classes()).not.toContain('visible')
    expect(document.body.classList.contains('find-in-preview-highlight')).toBe(false)
  })
})
