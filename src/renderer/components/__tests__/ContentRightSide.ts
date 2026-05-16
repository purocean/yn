import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  panels: [] as any[],
  storeState: { currentRightSidePanel: '' },
  switchPanel: vi.fn(),
  toggleContentRightSide: vi.fn(),
  quickFilterShow: vi.fn(),
  registerHook: vi.fn(),
  removeHook: vi.fn(),
  refreshHandler: undefined as any,
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => {
    mocks.registerHook(name, handler)
    mocks.refreshHandler = handler
  },
  removeHook: mocks.removeHook,
}))

vi.mock('@fe/support/store', () => ({
  default: { state: mocks.storeState },
}))

vi.mock('@fe/services/workbench', () => ({
  ContentRightSide: {
    getAllPanels: () => mocks.panels,
    switchPanel: mocks.switchPanel,
  },
}))

vi.mock('@fe/services/layout', () => ({
  toggleContentRightSide: mocks.toggleContentRightSide,
}))

vi.mock('@fe/support/ui/quick-filter', () => ({
  useQuickFilter: () => ({
    show: mocks.quickFilterShow,
  }),
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    $t: (key: string) => key,
  }),
}))

vi.mock('../SvgIcon.vue', () => ({
  default: {
    name: 'SvgIcon',
    props: ['name'],
    template: '<span class="svg-icon">{{ name }}</span>',
  },
}))

import ContentRightSide from '../ContentRightSide.vue'

const PanelA = defineComponent({ name: 'PanelA', template: '<div class="panel-a">A</div>' })
const PanelB = defineComponent({ name: 'PanelB', template: '<div class="panel-b">B</div>' })
const CustomBtn = defineComponent({ name: 'CustomBtn', template: '<button class="custom-btn">C</button>' })

beforeEach(() => {
  mocks.panels = [
    {
      name: 'a',
      displayName: 'Panel A',
      component: PanelA,
      keepAlive: true,
      actionBtns: [
        { type: 'normal', key: 'late', icon: 'late', title: 'Late', order: 20, onClick: vi.fn() },
        { type: 'normal', key: 'early', icon: 'early', title: 'Early', order: 1, onClick: vi.fn() },
        { type: 'separator', key: 'sep', order: 10 },
        { type: 'custom', key: 'custom', order: 11, component: CustomBtn },
        { type: 'normal', key: 'hidden', icon: 'hidden', hidden: true, onClick: vi.fn() },
      ],
    },
    { name: 'b', displayName: 'Panel B', component: PanelB, keepAlive: false, actionBtns: [] },
  ]
  mocks.storeState.currentRightSidePanel = 'a'
  mocks.switchPanel.mockClear()
  mocks.toggleContentRightSide.mockClear()
  mocks.quickFilterShow.mockClear()
  mocks.registerHook.mockClear()
  mocks.removeHook.mockClear()
  mocks.refreshHandler = undefined
})

describe('ContentRightSide', () => {
  test('renders selected panel, ordered actions, panel switcher and close action', async () => {
    const wrapper = mount(ContentRightSide, {
      global: { mocks: { $t: (key: string) => key } },
    })

    expect(wrapper.find('.panel-a').exists()).toBe(true)
    expect(wrapper.find('.panel-title').text()).toContain('Panel A')
    expect(wrapper.find('.custom-btn').exists()).toBe(true)
    expect(wrapper.findAll('.panel-actions .action-btn').map(x => x.attributes('title'))).toEqual(['Early', 'Late', 'close'])
    expect(mocks.registerHook).toHaveBeenCalledWith('RIGHT_SIDE_PANEL_CHANGE', expect.any(Function))

    await wrapper.find('.panel-title').trigger('click')
    expect(mocks.quickFilterShow).toHaveBeenCalledWith(expect.objectContaining({
      filterInputHidden: true,
      list: [
        { key: 'a', label: 'Panel A' },
        { key: 'b', label: 'Panel B' },
      ],
      current: 'a',
    }))

    mocks.quickFilterShow.mock.calls[0][0].onChoose({ key: 'b' })
    expect(mocks.switchPanel).toHaveBeenCalledWith('b')

    await wrapper.findAll('.panel-actions .action-btn').at(-1)!.trigger('click')
    expect(mocks.toggleContentRightSide).toHaveBeenCalledWith(false)

    wrapper.unmount()
    expect(mocks.removeHook).toHaveBeenCalledWith('RIGHT_SIDE_PANEL_CHANGE', mocks.refreshHandler)
  })

  test('refreshes panels from hook and falls back to first panel', async () => {
    mocks.storeState.currentRightSidePanel = 'missing'
    const wrapper = mount(ContentRightSide, {
      global: { mocks: { $t: (key: string) => key } },
    })

    expect(wrapper.find('.panel-a').exists()).toBe(true)

    mocks.panels = [{ name: 'b', displayName: 'Panel B', component: PanelB, keepAlive: false, actionBtns: [] }]
    mocks.refreshHandler()
    await nextTick()

    expect(wrapper.find('.panel-b').exists()).toBe(true)
    expect(wrapper.find('.dropdown-icon').exists()).toBe(false)
  })
})
