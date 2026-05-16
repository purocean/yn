import { nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  FLAG_READONLY: false,
  storeState: {
    currentRepo: null as any,
    tree: [] as any[],
    recentOpenTime: {} as Record<string, number>,
  },
  showExtensionManager: vi.fn(),
  showPremium: vi.fn(),
  getPurchased: vi.fn(),
  showSettingPanel: vi.fn(),
  createDoc: vi.fn(),
  switchDoc: vi.fn(),
  getActionHandler: vi.fn(),
  actionHandler: vi.fn(),
}))

vi.mock('@fe/support/args', () => ({
  get FLAG_READONLY () {
    return mocks.FLAG_READONLY
  },
  URL_GITHUB: 'https://github.example/yank-note',
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@fe/support/store', async () => {
  const { reactive } = await import('vue')
  mocks.storeState = reactive(mocks.storeState)
  return {
    default: { state: mocks.storeState },
  }
})

vi.mock('@fe/others/extension', () => ({
  showManager: mocks.showExtensionManager,
}))

vi.mock('@fe/others/premium', () => ({
  showPremium: mocks.showPremium,
  getPurchased: mocks.getPurchased,
}))

vi.mock('@fe/services/setting', () => ({
  showSettingPanel: mocks.showSettingPanel,
}))

vi.mock('@fe/services/document', () => ({
  createDoc: mocks.createDoc,
  supported: (node: any) => node.type === 'file' && node.supported !== false,
  switchDoc: mocks.switchDoc,
}))

vi.mock('@fe/core/action', () => ({
  getActionHandler: mocks.getActionHandler,
}))

vi.mock('@share/misc', () => ({
  GUIDE_URL: 'https://guide.example',
}))

vi.mock('dayjs', () => ({
  default: () => ({ fromNow: () => 'some time ago' }),
}))

import GetStarted from '../GetStarted.vue'

function mountGetStarted () {
  return mount(GetStarted, {
    global: {
      mocks: { $t: (key: string) => key },
    },
  })
}

function itemLinks (wrapper: any) {
  return wrapper.findAll('.item a').map((link: any) => link.text())
}

beforeEach(() => {
  mocks.FLAG_READONLY = false
  mocks.storeState.currentRepo = null
  mocks.storeState.tree = []
  mocks.storeState.recentOpenTime = {}
  mocks.showExtensionManager.mockReset()
  mocks.showPremium.mockReset()
  mocks.getPurchased.mockReset()
  mocks.getPurchased.mockReturnValue(false)
  mocks.showSettingPanel.mockReset()
  mocks.createDoc.mockReset()
  mocks.createDoc.mockResolvedValue(undefined)
  mocks.switchDoc.mockReset()
  mocks.getActionHandler.mockReset()
  mocks.getActionHandler.mockReturnValue(mocks.actionHandler)
  mocks.actionHandler.mockReset()
  vi.spyOn(window, 'open').mockImplementation(() => null)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GetStarted', () => {
  test('shows add repository when there is no current repository and opens settings', async () => {
    const wrapper = mountGetStarted()

    expect(wrapper.find('.start').exists()).toBe(true)
    expect(itemLinks(wrapper)).toContain('tree.add-repo...')
    expect(itemLinks(wrapper)).not.toContain('tree.context-menu.create-doc...')

    await wrapper.find('.start .item a').trigger('click')
    expect(mocks.showSettingPanel).toHaveBeenCalledTimes(1)
  })

  test('shows repository actions and dispatches their services', async () => {
    mocks.storeState.currentRepo = { name: 'notes' }
    const wrapper = mountGetStarted()

    expect(itemLinks(wrapper)).toEqual(expect.arrayContaining([
      'tree.context-menu.create-doc...',
      'status-bar.nav.goto...',
      'premium.premium...',
      'status-bar.extension.extension-manager...',
      'status-bar.setting...',
    ]))

    const links = wrapper.findAll('.start .item a')
    await links[0].trigger('click')
    expect(mocks.createDoc).toHaveBeenCalledWith(
      { repo: 'notes' },
      { type: 'dir', name: 'root', path: '/', repo: 'notes' },
    )

    await links[1].trigger('click')
    expect(mocks.getActionHandler).toHaveBeenCalledWith('workbench.show-quick-open')
    expect(mocks.actionHandler).toHaveBeenCalledTimes(1)

    await links[2].trigger('click')
    expect(mocks.showPremium).toHaveBeenCalledTimes(1)

    await links[3].trigger('click')
    expect(mocks.showExtensionManager).toHaveBeenCalledTimes(1)

    await links[4].trigger('click')
    expect(mocks.showSettingPanel).toHaveBeenCalledTimes(1)
  })

  test('hides premium when already purchased', () => {
    mocks.storeState.currentRepo = { name: 'notes' }
    mocks.getPurchased.mockReturnValue(true)

    const wrapper = mountGetStarted()

    expect(itemLinks(wrapper)).not.toContain('premium.premium...')
  })

  test('recursively collects recent files, sorts by open time, and limits to five', async () => {
    mocks.storeState.currentRepo = { name: 'notes' }
    const files = [
      { type: 'file', name: 'Old.md', path: '/old.md', repo: 'notes' },
      { type: 'file', name: 'Second.md', path: '/folder/second.md', repo: 'notes' },
      { type: 'file', name: 'First.md', path: '/folder/deep/first.md', repo: 'notes' },
      { type: 'file', name: 'Fourth.md', path: '/fourth.md', repo: 'notes' },
      { type: 'file', name: 'Third.md', path: '/third.md', repo: 'notes' },
      { type: 'file', name: 'Fifth.md', path: '/fifth.md', repo: 'notes' },
      { type: 'file', name: 'NoTime.md', path: '/no-time.md', repo: 'notes' },
      { type: 'file', name: 'Unsupported.md', path: '/unsupported.md', repo: 'notes', supported: false },
    ]
    mocks.storeState.tree = [
      files[0],
      { type: 'dir', name: 'folder', path: '/folder', repo: 'notes', children: [
        files[1],
        { type: 'dir', name: 'deep', path: '/folder/deep', repo: 'notes', children: [files[2]] },
      ] },
      files[3],
      files[4],
      files[5],
      files[6],
      files[7],
    ]
    mocks.storeState.recentOpenTime = {
      'notes|/old.md': 10,
      'notes|/folder/second.md': 90,
      'notes|/folder/deep/first.md': 100,
      'notes|/fourth.md': 70,
      'notes|/third.md': 80,
      'notes|/fifth.md': 60,
      'notes|/unsupported.md': 110,
    }

    const wrapper = mountGetStarted()
    await nextTick()

    const recentLinks = wrapper.findAll('.recent .item a')
    expect(recentLinks.map((link: any) => link.text())).toEqual([
      'First.md',
      'Second.md',
      'Third.md',
      'Fourth.md',
      'Fifth.md',
      'more…',
    ])

    await recentLinks[0].trigger('click')
    expect(mocks.switchDoc).toHaveBeenCalledWith(files[2])

    await recentLinks[5].trigger('click')
    expect(mocks.getActionHandler).toHaveBeenCalledWith('workbench.show-quick-open')
  })

  test('opens help actions and feedback URL', async () => {
    const wrapper = mountGetStarted()
    const links = wrapper.findAll('.help .item a')

    expect(links[0].attributes('href')).toBe('https://guide.example')

    await links[1].trigger('click')
    expect(mocks.getActionHandler).toHaveBeenCalledWith('plugin.status-bar-help.show-readme')

    await links[2].trigger('click')
    expect(mocks.getActionHandler).toHaveBeenCalledWith('plugin.status-bar-help.show-features')

    await links[3].trigger('click')
    expect(mocks.getActionHandler).toHaveBeenCalledWith('keyboard-shortcuts.show-manager')

    await links[4].trigger('click')
    expect(window.open).toHaveBeenCalledWith('https://github.example/yank-note')
  })

  test('hides the start section in readonly mode', async () => {
    mocks.FLAG_READONLY = true
    const wrapper = mountGetStarted()
    await flushPromises()

    expect(wrapper.find('.start').exists()).toBe(false)
    expect(wrapper.find('.help').exists()).toBe(true)
  })
})
