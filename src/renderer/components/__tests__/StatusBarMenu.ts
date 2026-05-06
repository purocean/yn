import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  menus: [] as any[],
  hooks: new Map<string, Function>(),
  refreshMenu: vi.fn(),
}))

vi.mock('@fe/services/status-bar', () => ({
  getMenus: () => mocks.menus,
  refreshMenu: mocks.refreshMenu,
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => mocks.hooks.set(name, handler),
  removeHook: (name: string) => mocks.hooks.delete(name),
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i class="svg-icon">{{name}}</i>' },
}))

import StatusBarMenu from '../StatusBarMenu.vue'

const CustomTitle = defineComponent({
  template: '<span class="custom-rendered">Custom</span>',
})

beforeEach(() => {
  vi.useRealTimers()
  mocks.menus = [
    {
      id: 'second',
      title: 'Second',
      order: 2,
      list: [
        { id: 'disabled', type: 'normal', title: 'Disabled', disabled: true, onClick: vi.fn() },
        { id: 'active', type: 'normal', title: 'Active', checked: true, ellipsis: true, onClick: vi.fn() },
      ],
    },
    {
      id: 'first',
      title: CustomTitle,
      order: 1,
      list: [{ id: 'hidden', type: 'normal', title: 'Hidden', hidden: true }],
    },
  ]
  mocks.hooks.clear()
  mocks.refreshMenu.mockReset()
})

describe('StatusBarMenu', () => {
  test('renders menus sorted by order and handles enabled and disabled item clicks', async () => {
    vi.useFakeTimers()
    const wrapper = mount(StatusBarMenu)

    const menus = wrapper.findAll('.status-bar-menu')
    expect(menus[0].attributes('data-id')).toBe('first')
    expect(wrapper.find('.custom-rendered').text()).toBe('Custom')

    const disabled = wrapper.find('li.disabled')
    await disabled.trigger('click')
    expect(mocks.menus[0].list[0].onClick).not.toHaveBeenCalled()

    await wrapper.find('li.ellipsis').trigger('click')
    expect(mocks.menus[0].list[1].onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'active' }))
    expect((wrapper.vm as any).showList).toBe(false)

    vi.runOnlyPendingTimers()
    await nextTick()
    expect((wrapper.vm as any).showList).toBe(true)
    vi.useRealTimers()
  })

  test('refreshes menu from hooks and schedules status bar refresh on wrapper click', async () => {
    vi.useFakeTimers()
    const wrapper = mount(StatusBarMenu)

    expect(mocks.hooks.has('ACTION_BEFORE_RUN')).toBe(true)
    mocks.menus = [{ id: 'updated', title: 'Updated', list: [] }]
    mocks.hooks.get('ACTION_BEFORE_RUN')?.({ name: 'status-bar.refresh-menu' })
    await nextTick()
    expect(wrapper.find('.status-bar-menu').attributes('data-id')).toBe('updated')

    await wrapper.find('.status-bar-menu-wrapper').trigger('click')
    vi.advanceTimersByTime(50)
    expect(mocks.refreshMenu).toHaveBeenCalled()

    wrapper.unmount()
    expect(mocks.hooks.has('ACTION_BEFORE_RUN')).toBe(false)
    expect(mocks.hooks.has('I18N_CHANGE_LANGUAGE')).toBe(false)
    vi.useRealTimers()
  })
})
