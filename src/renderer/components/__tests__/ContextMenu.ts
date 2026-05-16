import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

vi.mock('../Mask.vue', () => ({
  default: {
    name: 'XMask',
    props: ['show'],
    emits: ['close'],
    template: '<div class="mask"><slot /></div>',
  },
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i class="svg-icon">{{name}}</i>' },
}))

import ContextMenu from '../ContextMenu.vue'

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 40 })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 30 })
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 100 })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 100 })
})

describe('ContextMenu', () => {
  test('does not show when every item is hidden', async () => {
    const wrapper = mount(ContextMenu, {
      global: { directives: { autoFocus: {} } },
    })

    ;(wrapper.vm as any).show([{ id: 'hidden', label: 'Hidden', hidden: true }])
    await nextTick()

    expect((wrapper.vm as any).items).toEqual([])
    expect(wrapper.find('li').exists()).toBe(false)
  })

  test('shows at mouse position, clicks normal items, and hides after click', async () => {
    const onClick = vi.fn()
    const wrapper = mount(ContextMenu, {
      global: { directives: { autoFocus: {} } },
    })

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 90, clientY: 95 }))
    ;(wrapper.vm as any).show([
      { id: 'open', label: 'Open', onClick },
      { type: 'separator' },
      { id: 'checked', label: 'Checked', checked: true, ellipsis: true },
    ])
    await nextTick()
    await nextTick()

    expect(wrapper.find('.menu').attributes('style')).toContain('left: 50px')
    expect(wrapper.find('.menu').attributes('style')).toContain('top: 65px')
    expect(wrapper.findAll('li')).toHaveLength(3)

    await wrapper.find('li.normal').trigger('click')
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'open' }))
    expect((wrapper.vm as any).items).toEqual([])
  })

  test('supports keyboard navigation across separators and hidden items', async () => {
    const onClick = vi.fn()
    const wrapper = mount(ContextMenu, {
      global: { directives: { autoFocus: {} } },
    })

    ;(wrapper.vm as any).show([
      { type: 'separator' },
      { id: 'hidden', label: 'Hidden', hidden: true },
      { id: 'run', label: 'Run', onClick },
    ])
    await nextTick()

    const down = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    window.dispatchEvent(down)
    expect((wrapper.vm as any).currentItemIdx).toBe(2)
    expect((wrapper.vm as any).itemFocus).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'run' }))
  })
})
