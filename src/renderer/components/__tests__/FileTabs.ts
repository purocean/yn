import { reactive, nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: undefined as any,
  storeGetters: { isSaved: { value: true } },
  hooks: new Map<string, Function>(),
  actions: new Map<string, Function>(),
  switchDoc: vi.fn(),
  actionBtns: [] as any[],
  contextMenus: [] as any[],
}))

vi.mock('@fe/core/keybinding', () => ({
  Alt: 'Alt',
  CtrlCmd: 'Cmd',
  Shift: 'Shift',
  getKeysLabel: (name: string) => `[${name}]`,
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => mocks.hooks.set(name, handler),
  removeHook: (name: string) => mocks.hooks.delete(name),
}))

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action.handler),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/services/document', () => ({
  cloneDoc: (doc: any) => doc ? { ...doc } : null,
  isEncrypted: (doc: any) => !!doc?.encrypted,
  isOutOfRepo: (doc: any) => !!doc?.outOfRepo,
  isSameFile: (a: any, b: any) => a?.repo === b?.repo && a?.path === b?.path,
  isSubOrSameFile: (parent: any, child: any) => !!parent && !!child && child.repo === parent.repo && (child.path === parent.path || child.path.startsWith(`${parent.path}/`)),
  supported: (doc: any) => !doc || doc.type === 'file',
  switchDoc: mocks.switchDoc,
  toUri: (doc: any) => doc ? `${doc.repo}:${doc.path}` : 'yank-note://system/blank.md',
}))

vi.mock('@fe/support/store', () => ({
  default: {
    get state () { return mocks.storeState },
    getters: mocks.storeGetters,
  },
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    $t: { value: (key: string) => key },
  }),
}))

vi.mock('@fe/services/workbench', () => ({
  FileTabs: {
    getActionBtns: () => mocks.actionBtns,
    getTabContextMenus: () => mocks.contextMenus,
  },
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: (_key: string, fallback: any) => fallback,
}))

vi.mock('@fe/support/env', () => ({ isElectron: true }))

vi.mock('../Tabs.vue', () => ({
  default: {
    name: 'Tabs',
    props: ['list', 'value', 'filterBtnTitle', 'actionBtns', 'hookContextMenu'],
    emits: ['remove', 'switch', 'change-list', 'dblclick-item', 'dblclick-blank'],
    methods: { showQuickFilter: vi.fn() },
    template: '<div class="tabs-stub"><button v-for="item in list" :key="item.key" class="tab" @click="$emit(\'switch\', item)">{{item.label}}</button><slot /></div>',
  },
}))

import FileTabs from '../FileTabs.vue'

const docA = { type: 'file', repo: 'repo', path: '/a.md', name: 'a.md', status: 'loaded' }
const docB = { type: 'file', repo: 'repo', path: '/b.md', name: 'b.md', status: 'loaded' }

const mountFileTabs = () => shallowMount(FileTabs)

beforeEach(() => {
  mocks.storeState = reactive({
    currentFile: docA,
    tabs: [],
  })
  mocks.storeGetters.isSaved.value = true
  mocks.hooks.clear()
  mocks.actions.clear()
  mocks.switchDoc.mockReset()
  mocks.actionBtns = []
  mocks.contextMenus = []
})

describe('FileTabs', () => {
  test('registers actions, creates current file tab, switches and removes tabs', async () => {
    const wrapper = mountFileTabs()
    await nextTick()

    expect(mocks.hooks.has('DOC_MOVED')).toBe(true)
    expect(mocks.actions.has('file-tabs.switch-left')).toBe(true)
    expect(mocks.storeState.tabs).toHaveLength(1)
    expect(mocks.storeState.tabs[0]).toMatchObject({ key: 'repo:/a.md' })
    expect((wrapper.vm as any).fileTabs[0].label).toBe('a.md')

    await wrapper.findComponent({ name: 'Tabs' }).vm.$emit('switch', mocks.storeState.tabs[0])
    expect(mocks.switchDoc).toHaveBeenCalledWith(docA)

    mocks.storeState.currentFile = docB
    await nextTick()
    expect(mocks.storeState.tabs.map((x: any) => x.key)).toEqual(['repo:/b.md'])

    await wrapper.findComponent({ name: 'Tabs' }).vm.$emit('remove', [{ key: 'repo:/b.md' }])
    expect(mocks.storeState.tabs).toEqual([])
  })

  test('handles hooks, tab mutations, action buttons and context menus', async () => {
    mocks.actionBtns = [{ icon: 'sync', title: 'Refresh', type: 'normal' }]
    mocks.contextMenus = [{ label: 'Close Others' }]
    const wrapper = mountFileTabs()
    await nextTick()

    mocks.storeGetters.isSaved.value = false
    mocks.storeState.currentFile = { ...docA, status: 'loaded' }
    await nextTick()
    expect((wrapper.vm as any).fileTabs[0].label).toBe('*a.md')
    expect((wrapper.vm as any).fileTabs[0].temporary).toBe(false)

    await mocks.hooks.get('DOC_CREATED')?.({ doc: docB })
    expect(mocks.switchDoc).toHaveBeenCalledWith(docB)

    await mocks.hooks.get('DOC_MOVED')?.({ oldDoc: docA, newDoc: docB })
    expect(mocks.switchDoc).toHaveBeenCalledWith(docB)

    ;(wrapper.vm as any).setTabs([
      { key: 'repo:/out.md', label: 'out.md', payload: { file: { ...docA, path: '/out.md', outOfRepo: true } } },
    ])
    expect(mocks.storeState.tabs[0].class).toBe('out-of-repo')

    const menus: any[] = []
    ;(wrapper.vm as any).hookContextMenu({ key: 'repo:/out.md' }, menus)
    expect(menus).toEqual([{ type: 'separator' }, { label: 'Close Others' }])

    mocks.actions.get('file-tabs.refresh-action-btns')?.()
    expect((wrapper.vm as any).actionBtns[0].icon).toBe('plus-regular')

    await wrapper.findComponent({ name: 'Tabs' }).vm.$emit('dblclick-blank')
    expect(mocks.switchDoc).toHaveBeenCalledWith(null)
  })

  test('covers command actions, tab label states, failed switches, deletion, and permanence hooks', async () => {
    const wrapper = mountFileTabs()
    await nextTick()

    mocks.storeState.currentFile = { ...docA, writeable: false, status: 'loaded' }
    mocks.storeGetters.isSaved.value = true
    await nextTick()
    expect((wrapper.vm as any).fileTabs[0].label).toBe('🔒a.md')

    mocks.storeState.currentFile = { ...docA, status: 'save-failed' }
    await nextTick()
    expect((wrapper.vm as any).fileTabs[0].label).toBe('!a.md')

    mocks.storeState.currentFile = { ...docA, status: 'loading' }
    await nextTick()
    expect((wrapper.vm as any).fileTabs[0].label).toBe('…a.md')

    mocks.storeState.currentFile = null
    await nextTick()
    expect(mocks.storeState.tabs.some((tab: any) => tab.key === 'yank-note://system/blank.md')).toBe(true)

    mocks.storeState.currentFile = docA
    await nextTick()
    mocks.storeState.currentFile = docB
    await nextTick()
    mocks.switchDoc.mockClear()

    mocks.actions.get('file-tabs.switch-left')?.()
    expect(mocks.switchDoc).toHaveBeenCalled()
    mocks.actions.get('file-tabs.switch-right')?.()
    expect(mocks.switchDoc).toHaveBeenCalled()

    mocks.switchDoc.mockClear()
    mocks.actions.get('file-tabs.show-welcome')?.()
    expect(mocks.switchDoc).toHaveBeenCalledWith(null)

    const tabsComponent = wrapper.findComponent({ name: 'Tabs' })
    ;(tabsComponent.vm as any).showQuickFilter = vi.fn()
    mocks.actions.get('file-tabs.search-tabs')?.()
    expect((tabsComponent.vm as any).showQuickFilter).toHaveBeenCalled()

    const currentKey = (wrapper.vm as any).current
    mocks.actions.get('file-tabs.close-current')?.()
    expect(mocks.storeState.tabs.every((tab: any) => tab.key !== currentKey)).toBe(true)

    mocks.storeState.tabs = [
      { key: 'repo:/secret.md', label: 'secret.md', payload: { file: { repo: 'repo', path: '/secret.md', encrypted: true } } },
      { key: 'repo:/missing.md', label: 'missing.md', payload: { file: { repo: 'repo', path: '/missing.md' } } },
    ] as any
    await mocks.hooks.get('DOC_SWITCH_FAILED')?.({ doc: { repo: 'repo', path: '/secret.md', encrypted: true }, message: 'locked' })
    await mocks.hooks.get('DOC_SWITCH_FAILED')?.({ doc: { repo: 'repo', path: '/missing.md' }, message: 'Error: NOENT' })
    expect(mocks.storeState.tabs).toEqual([])

    mocks.storeState.tabs = [
      { key: 'repo:/a.md', label: 'a.md', temporary: true, payload: { file: docA } },
    ] as any
    await mocks.hooks.get('TREE_NODE_DBLCLICK')?.({ node: docA })
    expect(mocks.storeState.tabs[0].temporary).toBe(false)

    mocks.actions.get('file-tabs.close-tabs')?.(['repo:/a.md'])
    expect(mocks.storeState.tabs).toEqual([])

    wrapper.unmount()
    expect(mocks.hooks.size).toBe(0)
    expect(mocks.actions.size).toBe(0)
  })
})
