import { nextTick } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: {
    tree: [] as any[],
    recentOpenTime: {} as Record<string, number>,
    currentRepo: { name: 'repo' },
    currentFile: { repo: 'repo' },
    currentRepoIndexStatus: { status: { ready: true } },
  },
  fetchSettings: vi.fn(),
  getMarkedFiles: vi.fn(),
  isMarked: vi.fn(),
  tableEach: vi.fn(),
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@fe/others/fuzzy-match', () => ({
  fuzzyMatch: (query: string, text: string) => ({
    matched: text.toLowerCase().includes(query.toLowerCase()),
    score: text.toLowerCase().indexOf(query.toLowerCase()) + 1,
  }),
}))

vi.mock('@fe/services/setting', () => ({
  fetchSettings: mocks.fetchSettings,
}))

vi.mock('@fe/services/document', () => ({
  getMarkedFiles: mocks.getMarkedFiles,
  isMarked: mocks.isMarked,
  supported: (node: any) => node.type === 'file',
}))

vi.mock('@fe/support/store', async () => {
  const { reactive } = await import('vue')
  mocks.storeState = reactive(mocks.storeState)
  return {
    default: { state: mocks.storeState },
  }
})

vi.mock('@fe/plugins/markdown-hashtags/lib', () => ({
  RE_MATCH: /#[\w-]+/g,
}))

vi.mock('@fe/services/indexer', () => ({
  getDocumentsManager: () => ({
    getTable: () => ({
      where: () => ({ each: mocks.tableEach }),
    }),
  }),
}))

vi.mock('../IndexStatus.vue', () => ({
  default: { name: 'IndexStatus', template: '<div class="index-status-stub" />' },
}))

import QuickOpen from '../QuickOpen.vue'

const mountQuickOpen = (props = {}) => shallowMount(QuickOpen, {
  props,
  global: {
    mocks: { $t: (key: string) => key },
    directives: { autoFocus: {} },
    stubs: { IndexStatus: true },
  },
})

beforeEach(() => {
  Element.prototype.scrollIntoViewIfNeeded = vi.fn()
  mocks.storeState.tree = [
    { type: 'dir', name: 'docs', path: '/docs', repo: 'repo', children: [
      { type: 'file', name: 'Alpha.md', path: '/docs/alpha.md', repo: 'repo' },
      { type: 'file', name: 'Beta.md', path: '/docs/beta.md', repo: 'repo' },
    ] },
  ]
  mocks.storeState.recentOpenTime = { 'repo|/docs/beta.md': 20, 'repo|/docs/alpha.md': 10 }
  mocks.storeState.currentRepo = { name: 'repo' }
  mocks.storeState.currentFile = { repo: 'repo' }
  mocks.storeState.currentRepoIndexStatus = { status: { ready: true } }
  mocks.fetchSettings.mockResolvedValue(undefined)
  mocks.getMarkedFiles.mockReturnValue([{ type: 'file', name: 'Marked.md', path: '/marked.md', repo: 'repo' }])
  mocks.isMarked.mockReturnValue(false)
  mocks.tableEach.mockImplementation(async (cb: any) => {
    await cb({ repo: 'repo', path: '/docs/alpha.md', tags: ['#vue', '#test'] })
    await cb({ repo: 'repo', path: '/docs/beta.md', tags: ['#test'] })
  })
})

describe('QuickOpen', () => {
  test('loads marked files, switches to file tab, filters and emits choices', async () => {
    const wrapper = mountQuickOpen()
    await flushPromises()
    await nextTick()

    expect(wrapper.find('.result li').text()).toContain('quick-open.empty')

    await wrapper.findAll('.tab > div')[1].trigger('click')
    await nextTick()
    expect((wrapper.vm as any).dataList.map((x: any) => x.title)).toEqual(['Beta.md', 'Alpha.md'])

    await wrapper.find('input').setValue('alp')
    await nextTick()
    expect(wrapper.findAll('.result li')).toHaveLength(1)
    expect(wrapper.find('.result li').text()).toContain('Alpha.md')

    await wrapper.find('.filter').trigger('keypress.enter')
    expect(wrapper.emitted('choose-item')?.[0][0]).toMatchObject({ title: 'Alpha.md', type: 'file' })
  })

  test('supports keyboard selection, mouse selection, tag tab, and index-status branch', async () => {
    const wrapper = mountQuickOpen({ filterItem: (item: any) => item.title !== 'Beta.md' })
    await flushPromises()
    await nextTick()

    await wrapper.findAll('.tab > div')[1].trigger('click')
    await nextTick()
    expect(wrapper.find('.result li').text()).toContain('Alpha.md')

    await wrapper.findAll('.tab > div')[2].trigger('click')
    await nextTick()
    expect((wrapper.vm as any).searchText).toBe('')
    expect((wrapper.vm as any).dataList.map((x: any) => x.title)).toEqual(['#test', '#vue'])

    await wrapper.find('.filter').trigger('keydown.down')
    expect((wrapper.vm as any).selected.title).toBe('#vue')

    ;(wrapper.vm as any).disableMouseover = false
    await nextTick()
    await wrapper.findAll('.result li')[0].trigger('mouseover')
    expect((wrapper.vm as any).selected.title).toBe('#test')

    mocks.storeState.currentRepoIndexStatus = { status: { ready: false } }
    await wrapper.find('input').setValue('anything')
    await nextTick()
    expect((wrapper.vm as any).indexStatusVisible).toBe(true)
  })
})
