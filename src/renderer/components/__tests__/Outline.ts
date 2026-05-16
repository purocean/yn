import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  hooks: new Map<string, Function>(),
  storeState: {
    currentFile: { repo: 'repo', path: '/doc.md' },
  } as any,
  headings: [] as any[],
  editorHighlightLine: vi.fn(),
  viewHighlightLine: vi.fn(),
  setPosition: vi.fn(),
  focus: vi.fn(),
  disableSyncScrollAwhile: vi.fn((cb: Function) => cb()),
  highlight: vi.fn(),
  dispose: vi.fn(),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => mocks.hooks.set(name, handler),
  removeHook: (name: string) => mocks.hooks.delete(name),
}))

vi.mock('@fe/support/store', () => ({
  default: { state: mocks.storeState },
}))

vi.mock('@fe/services/editor', () => ({
  highlightLine: mocks.editorHighlightLine,
  getEditor: () => ({
    getModel: () => ({ getLineMaxColumn: () => 42 }),
    setPosition: mocks.setPosition,
    focus: mocks.focus,
  }),
}))

vi.mock('@fe/services/document', () => ({
  isSameFile: (a: any, b: any) => a?.repo === b?.repo && a?.path === b?.path,
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@fe/services/view', () => ({
  disableSyncScrollAwhile: mocks.disableSyncScrollAwhile,
  getHeadings: () => mocks.headings,
  getRenderEnv: () => ({ file: { repo: 'repo', path: '/doc.md' } }),
  highlightLine: mocks.viewHighlightLine,
}))

vi.mock('@fe/utils', () => ({
  createTextHighlighter: () => ({
    highlight: mocks.highlight,
    dispose: mocks.dispose,
  }),
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<button class="svg-icon">{{name}}</button>' },
}))

import Outline from '../Outline.vue'

beforeEach(() => {
  Element.prototype.scrollIntoViewIfNeeded = vi.fn()
  mocks.hooks.clear()
  mocks.headings = [
    { class: 'heading tag-h1', level: 1, sourceLine: 1, text: 'Intro', tag: 'H1', activated: true },
    { class: 'heading tag-h2', level: 2, sourceLine: 3, text: 'Install', tag: 'H2', activated: false },
    { class: 'heading tag-h2', level: 2, sourceLine: 8, text: 'Usage', tag: 'H2', activated: false },
  ]
  mocks.editorHighlightLine.mockReset()
  mocks.viewHighlightLine.mockReset()
  mocks.setPosition.mockReset()
  mocks.focus.mockReset()
  mocks.disableSyncScrollAwhile.mockClear()
  mocks.highlight.mockReset()
  mocks.dispose.mockReset()
})

describe('Outline', () => {
  test('renders headings, filters text, and highlights matches', async () => {
    const wrapper = mount(Outline, {
      props: { showFilter: true, enableCollapse: true },
      global: {
        mocks: { $t: (key: string) => key },
      },
    })
    await nextTick()

    expect(wrapper.findAll('.heading')).toHaveLength(3)
    expect(wrapper.find('.heading').attributes('data-activated')).toBe('true')
    expect(mocks.hooks.has('VIEW_RENDERED')).toBe(true)

    await wrapper.find('input').setValue('usage')
    await nextTick()

    expect(wrapper.findAll('.heading')).toHaveLength(1)
    expect(wrapper.find('.heading').text()).toContain('Usage')
    expect(mocks.highlight).toHaveBeenCalledWith('usage')
    expect((wrapper.vm as any).disableCollapse).toBe(true)

    wrapper.unmount()
    expect(mocks.dispose).toHaveBeenCalled()
    expect(mocks.hooks.has('VIEW_RENDERED')).toBe(false)
  })

  test('supports collapse, keyboard current item changes, and same-file navigation', async () => {
    const wrapper = mount(Outline, {
      props: { showFilter: true, enableCollapse: true },
      global: {
        mocks: { $t: (key: string) => key },
      },
    })
    await nextTick()

    await wrapper.find('.svg-icon').trigger('click')
    await nextTick()
    expect(wrapper.findAll('.heading')).toHaveLength(1)

    await wrapper.find('input').trigger('keydown.down')
    expect((wrapper.vm as any).currentIdx).toBe(0)

    await wrapper.find('input').trigger('keydown.enter')
    expect(mocks.disableSyncScrollAwhile).toHaveBeenCalled()
    expect(mocks.editorHighlightLine).toHaveBeenCalledWith(1, true)
    expect(mocks.setPosition).toHaveBeenCalledWith({ lineNumber: 1, column: 42 })
    expect(mocks.focus).toHaveBeenCalled()
    expect(mocks.viewHighlightLine).toHaveBeenCalledWith(1, true)
  })
})
