import { reactive, nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: undefined as any,
  actions: new Map<string, Function>(),
  hooks: new Map<string, Function>(),
  contextMenuShow: vi.fn(),
  toggleOutline: vi.fn(),
  findInRepository: vi.fn(),
  revealCurrentNode: vi.fn(),
  navClick: vi.fn(),
}))

vi.mock('@fe/support/store', () => ({
  default: {
    get state () { return mocks.storeState },
  },
}))

vi.mock('@fe/core/action', () => ({
  getActionHandler: (name: string) => name === 'tree.reveal-current-node' ? mocks.revealCurrentNode : vi.fn(),
  registerAction: (action: any) => mocks.actions.set(action.name, action.handler),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => mocks.hooks.set(name, handler),
  removeHook: (name: string) => mocks.hooks.delete(name),
}))

vi.mock('@fe/support/ui/context-menu', () => ({
  useContextMenu: () => ({ show: mocks.contextMenuShow }),
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({ t: (key: string, value?: string) => value ? `${key}:${value}` : key }),
}))

vi.mock('@fe/services/workbench', () => ({
  toggleOutline: mocks.toggleOutline,
  ControlCenter: {
    getSchema: () => ({
      navigation: {
        items: [
          { type: 'btn', showInActionBar: true, flat: true, icon: 'star', title: 'Star', onClick: mocks.navClick },
          { type: 'btn', showInActionBar: false, flat: true, icon: 'hidden', title: 'Hidden', onClick: vi.fn() },
        ],
      },
    }),
  },
}))

vi.mock('@fe/services/base', () => ({
  findInRepository: mocks.findInRepository,
}))

vi.mock('@fe/core/keybinding', () => ({
  getKeysLabel: (name: string) => `[${name}]`,
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i class="svg-icon">{{name}}</i>' },
}))

import ActionBar from '../ActionBar.vue'

beforeEach(() => {
  mocks.storeState = reactive({
    showOutline: false,
    treeSort: { by: 'name', order: 'asc' },
  })
  mocks.actions.clear()
  mocks.hooks.clear()
  mocks.contextMenuShow.mockReset()
  mocks.toggleOutline.mockReset()
  mocks.findInRepository.mockReset()
  mocks.revealCurrentNode.mockReset()
  mocks.navClick.mockReset()
})

describe('ActionBar', () => {
  test('runs primary actions and updates tree sort from context menu', async () => {
    const wrapper = shallowMount(ActionBar, {
      global: { mocks: { $t: (key: string, value?: string) => value ? `${key}:${value}` : key } },
    })

    const buttons = wrapper.findAll('.btn')
    await buttons[0].trigger('click')
    expect(mocks.toggleOutline).toHaveBeenCalled()

    await buttons[1].trigger('click')
    expect(mocks.contextMenuShow).toHaveBeenCalledWith(expect.any(Array), {
      mouseX: expect.any(Function),
      mouseY: expect.any(Function),
    })

    const sortItems = mocks.contextMenuShow.mock.calls[0][0]
    expect(sortItems[0]).toMatchObject({ id: 'name-asc', checked: true })
    sortItems[1].onClick()
    expect(mocks.storeState.treeSort).toEqual({ by: 'name', order: 'desc' })

    await buttons[2].trigger('click')
    expect(mocks.findInRepository).toHaveBeenCalled()

    await wrapper.find('.title').trigger('dblclick')
    expect(mocks.revealCurrentNode).toHaveBeenCalled()
  })

  test('registers refresh action, renders navigation buttons, and cleans up', async () => {
    const wrapper = shallowMount(ActionBar, {
      global: { mocks: { $t: (key: string, value?: string) => value ? `${key}:${value}` : key } },
    })

    expect(mocks.actions.has('action-bar.refresh')).toBe(true)
    expect(mocks.hooks.has('COMMAND_KEYBINDING_CHANGED')).toBe(true)

    mocks.actions.get('action-bar.refresh')?.()
    await nextTick()
    const buttons = wrapper.findAll('.btn')
    await buttons[buttons.length - 1].trigger('click')
    expect(mocks.navClick).toHaveBeenCalled()

    mocks.storeState.showOutline = true
    await nextTick()
    await wrapper.find('.title').trigger('dblclick')
    expect(mocks.revealCurrentNode).toHaveBeenCalledTimes(0)

    wrapper.unmount()
    expect(mocks.actions.has('action-bar.refresh')).toBe(false)
    expect(mocks.hooks.has('COMMAND_KEYBINDING_CHANGED')).toBe(false)
  })
})
