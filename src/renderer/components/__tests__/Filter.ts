import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  actions: new Map<string, any>(),
  switchDoc: vi.fn(),
  storeState: { currentRepo: { name: 'repo-a' } },
  quickOpenSwitchTab: vi.fn(),
  quickOpenUpdateSearchText: vi.fn(),
}))

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action.handler),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/core/keybinding', () => ({
  CtrlCmd: 'Cmd',
}))

vi.mock('@fe/services/document', () => ({
  switchDoc: mocks.switchDoc,
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string) => key,
}))

vi.mock('@share/misc', () => ({
  isMarkdownFile: (path: string) => path.endsWith('.md'),
}))

vi.mock('@fe/support/store', () => ({
  default: { state: mocks.storeState },
}))

vi.mock('../Mask.vue', () => ({
  default: {
    name: 'XMask',
    props: ['show'],
    emits: ['close'],
    template: '<div class="mask-stub"><slot /></div>',
  },
}))

vi.mock('../QuickOpen.vue', () => ({
  default: {
    name: 'QuickOpen',
    props: ['filterItem'],
    emits: ['choose-item', 'close'],
    methods: {
      switchTab: mocks.quickOpenSwitchTab,
      updateSearchText: mocks.quickOpenUpdateSearchText,
    },
    template: '<div class="quick-open-stub" />',
  },
}))

import Filter from '../Filter.vue'

const doc = { type: 'file', repo: 'repo-a', path: '/a.md', name: 'a.md' }

beforeEach(() => {
  mocks.actions.clear()
  mocks.switchDoc.mockClear()
  mocks.storeState.currentRepo = { name: 'repo-a' }
  mocks.quickOpenSwitchTab.mockClear()
  mocks.quickOpenUpdateSearchText.mockClear()
})

describe('Filter', () => {
  test('registers quick-open actions, applies query options and switches selected document', async () => {
    const wrapper = mount(Filter)
    await nextTick()

    expect(mocks.actions.has('workbench.show-quick-open')).toBe(true)
    expect(mocks.actions.has('filter.choose-document')).toBe(true)

    mocks.actions.get('workbench.show-quick-open')({ query: 'tag:', tab: 'tag' })
    await nextTick()
    await nextTick()

    expect((wrapper.vm as any).show).toBe(true)
    expect(mocks.quickOpenSwitchTab).toHaveBeenCalledWith('tag')
    expect(mocks.quickOpenUpdateSearchText).toHaveBeenCalledWith('tag:')

    wrapper.findComponent({ name: 'QuickOpen' }).vm.$emit('choose-item', { type: 'file', payload: doc })
    expect(mocks.switchDoc).toHaveBeenCalledWith(doc)
    await nextTick()
    expect((wrapper.vm as any).show).toBe(false)

    wrapper.unmount()
    expect(mocks.actions.size).toBe(0)
  })

  test('choose-document filters current repo markdown files and handles tag drilldown and close', async () => {
    const wrapper = mount(Filter)
    await nextTick()

    const promise = mocks.actions.get('filter.choose-document')()
    await nextTick()

    const filterItem = (wrapper.vm as any).filterItem
    expect(filterItem({ type: 'tag', payload: '#todo' })).toBe(true)
    expect(filterItem({ type: 'file', payload: { ...doc, repo: 'other' } })).toBe(false)
    expect(filterItem({ type: 'file', payload: { ...doc, path: '/a.txt' } })).toBe(false)
    expect(filterItem({ type: 'file', payload: doc })).toBe(true)

    wrapper.findComponent({ name: 'QuickOpen' }).vm.$emit('choose-item', { type: 'tag', payload: '#todo' })
    expect(mocks.quickOpenSwitchTab).toHaveBeenCalledWith('file')
    expect(mocks.quickOpenUpdateSearchText).toHaveBeenCalledWith('#todo ')
    expect((wrapper.vm as any).show).toBe(true)

    wrapper.findComponent({ name: 'QuickOpen' }).vm.$emit('choose-item', { type: 'file', payload: doc })
    await expect(promise).resolves.toBe(doc)

    const closePromise = mocks.actions.get('filter.choose-document')()
    await nextTick()
    wrapper.findComponent({ name: 'XMask' }).vm.$emit('close')
    await expect(closePromise).resolves.toBe(null)
  })
})
