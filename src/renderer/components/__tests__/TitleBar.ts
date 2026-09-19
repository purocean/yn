import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  actions: new Map<string, Function>(),
  hooks: new Map<string, Function>(),
  navClick: vi.fn(),
  schema: {
    navigation: {
      items: [] as any[],
    },
  },
}))

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action.handler),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => mocks.hooks.set(name, handler),
  removeHook: (name: string) => mocks.hooks.delete(name),
}))

vi.mock('@fe/services/workbench', () => ({
  ControlCenter: {
    getSchema: () => mocks.schema,
  },
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i class="svg-icon">{{name}}</i>' },
}))

import TitleBar from '../TitleBar.vue'
import { setTitleBarTabsLeft, titleBarTabsContainer } from '@fe/support/title-bar'

beforeEach(() => {
  mocks.actions.clear()
  mocks.hooks.clear()
  mocks.navClick.mockReset()
  mocks.schema.navigation.items = [
    { type: 'btn', showInActionBar: true, icon: 'arrow-left-solid', title: 'Back', onClick: mocks.navClick },
    { type: 'btn', showInActionBar: false, icon: 'sync-alt-solid', title: 'Refresh', onClick: vi.fn() },
    { type: 'custom', component: {}, showInActionBar: true },
  ]
  titleBarTabsContainer.value = null
  setTitleBarTabsLeft(260)
})

describe('TitleBar', () => {
  test('hosts file tabs and renders refreshed navigation actions', async () => {
    const wrapper = shallowMount(TitleBar)
    await nextTick()

    expect(titleBarTabsContainer.value).toBe(wrapper.find('.tabs-container').element)
    expect(wrapper.find('.tabs-container').attributes('style')).toContain('--tabs-left: 260px')
    expect(wrapper.find('.title-bar').attributes('style')).toContain('--navigation-safe-width: 51px')
    expect(mocks.actions.has('action-bar.refresh')).toBe(true)
    expect(mocks.hooks.has('COMMAND_KEYBINDING_CHANGED')).toBe(true)
    expect(wrapper.findAll('.btn')).toHaveLength(1)

    mocks.schema.navigation = {
      items: [
        ...mocks.schema.navigation.items,
        { type: 'btn', showInActionBar: true, icon: 'arrow-right-solid', title: 'Forward', onClick: vi.fn() },
      ],
    }
    mocks.actions.get('action-bar.refresh')?.()
    await nextTick()

    const buttons = wrapper.findAll('.btn')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('title')).toBe('Back')
    expect(wrapper.find('.title-bar').attributes('style')).toContain('--navigation-safe-width: 75px')
    await buttons[0].trigger('click')
    expect(mocks.navClick).toHaveBeenCalled()

    setTitleBarTabsLeft(480)
    expect(wrapper.find('.tabs-container').attributes('style')).toContain('--tabs-left: 480px')

    wrapper.unmount()
    expect(titleBarTabsContainer.value).toBeNull()
    expect(mocks.actions.has('action-bar.refresh')).toBe(false)
    expect(mocks.hooks.has('COMMAND_KEYBINDING_CHANGED')).toBe(false)
  })
})
