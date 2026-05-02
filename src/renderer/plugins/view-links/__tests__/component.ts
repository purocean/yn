import { reactive, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: undefined as any,
  isElectron: true,
  switchDoc: vi.fn(),
  openExternal: vi.fn(),
  windowOpen: vi.fn(),
  fixedFloatHide: vi.fn(),
  findByRepoAndPath: vi.fn(),
  tableDocs: [] as any[],
}))

vi.mock('@fe/utils/path', () => ({
  basename: (path: string) => path.split('/').pop(),
}))

vi.mock('@fe/support/store', () => ({
  default: {
    get state () { return mocks.storeState },
  },
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({
    t: (key: string, arg?: string) => arg ? `${key}:${arg}` : key,
  }),
}))

vi.mock('@fe/support/env', () => ({
  get isElectron () { return mocks.isElectron },
}))

vi.mock('@fe/services/base', () => ({
  openExternal: mocks.openExternal,
}))

vi.mock('@fe/services/document', () => ({
  switchDoc: mocks.switchDoc,
}))

vi.mock('@fe/support/ui/fixed-float', () => ({
  useFixedFloat: () => ({ hide: mocks.fixedFloatHide }),
}))

vi.mock('@fe/services/indexer', () => ({
  getDocumentsManager: () => ({
    findByRepoAndPath: mocks.findByRepoAndPath,
    getTable: () => ({
      where: vi.fn(() => ({
        each: (cb: Function) => {
          mocks.tableDocs.forEach(doc => cb(doc))
          return Promise.resolve()
        },
      })),
    }),
  }),
}))

vi.mock('@fe/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i class="svg-icon-stub" />' },
}))

vi.mock('@fe/components/IndexStatus.vue', () => ({
  default: { name: 'IndexStatus', props: ['title'], template: '<section class="index-status-stub"><slot /></section>' },
}))

vi.mock('@fe/components/GroupTabs.vue', () => ({
  default: {
    name: 'GroupTabs',
    props: ['tabs', 'modelValue'],
    emits: ['update:modelValue'],
    template: `
      <div class="group-tabs-stub">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-btn"
          :data-value="tab.value"
          @click="$emit('update:modelValue', tab.value)">
          {{ tab.label }}
        </button>
      </div>
    `,
  },
}))

import ViewLinksComponent from '../ViewLinksComponent.vue'

const currentDoc = { type: 'file', repo: 'repo-a', path: '/notes/current.md', name: 'current.md' }

function resetStore () {
  mocks.storeState = reactive({
    currentFile: { ...currentDoc },
    currentRepo: { name: 'repo-a' },
    currentRepoIndexStatus: { repo: 'repo-a', status: { ready: true } },
  })
}

function mountComponent () {
  return mount(ViewLinksComponent)
}

async function waitForList () {
  await flushPromises()
  await nextTick()
}

beforeEach(() => {
  resetStore()
  mocks.isElectron = true
  mocks.switchDoc.mockReset()
  mocks.openExternal.mockReset()
  mocks.windowOpen.mockReset()
  mocks.fixedFloatHide.mockReset()
  mocks.tableDocs = []
  mocks.findByRepoAndPath.mockReset()
  mocks.findByRepoAndPath.mockResolvedValue({
    links: [
      { href: '/notes/target.md', internal: '/notes/target.md', position: { anchor: 'intro' }, blockMap: [4] },
      { href: 'https://example.com', internal: null, position: null },
    ],
    resources: [
      { src: '/assets/pic.png', internal: '/assets/pic.png', blockMap: [8] },
      { src: 'https://cdn.example.com/pic.png', internal: null },
    ],
  })
  vi.stubGlobal('open', mocks.windowOpen)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ViewLinksComponent', () => {
  test('renders links tab and switches documents or opens external links in Electron', async () => {
    const wrapper = mountComponent()
    await waitForList()

    expect(wrapper.findAll('li').map(li => li.text())).toEqual(['notes/target#intro', 'https://example.com'])
    expect(mocks.findByRepoAndPath).toHaveBeenCalledWith('repo-a', '/notes/current.md')

    await wrapper.findAll('a')[0].trigger('click')
    expect(mocks.switchDoc).toHaveBeenCalledWith(
      { type: 'file', repo: 'repo-a', path: '/notes/target.md', name: 'target.md' },
      { source: 'view-links', position: { anchor: 'intro' } },
    )

    mocks.switchDoc.mockClear()
    await wrapper.find('.item-icon-location').trigger('click')
    expect(mocks.switchDoc).toHaveBeenCalledWith(
      currentDoc,
      { source: 'view-links', position: { line: 5 } },
    )

    await wrapper.findAll('a')[1].trigger('click')
    expect(mocks.openExternal).toHaveBeenCalledWith('https://example.com')
    expect(mocks.windowOpen).not.toHaveBeenCalled()
  })

  test('opens external links with window.open outside Electron', async () => {
    mocks.isElectron = false
    const wrapper = mountComponent()
    await waitForList()

    await wrapper.findAll('a')[1].trigger('click')
    expect(mocks.windowOpen).toHaveBeenCalledWith('https://example.com')
    expect(mocks.openExternal).not.toHaveBeenCalled()
  })

  test('renders resources and back-links tabs', async () => {
    mocks.tableDocs = [
      {
        repo: 'repo-a',
        path: '/notes/source.md',
        links: [{ internal: '/notes/current.md', blockMap: [11] }],
      },
      {
        repo: 'repo-a',
        path: '/notes/other.md',
        links: [{ internal: '/notes/different.md' }],
      },
    ]
    const wrapper = mountComponent()
    await waitForList()

    await wrapper.find('[data-value="resources"]').trigger('click')
    await waitForList()
    expect(wrapper.findAll('li').map(li => li.text())).toEqual(['assets/pic.png', 'https://cdn.example.com/pic.png'])

    await wrapper.find('[data-value="back-links"]').trigger('click')
    await waitForList()
    expect(wrapper.findAll('li').map(li => li.text())).toEqual(['notes/source:12'])

    await wrapper.find('a').trigger('click')
    expect(mocks.switchDoc).toHaveBeenLastCalledWith(
      { type: 'file', repo: 'repo-a', path: '/notes/source.md', name: 'source.md' },
      { source: 'view-links', position: { line: 12 } },
    )
  })

  test('returns an empty list while index is not ready or belongs to another repo', async () => {
    mocks.storeState.currentRepoIndexStatus = { repo: 'repo-a', status: { ready: false } }
    const notReadyWrapper = mountComponent()
    await waitForList()
    expect(notReadyWrapper.findAll('li')).toHaveLength(0)
    expect(notReadyWrapper.text()).toContain('view-links.no-result')
    expect(mocks.findByRepoAndPath).not.toHaveBeenCalled()

    mocks.findByRepoAndPath.mockClear()
    resetStore()
    mocks.storeState.currentRepoIndexStatus = { repo: 'repo-b', status: { ready: true } }
    const repoMismatchWrapper = mountComponent()
    await waitForList()
    expect(repoMismatchWrapper.findAll('li')).toHaveLength(0)
    expect(repoMismatchWrapper.text()).toContain('view-links.no-result')
    expect(mocks.findByRepoAndPath).not.toHaveBeenCalled()
  })

  test('closes fixed float when current file repo or current repo changes', async () => {
    const wrapper = mountComponent()
    await waitForList()

    mocks.storeState.currentFile = { ...currentDoc, repo: 'repo-b' }
    await nextTick()
    expect(mocks.fixedFloatHide).toHaveBeenCalledTimes(1)

    mocks.storeState.currentFile = { ...currentDoc }
    mocks.storeState.currentRepo = { name: 'repo-b' }
    await nextTick()
    expect(mocks.fixedFloatHide).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })
})
