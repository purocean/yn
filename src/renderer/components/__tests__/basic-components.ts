import { defineComponent, h, nextTick } from 'vue'
import { mount, shallowMount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: {
    showSetting: false,
    currentRepo: undefined as any,
    currentFile: undefined as any,
    currentRepoIndexStatus: undefined as any,
  },
  contextMenuShow: vi.fn(),
  quickFilterShow: vi.fn(),
  registerHook: vi.fn(),
  removeHook: vi.fn(),
  sortableCreate: vi.fn(),
  sortableSort: vi.fn(),
  sortableDestroy: vi.fn(),
  setCurrentRepo: vi.fn(),
  toggleRepoIndexing: vi.fn(),
  rebuildCurrentRepo: vi.fn(),
}))

vi.mock('sortablejs', () => ({
  default: {
    create: mocks.sortableCreate,
  },
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: mocks.storeState,
  },
}))

vi.mock('@fe/services/i18n', () => {
  const translate = (key: string, value?: string) => {
    if (key === 'index-status.switch-repository-html') {
      return `<button data-command="switch-repository">switch ${value}</button>`
    }

    if (key === 'index-status.enable-indexing-html') {
      return `<button data-command="enable-indexing">enable ${value}</button>`
    }

    return value ? `${key}:${value}` : key
  }

  return {
    t: translate,
    useI18n: () => ({
      t: translate,
      $t: translate,
    }),
  }
})

vi.mock('@fe/support/ui/context-menu', () => ({
  useContextMenu: () => ({
    show: mocks.contextMenuShow,
  }),
}))

vi.mock('@fe/support/ui/quick-filter', () => ({
  useQuickFilter: () => ({
    show: mocks.quickFilterShow,
  }),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: mocks.registerHook,
  removeHook: mocks.removeHook,
}))

vi.mock('@fe/services/repo', () => ({
  setCurrentRepo: mocks.setCurrentRepo,
  toggleRepoIndexing: mocks.toggleRepoIndexing,
}))

vi.mock('@fe/services/indexer', () => ({
  rebuildCurrentRepo: mocks.rebuildCurrentRepo,
}))

vi.mock('../Setting.vue', () => ({
  default: {
    name: 'Setting',
    template: '<button class="setting-mock" @click="$emit(\'close\')">Setting</button>',
  },
}))

import Mask from '../Mask.vue'
import Toast from '../Toast.vue'
import ModalUi from '../ModalUi.vue'
import Tabs from '../Tabs.vue'
import GroupTabs from '../GroupTabs.vue'
import SvgIcon from '../SvgIcon.vue'
import IndexStatus from '../IndexStatus.vue'
import SettingPanel from '../SettingPanel.vue'

const directives = {
  autoZIndex: {},
  autoFocus: {},
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
  mocks.storeState.showSetting = false
  mocks.storeState.currentRepo = undefined
  mocks.storeState.currentFile = undefined
  mocks.storeState.currentRepoIndexStatus = undefined
  mocks.contextMenuShow.mockClear()
  mocks.quickFilterShow.mockClear()
  mocks.registerHook.mockClear()
  mocks.removeHook.mockClear()
  mocks.sortableSort.mockClear()
  mocks.sortableDestroy.mockClear()
  mocks.sortableCreate.mockReset()
  mocks.sortableCreate.mockReturnValue({
    sort: mocks.sortableSort,
    destroy: mocks.sortableDestroy,
  })
  mocks.setCurrentRepo.mockClear()
  mocks.toggleRepoIndexing.mockClear()
  mocks.rebuildCurrentRepo.mockClear()
})

describe('Mask', () => {
  test('renders slot content only when shown and emits close from mask clicks', async () => {
    const wrapper = mount(Mask, {
      props: { show: true },
      slots: { default: '<div class="inside">content</div>' },
      global: {
        directives,
        stubs: { teleport: true, transition: false },
      },
    })

    expect(wrapper.find('.inside').text()).toBe('content')

    await wrapper.find('.mask').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.setProps({ show: false })
    expect(wrapper.find('.mask-wrapper').exists()).toBe(false)
  })

  test('honors non-closeable props', async () => {
    const wrapper = mount(Mask, {
      props: { show: true, maskCloseable: false, escCloseable: false },
      global: {
        directives,
        stubs: { teleport: true, transition: false },
      },
    })

    await wrapper.find('.mask').trigger('click')
    ;(wrapper.vm as any).onEsc()

    expect(wrapper.emitted('close')).toBeUndefined()
  })
})

describe('Toast', () => {
  test('shows string content and auto hides after timeout', async () => {
    vi.useFakeTimers()
    const wrapper = mount(Toast)

    await (wrapper.vm as any).show('info', 'Saved', 100)
    await nextTick()

    expect(wrapper.find('.toast').classes()).toContain('toast-info')
    expect(wrapper.text()).toBe('Saved')

    vi.advanceTimersByTime(100)
    await nextTick()

    expect(wrapper.find('.toast').exists()).toBe(false)
  })

  test('renders component content and can be hidden manually', async () => {
    const content = defineComponent({
      setup: () => () => h('strong', { class: 'component-toast' }, 'Component toast'),
    })
    const wrapper = mount(Toast)

    await (wrapper.vm as any).show('warning', content, 0)
    await nextTick()

    expect(wrapper.find('.component-toast').text()).toBe('Component toast')
    expect(wrapper.find('.toast').classes()).toContain('toast-warning')

    ;(wrapper.vm as any).hide()
    await nextTick()

    expect(wrapper.find('.toast').exists()).toBe(false)
  })
})

describe('ModalUi', () => {
  const mountModal = () => shallowMount(ModalUi, {
    global: {
      directives,
      stubs: {
        XMask: { template: '<div><slot /></div>', props: ['show'] },
      },
    },
  })

  test('resolves confirm with true or false from action buttons', async () => {
    const wrapper = mountModal()
    const promise = (wrapper.vm as any).confirm({
      title: 'Confirm',
      content: 'Are you sure?',
      okText: 'Yes',
      cancelText: 'No',
    })
    await nextTick()

    expect(wrapper.find('h4').text()).toBe('Confirm')
    expect(wrapper.find('p.content').text()).toBe('Are you sure?')

    await wrapper.find('.btn.primary').trigger('click')
    await expect(promise).resolves.toBe(true)

    const cancelPromise = (wrapper.vm as any).confirm({ title: 'Again' })
    await nextTick()
    await wrapper.find('.btn:not(.primary)').trigger('click')
    await expect(cancelPromise).resolves.toBe(false)
  })

  test('resolves input value and null on cancel', async () => {
    const wrapper = mountModal()
    const promise = (wrapper.vm as any).input({
      title: 'Name',
      value: 'draft',
      hint: 'enter name',
      maxlength: 10,
    })
    await nextTick()

    const input = wrapper.find('input.input')
    expect(input.element.getAttribute('placeholder')).toBe('enter name')
    expect(input.element.getAttribute('maxlength')).toBe('10')

    await input.setValue('final')
    await wrapper.find('.btn.primary').trigger('click')
    await expect(promise).resolves.toBe('final')

    const cancelPromise = (wrapper.vm as any).input({ title: 'Cancel me' })
    await nextTick()
    await wrapper.find('.btn:not(.primary)').trigger('click')
    await expect(cancelPromise).resolves.toBeNull()
  })
})

describe('GroupTabs', () => {
  test('marks the selected tab and emits model updates', async () => {
    const wrapper = mount(GroupTabs, {
      props: {
        modelValue: 'write',
        size: 'small',
        tabs: [
          { label: 'Read', value: 'read' },
          { label: 'Write', value: 'write' },
        ],
      },
    })

    expect(wrapper.classes()).toContain('small')
    expect(wrapper.find('.tab.selected').text()).toBe('Write')

    await wrapper.find('[data-key="read"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[ 'read' ]])
  })
})

describe('SvgIcon', () => {
  test('renders bundled icons with dimensions, color, and title', () => {
    const wrapper = mount(SvgIcon, {
      props: {
        name: 'times',
        title: 'Close',
        color: 'red',
        width: '12px',
        height: '13px',
      },
    })

    expect(wrapper.attributes('title')).toBe('Close')
    expect(wrapper.attributes('style')).toContain('color: red')
    expect(wrapper.attributes('style')).toContain('width: 12px')
    expect(wrapper.attributes('style')).toContain('height: 13px')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  test('passes through custom svg html', () => {
    const wrapper = mount(SvgIcon, {
      props: {
        name: '<svg data-test="custom"></svg>',
      },
    })

    expect(wrapper.find('[data-test="custom"]').exists()).toBe(true)
  })
})

describe('Tabs', () => {
  const tabList = [
    { key: 'a', label: 'Alpha', description: 'First' },
    { key: 'b', label: 'Beta', fixed: true },
    { key: 'c', label: 'Gamma', temporary: true },
  ]

  const mountTabs = (props: Record<string, unknown> = {}) => mount(Tabs, {
    props: {
      value: 'a',
      list: tabList,
      ...props,
    },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        SvgIcon: true,
      },
    },
  })

  test('sorts fixed tabs first and emits tab interaction events', async () => {
    const wrapper = mountTabs()
    const tabs = wrapper.findAll('.tab')

    expect(tabs.map(x => x.attributes('data-key'))).toEqual(['b', 'a', 'c'])

    await wrapper.find('[data-key="c"]').trigger('mousedown', { button: 0 })
    expect(wrapper.emitted('input')).toEqual([[ 'c' ]])
    expect(wrapper.emitted('switch')![0][0]).toMatchObject({ key: 'c' })

    await wrapper.find('[data-key="a"] .icon').trigger('click')
    expect(wrapper.emitted('remove')![0][0]).toEqual([
      expect.objectContaining({ key: 'a' }),
    ])

    await wrapper.find('[data-key="b"] .icon').trigger('click')
    const changedList = wrapper.emitted('change-list')![0][0] as any[]
    expect(changedList.map(x => x.key)).toEqual(['b', 'a', 'c'])
    expect(changedList[0]).toMatchObject({ key: 'b', fixed: false, temporary: false })
  })

  test('shows context menu, quick filter, action buttons, and cleans up hooks', async () => {
    const actionClick = vi.fn()
    const hookContextMenu = vi.fn((item, items) => {
      items.push({ id: 'custom', label: `custom ${item.key}` })
    })
    const wrapper = mountTabs({
      hookContextMenu,
      actionBtns: [
        { type: 'normal', icon: 'plus', title: 'Add', onClick: actionClick },
        { type: 'separator' },
        { type: 'custom', component: defineComponent({ template: '<button class="custom-action">Custom</button>' }) },
        { type: 'normal', icon: 'trash-solid', title: 'Hidden', hidden: true },
      ],
    })

    expect(mocks.registerHook).toHaveBeenCalledWith('GLOBAL_KEYDOWN', expect.any(Function))
    expect(mocks.registerHook).toHaveBeenCalledWith('GLOBAL_RESIZE', expect.any(Function))
    expect(mocks.sortableCreate).toHaveBeenCalled()

    await wrapper.find('[data-key="a"]').trigger('contextmenu')

    expect(hookContextMenu).toHaveBeenCalledWith(expect.objectContaining({ key: 'a' }), expect.any(Array))
    expect(mocks.contextMenuShow).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'close' }),
      expect.objectContaining({ id: 'custom', label: 'custom a' }),
    ]))

    await wrapper.find('.action-btn').trigger('click')
    expect(mocks.quickFilterShow).toHaveBeenCalledWith(expect.objectContaining({
      placeholder: 'tabs.search-tabs',
      current: 'a',
      list: expect.any(Array),
      onChoose: expect.any(Function),
    }))

    await wrapper.find('[title="Add"]').trigger('click')
    expect(actionClick).toHaveBeenCalled()
    expect(wrapper.find('.custom-action').exists()).toBe(true)
    expect(wrapper.find('[title="Hidden"]').exists()).toBe(false)

    wrapper.unmount()
    expect(mocks.removeHook).toHaveBeenCalledWith('GLOBAL_KEYDOWN', expect.any(Function))
    expect(mocks.removeHook).toHaveBeenCalledWith('GLOBAL_RESIZE', expect.any(Function))
    expect(mocks.sortableDestroy).toHaveBeenCalled()
  })

  test('executes tab context commands, keyboard switching, sorting, wheel scrolling, and shadows', async () => {
    let sortableOptions: any
    mocks.sortableCreate.mockImplementation((_el, options) => {
      sortableOptions = options
      return {
        sort: mocks.sortableSort,
        destroy: mocks.sortableDestroy,
      }
    })

    const wrapper = mountTabs({
      value: 'b',
      list: [
        { key: 'a', label: 'Alpha' },
        { key: 'b', label: 'Beta', fixed: true },
        { key: 'c', label: 'Gamma' },
        { key: 'd', label: 'Delta' },
      ],
    })

    await wrapper.find('[data-key="c"]').trigger('contextmenu')
    const menus = mocks.contextMenuShow.mock.calls.at(-1)![0]

    menus.find((item: any) => item.id === 'close-others').onClick()
    expect(wrapper.emitted('remove')!.at(-1)![0]).toEqual([
      expect.objectContaining({ key: 'a' }),
      expect.objectContaining({ key: 'd' }),
    ])

    menus.find((item: any) => item.id === 'close-right').onClick()
    expect(wrapper.emitted('remove')!.at(-1)![0]).toEqual([
      expect.objectContaining({ key: 'd' }),
    ])

    menus.find((item: any) => item.id === 'close-left').onClick()
    expect(wrapper.emitted('remove')!.at(-1)![0]).toEqual([
      expect.objectContaining({ key: 'a' }),
    ])

    menus.find((item: any) => item.id === 'close-all').onClick()
    expect(wrapper.emitted('remove')!.at(-1)![0]).toEqual([
      expect.objectContaining({ key: 'a' }),
      expect.objectContaining({ key: 'c' }),
      expect.objectContaining({ key: 'd' }),
    ])

    menus.find((item: any) => item.id === 'fix').onClick()
    expect((wrapper.emitted('change-list')!.at(-1)![0] as any[]).find(x => x.key === 'c')).toMatchObject({
      fixed: true,
      temporary: false,
    })

    await wrapper.find('[data-key="a"]').trigger('dblclick')
    expect(wrapper.emitted('dblclick-item')![0][0]).toMatchObject({ key: 'a' })

    await wrapper.find('.tabs').trigger('dblclick')
    expect(wrapper.emitted('dblclick-blank')).toBeTruthy()

    const keydown = mocks.registerHook.mock.calls.find(([name]) => name === 'GLOBAL_KEYDOWN')![1]
    const keyboardEvent = { ctrlKey: true, altKey: false, metaKey: false, code: 'Digit1', preventDefault: vi.fn(), stopPropagation: vi.fn() }
    keydown(keyboardEvent)

    sortableOptions.onEnd({ oldIndex: 3, newIndex: 1 })
    expect((wrapper.emitted('change-list')!.at(-1)![0] as any[]).map(x => x.key)).toEqual(['b', 'd', 'a', 'c'])

    expect(sortableOptions.onMove({
      related: { classList: { contains: vi.fn(() => true) } },
      dragged: { classList: { contains: vi.fn(() => false) } },
    })).toBe(false)

    const tabsEl = wrapper.find('.tabs').element as HTMLElement
    Object.defineProperties(tabsEl, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 300 },
    })
    await wrapper.find('.tabs').trigger('mousewheel', { deltaX: 0, deltaY: 40 })
    expect(tabsEl.scrollLeft).toBe(40)
    ;(wrapper.vm as any).handleShadow()
    expect(tabsEl.classList.contains('left')).toBe(false)
    expect(tabsEl.classList.contains('right')).toBe(false)
  })
})

describe('IndexStatus', () => {
  test('emits status changes and switches repositories from command html', async () => {
    mocks.storeState.currentRepo = { name: 'notes', enableIndexing: true }
    mocks.storeState.currentFile = { repo: 'other' }

    const wrapper = mount(IndexStatus, {
      global: {
        mocks: {
          $t: (key: string, value?: string) => key === 'index-status.switch-repository-html'
            ? `<button data-command="switch-repository">switch ${value}</button>`
            : key,
        },
      },
    })

    expect(wrapper.emitted('status-change')).toEqual([[ 'not-same-repo' ]])
    expect(wrapper.text()).toContain('switch other')

    await wrapper.find('[data-command="switch-repository"]').trigger('click')
    expect(mocks.setCurrentRepo).toHaveBeenCalledWith('other')
  })

  test('enables, disables, rebuilds, and renders indexed fallback slot', async () => {
    mocks.storeState.currentRepo = { name: 'notes', enableIndexing: false }
    mocks.storeState.currentFile = { repo: 'notes' }

    const wrapper = mount(IndexStatus, {
      props: { title: 'Index ready' },
      global: {
        mocks: {
          $t: (key: string, value?: string) => key === 'index-status.enable-indexing-html'
            ? `<button data-command="enable-indexing">enable ${value}</button>`
            : key,
        },
      },
    })

    expect(wrapper.emitted('status-change')).toEqual([[ 'index-disabled' ]])
    await wrapper.find('[data-command="enable-indexing"]').trigger('click')
    expect(mocks.toggleRepoIndexing).toHaveBeenCalledWith('notes', true)

    mocks.toggleRepoIndexing.mockClear()
    wrapper.unmount()
    mocks.storeState.currentRepo = { name: 'notes', enableIndexing: true }
    mocks.storeState.currentRepoIndexStatus = {
      status: { ready: true, indexed: 5, total: 7, cost: 11 },
    }
    const indexedWrapper = mount(IndexStatus, {
      props: { title: 'Index ready' },
    })

    expect(indexedWrapper.text()).toContain('index-status.indexed 5 (11ms)')
    expect(indexedWrapper.text()).toContain('Index ready')

    await indexedWrapper.find('.index-action a').trigger('click')
    expect(mocks.rebuildCurrentRepo).toHaveBeenCalled()

    await indexedWrapper.findAll('.index-action a')[1].trigger('click')
    expect(mocks.toggleRepoIndexing).toHaveBeenCalledWith('notes', false)
  })

  test('reports indexing progress', () => {
    mocks.storeState.currentRepo = { name: 'notes', enableIndexing: true }
    mocks.storeState.currentFile = { repo: 'notes' }
    mocks.storeState.currentRepoIndexStatus = {
      status: { ready: false, indexed: 3, cost: 40, processing: 'file.md' },
    }

    const wrapper = mount(IndexStatus)

    expect(wrapper.emitted('status-change')).toEqual([[ 'indexing' ]])
    expect(wrapper.text()).toContain('[notes] index-status.indexing (3) (40ms)')
    expect(wrapper.find('.processing').text()).toBe('file.md')
  })
})

describe('SettingPanel', () => {
  test('passes store visibility into mask and closes from mask or setting events', async () => {
    mocks.storeState.showSetting = true
    const wrapper = shallowMount(SettingPanel, {
      global: {
        stubs: {
          XMask: {
            props: ['show', 'maskCloseable'],
            template: '<div class="mask-stub" :data-show="show" @click="$emit(\'close\')"><slot /></div>',
          },
          Setting: {
            template: '<button class="setting-stub" @click="$emit(\'close\')">Setting</button>',
          },
        },
      },
    })

    expect(wrapper.find('.mask-stub').attributes('data-show')).toBe('true')

    await wrapper.find('.setting-stub').trigger('click')
    expect(mocks.storeState.showSetting).toBe(false)

    mocks.storeState.showSetting = true
    await nextTick()

    await wrapper.find('.mask-stub').trigger('click')
    expect(mocks.storeState.showSetting).toBe(false)
  })
})
