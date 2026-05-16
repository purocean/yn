import { reactive, ref, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: undefined as any,
  isSaved: undefined as any,
  win: undefined as any,
  listeners: new Map<string, Function>(),
  isEncrypted: vi.fn(),
  isOutOfRepo: vi.fn(),
}))

vi.mock('@fe/support/store', async () => {
  const { ref } = await import('vue')
  mocks.isSaved = ref(false)
  return {
    default: {
      get state () { return mocks.storeState },
      getters: {
        get isSaved () { return mocks.isSaved },
      },
    },
  }
})

vi.mock('@fe/support/args', () => ({
  HELP_REPO_NAME: 'help',
}))

vi.mock('@fe/support/env', () => ({
  isElectron: true,
  isMacOS: true,
  nodeRequire: true,
  getElectronRemote: () => ({
    getCurrentWindow: () => mocks.win,
  }),
}))

vi.mock('@fe/services/document', () => ({
  isEncrypted: mocks.isEncrypted,
  isOutOfRepo: mocks.isOutOfRepo,
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i class="svg-icon">{{name}}</i>' },
}))

import TitleBar from '../TitleBar.vue'

beforeEach(() => {
  mocks.storeState = reactive({
    currentFile: { repo: 'repo', path: '/docs/a.md', name: 'a.md', status: 'saved' },
    isFullscreen: false,
  })
  mocks.isSaved = ref(false)
  mocks.listeners.clear()
  mocks.win = {
    isMaximized: vi.fn(() => false),
    isAlwaysOnTop: vi.fn(() => false),
    isFocused: vi.fn(() => true),
    setAlwaysOnTop: vi.fn(),
    unmaximize: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    setDocumentEdited: vi.fn(),
    close: vi.fn(),
    on: vi.fn((name: string, handler: Function) => mocks.listeners.set(name, handler)),
    removeListener: vi.fn((name: string) => mocks.listeners.delete(name)),
  }
  mocks.isEncrypted.mockReset()
  mocks.isEncrypted.mockReturnValue(false)
  mocks.isOutOfRepo.mockReset()
  mocks.isOutOfRepo.mockReturnValue(false)
})

describe('TitleBar', () => {
  test('tracks electron window state and invokes window controls', async () => {
    const wrapper = mount(TitleBar, {
      global: { mocks: { $t: (key: string) => key } },
    })
    await flushPromises()
    await nextTick()

    expect(wrapper.find('.action').exists()).toBe(true)
    expect(wrapper.text()).toContain('[repo] */docs/a.md-file-status.unsaved')
    expect(document.title).toBe('a.md')
    expect(window.documentSaved).toBe(false)

    mocks.isSaved.value = true
    await nextTick()
    expect(window.documentSaved).toBe(true)
    expect(mocks.win.setDocumentEdited).toHaveBeenCalledWith(false)

    await wrapper.find('.pin').trigger('click')
    expect(mocks.win.setAlwaysOnTop).toHaveBeenCalledWith(true)

    await wrapper.find('.maximize').trigger('click')
    expect(mocks.win.maximize).toHaveBeenCalled()
    expect(mocks.win.setAlwaysOnTop).toHaveBeenCalledWith(false)

    await wrapper.find('.minimize').trigger('click')
    expect(mocks.win.minimize).toHaveBeenCalled()

    await wrapper.find('.btn-close').trigger('click')
    expect(mocks.win.close).toHaveBeenCalled()
  })

  test('updates styles for failed or encrypted unsaved files and cleans listeners', async () => {
    const wrapper = mount(TitleBar, {
      global: { mocks: { $t: (key: string) => key } },
    })
    await flushPromises()

    mocks.storeState.currentFile = { repo: 'repo', path: '/docs/a.md', name: 'a.md', status: 'save-failed' }
    await nextTick()
    expect((wrapper.vm as any).titleBarStyles).toEqual({ background: '#ff9800ad' })

    mocks.storeState.currentFile = { repo: 'help', name: 'Help.md', status: 'loaded' }
    await nextTick()
    expect(wrapper.text()).toContain('Help.md')

    mocks.listeners.get('enter-full-screen')?.()
    expect(mocks.storeState.isFullscreen).toBe(true)
    mocks.listeners.get('leave-full-screen')?.()
    expect(mocks.storeState.isFullscreen).toBe(false)

    wrapper.unmount()
    expect(mocks.win.removeListener).toHaveBeenCalledWith('maximize', expect.any(Function))
    expect(mocks.win.removeListener).toHaveBeenCalledWith('leave-full-screen', expect.any(Function))
  })
})
