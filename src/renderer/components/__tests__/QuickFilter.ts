import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  highlight: vi.fn(),
  dispose: vi.fn(),
}))

vi.mock('@fe/utils', () => ({
  createTextHighlighter: () => ({
    highlight: mocks.highlight,
    dispose: mocks.dispose,
  }),
}))

vi.mock('../FixedFloat.vue', () => ({
  default: {
    name: 'FixedFloat',
    props: ['top', 'right', 'bottom', 'left', 'disableAutoFocus'],
    emits: ['close'],
    template: '<div class="fixed-float"><slot /></div>',
  },
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i class="svg-icon">{{name}}</i>' },
}))

import QuickFilter from '../QuickFilter.vue'

const list = [
  { key: 'alpha', label: 'Alpha file' },
  { key: 'beta', label: 'Beta file' },
  { key: 'gamma', label: 'Gamma note' },
]

const mountQuickFilter = (props: Record<string, unknown> = {}) => mount(QuickFilter, {
  props: {
    list,
    current: 'beta',
    ...props,
  },
  global: {
    directives: { autoFocus: {} },
  },
})

beforeEach(() => {
  Element.prototype.scrollIntoViewIfNeeded = vi.fn()
  mocks.highlight.mockClear()
  mocks.dispose.mockClear()
})

describe('QuickFilter', () => {
  test('filters items, highlights matches, and emits input', async () => {
    const wrapper = mountQuickFilter()

    expect(wrapper.findAll('.item')).toHaveLength(3)
    expect(wrapper.find('.checked-icon').exists()).toBe(true)

    await wrapper.find('input').setValue('beta')
    await nextTick()

    expect(wrapper.emitted('input')?.[0]).toEqual(['beta'])
    expect(mocks.highlight).toHaveBeenCalledWith('beta')
    expect(wrapper.findAll('.item')).toHaveLength(1)
    expect(wrapper.find('.item').text()).toContain('Beta file')
  })

  test('selects with keyboard helpers and chooses current item', async () => {
    const wrapper = mountQuickFilter()

    ;(wrapper.vm as any).selectItem(1)
    await nextTick()
    expect(wrapper.find('.item.selected').text()).toContain('Beta file')

    ;(wrapper.vm as any).chooseItem()
    await nextTick()

    expect(wrapper.emitted('choose')?.[0][0]).toEqual({ key: 'beta', label: 'Beta file' })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('chooses hovered item, closes on blur, and disposes highlighter', async () => {
    const wrapper = mountQuickFilter()

    await wrapper.findAll('.item')[2].trigger('mouseover')
    await wrapper.findAll('.item')[2].trigger('mousedown')
    await nextTick()

    expect(wrapper.emitted('choose')?.[0][0]).toEqual({ key: 'gamma', label: 'Gamma note' })
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.find('input').trigger('blur')
    await nextTick()
    expect(wrapper.emitted('close')).toHaveLength(2)

    wrapper.unmount()
    expect(mocks.dispose).toHaveBeenCalled()
  })
})
