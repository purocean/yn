import { flushPromises, mount } from '@vue/test-utils'

const extension = (overrides: any = {}) => ({
  id: 'ext-one',
  displayName: 'Extension One',
  version: '1.0.0',
  description: 'First extension',
  icon: '',
  origin: 'official',
  author: { name: 'Yank Note' },
  installed: false,
  enabled: false,
  compatible: { value: true, reason: '' },
  requirements: { premium: false, terminal: false },
  dist: { unpackedSize: 2048 },
  homepage: 'https://example.test/ext-one',
  license: 'MIT',
  readmeUrl: 'https://example.test/readme.md',
  changelogUrl: 'https://example.test/changelog.md',
  isDev: false,
  ...overrides,
})

const mocks = vi.hoisted(() => ({
  actions: new Map<string, Function>(),
  registryExtensions: [] as any[],
  installedExtensions: [] as any[],
  registryVersions: [] as any[],
  loadStatus: {} as Record<string, any>,
  getRegistryExtensions: vi.fn(),
  getInstalledExtensions: vi.fn(),
  getRegistryExtensionVersions: vi.fn(),
  install: vi.fn(),
  uninstall: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  abortInstallation: vi.fn(),
  proxyFetch: vi.fn(),
  toastShow: vi.fn(),
  modalConfirm: vi.fn(),
  contextMenuShow: vi.fn(),
  reloadMainWindow: vi.fn(),
  getPurchased: vi.fn(),
  showPremium: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
  open: vi.fn(),
}))

vi.mock('lodash-es', async () => {
  const actual: any = await vi.importActual('lodash-es')
  return {
    ...actual,
    debounce: (fn: any) => fn,
  }
})

vi.mock('@fe/services/i18n', () => ({
  getCurrentLanguage: () => 'en',
  useI18n: () => ({
    t: (key: string, value?: string) => value ? `${key}:${value}` : key,
    $t: { value: (key: string, value?: string) => value ? `${key}:${value}` : key },
  }),
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  sleep: () => Promise.resolve(),
}))

vi.mock('@fe/support/api', () => ({
  proxyFetch: mocks.proxyFetch,
}))

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action.handler),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/others/extension', () => ({
  registries: ['registry.npmjs.org', 'registry.npmmirror.com'],
  getRegistryExtensions: mocks.getRegistryExtensions,
  getInstalledExtensions: mocks.getInstalledExtensions,
  getRegistryExtensionVersions: mocks.getRegistryExtensionVersions,
  getLoadStatus: (id: string) => mocks.loadStatus[id] || {},
  install: mocks.install,
  uninstall: mocks.uninstall,
  enable: mocks.enable,
  disable: mocks.disable,
  abortInstallation: mocks.abortInstallation,
}))

vi.mock('@fe/services/base', () => ({
  reloadMainWindow: mocks.reloadMainWindow,
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: mocks.getSetting,
  setSetting: mocks.setSetting,
}))

vi.mock('@fe/support/ui/modal', () => ({
  useModal: () => ({ confirm: mocks.modalConfirm }),
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow }),
}))

vi.mock('@fe/support/ui/context-menu', () => ({
  useContextMenu: () => ({ show: mocks.contextMenuShow }),
}))

vi.mock('@fe/others/premium', () => ({
  getPurchased: mocks.getPurchased,
  showPremium: mocks.showPremium,
}))

vi.mock('@fe/support/args', () => ({
  FLAG_DISABLE_XTERM: false,
  FLAG_MAS: false,
  URL_MAS_LIMITATION: 'https://example.test/mas',
}))

vi.mock('../Mask.vue', () => ({
  default: { name: 'XMask', props: ['show'], emits: ['close'], template: '<div><slot /></div>' },
}))

vi.mock('../GroupTabs.vue', () => ({
  default: {
    name: 'GroupTabs',
    props: ['tabs', 'modelValue'],
    emits: ['update:modelValue'],
    template: '<div><button v-for="tab in tabs" :key="tab.value" class="tab" @click="$emit(\'update:modelValue\', tab.value)">{{tab.label}}</button></div>',
  },
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i class="svg-icon">{{name}}</i>' },
}))

import ExtensionManager from '../ExtensionManager.vue'

beforeEach(() => {
  vi.useRealTimers()
  Element.prototype.scrollIntoViewIfNeeded = vi.fn()
  window.open = mocks.open
  mocks.actions.clear()
  mocks.registryExtensions = [
    extension({
      id: 'ext-one',
      version: '2.0.0',
      displayName: 'Extension One',
      description: 'Registry version',
      readmeUrl: 'https://example.test/ext-one/readme.md',
      changelogUrl: 'https://example.test/ext-one/changelog.md',
    }),
    extension({
      id: 'ext-two',
      displayName: 'Extension Two',
      version: '1.0.0',
      description: 'Installable extension',
      origin: 'unknown',
      author: { name: 'Third Party' },
      homepage: 'https://example.test/ext-two',
      requirements: { premium: false, terminal: false },
    }),
  ]
  mocks.installedExtensions = [
    extension({
      id: 'ext-one',
      version: '1.0.0',
      displayName: 'Extension One',
      description: 'Installed version',
      installed: true,
      enabled: true,
      compatible: { value: true, reason: '' },
    }),
  ]
  mocks.registryVersions = [
    extension({ id: 'ext-two', version: '0.9.0', compatible: { value: true, reason: '' } }),
    extension({ id: 'ext-two', version: '0.8.0', compatible: { value: false, reason: 'Too old' } }),
  ]
  mocks.loadStatus = {
    'ext-one': { activationTime: 12.345, version: '1.0.0', plugin: true },
  }
  mocks.getRegistryExtensions.mockReset()
  mocks.getRegistryExtensions.mockImplementation(() => Promise.resolve(mocks.registryExtensions))
  mocks.getInstalledExtensions.mockReset()
  mocks.getInstalledExtensions.mockImplementation(() => Promise.resolve(mocks.installedExtensions))
  mocks.getRegistryExtensionVersions.mockReset()
  mocks.getRegistryExtensionVersions.mockImplementation(() => Promise.resolve(mocks.registryVersions))
  mocks.install.mockReset()
  mocks.install.mockResolvedValue(undefined)
  mocks.uninstall.mockReset()
  mocks.uninstall.mockResolvedValue(undefined)
  mocks.enable.mockReset()
  mocks.enable.mockResolvedValue(undefined)
  mocks.disable.mockReset()
  mocks.disable.mockResolvedValue(undefined)
  mocks.abortInstallation.mockReset()
  mocks.abortInstallation.mockResolvedValue(undefined)
  mocks.proxyFetch.mockReset()
  mocks.proxyFetch.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve('# Readme\n<small>note</small>'),
  })
  mocks.toastShow.mockReset()
  mocks.modalConfirm.mockReset()
  mocks.modalConfirm.mockResolvedValue(true)
  mocks.contextMenuShow.mockReset()
  mocks.reloadMainWindow.mockReset()
  mocks.getPurchased.mockReset()
  mocks.getPurchased.mockReturnValue(false)
  mocks.showPremium.mockReset()
  mocks.getSetting.mockReset()
  mocks.getSetting.mockImplementation((key: string, fallback: any) => {
    if (key === 'extension.auto-upgrade') return false
    return fallback
  })
  mocks.setSetting.mockReset()
  mocks.open.mockReset()
})

describe('ExtensionManager', () => {
  test('shows manager, fetches registry and installed extensions, selects first item, and loads markdown', async () => {
    const wrapper = mount(ExtensionManager, {
      global: { mocks: { $t: (key: string, value?: string) => value ? `${key}:${value}` : key } },
    })

    expect(mocks.actions.has('extension.show-manager')).toBe(true)

    await mocks.actions.get('extension.show-manager')?.()
    await flushPromises()

    expect(mocks.getRegistryExtensions).toHaveBeenCalledWith('registry.npmjs.org')
    expect(mocks.getInstalledExtensions).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Extension One')
    expect(wrapper.text()).toContain('extension.upgradable')
    expect(wrapper.text()).toContain('12.35ms')
    expect(mocks.proxyFetch).toHaveBeenCalledWith('https://example.test/ext-one/readme.md')

    wrapper.unmount()
    expect(mocks.actions.has('extension.show-manager')).toBe(false)
  })

  test('installs latest version, opens version menu, and rejects incompatible historical versions', async () => {
    const wrapper = mount(ExtensionManager, {
      global: { mocks: { $t: (key: string, value?: string) => value ? `${key}:${value}` : key } },
    })

    await mocks.actions.get('extension.show-manager')?.('ext-two')
    await flushPromises()

    const installButton = wrapper.findAll('button.small.tr')
      .find(button => button.text() === 'extension.install')!

    await installButton.trigger('click')
    await flushPromises()
    expect(mocks.install).toHaveBeenCalledWith(expect.objectContaining({ id: 'ext-two' }), 'registry.npmjs.org')
    expect(mocks.toastShow).toHaveBeenCalledWith('info', 'extension.toast-loaded')

    await installButton.trigger('contextmenu', { clientX: 11, clientY: 22 })
    await flushPromises()

    expect(mocks.getRegistryExtensionVersions).toHaveBeenCalledWith('ext-two', 'registry.npmjs.org')
    expect(mocks.contextMenuShow).toHaveBeenCalledWith(expect.any(Array), { mouseX: 11, mouseY: 22 })

    const menuItems = mocks.contextMenuShow.mock.calls[0][0]
    expect(menuItems[0]).toMatchObject({ id: 'ext-two@0.9.0', label: '0.9.0' })
    await menuItems[0].onClick()
    expect(mocks.install).toHaveBeenCalledWith(expect.objectContaining({ id: 'ext-two', version: '0.9.0' }), 'registry.npmjs.org')
    menuItems[1].onClick()
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'Too old')
  })

  test('disables, uninstalls, aborts installs, reloads, and opens external links', async () => {
    const wrapper = mount(ExtensionManager, {
      global: { mocks: { $t: (key: string, value?: string) => value ? `${key}:${value}` : key } },
    })

    await mocks.actions.get('extension.show-manager')?.('ext-one')
    await flushPromises()

    const disableButton = wrapper.findAll('button.small.tr')
      .find(button => button.text() === 'extension.disable')!
    await disableButton.trigger('click')
    await flushPromises()
    expect(mocks.disable).toHaveBeenCalledWith(expect.objectContaining({ id: 'ext-one' }))

    const upgradeButton = wrapper.findAll('button.small.tr')
      .find(button => button.text() === 'extension.upgrade')!
    await upgradeButton.trigger('click')
    await flushPromises()
    expect(mocks.install).toHaveBeenCalledWith(expect.objectContaining({ id: 'ext-one' }), 'registry.npmjs.org')

    const uninstallButton = wrapper.findAll('button.small.tr')
      .find(button => button.text() === 'extension.uninstall')!
    await uninstallButton.trigger('click')
    await flushPromises()
    expect(mocks.modalConfirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'extension.uninstall',
    }))
    expect(mocks.uninstall).toHaveBeenCalledWith(expect.objectContaining({ id: 'ext-one' }))
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'extension.reload-required')

    ;(wrapper.vm as any).installing = 'ext-one'
    await flushPromises()
    const cancelButton = wrapper.findAll('button.small')
      .find(button => button.text() === 'cancel')!
    await cancelButton.trigger('click')
    await flushPromises()
    expect(mocks.abortInstallation).toHaveBeenCalled()

    await wrapper.findAll('button.btn').find(button => button.text() === 'extension.reload')?.trigger('click')
    expect(mocks.reloadMainWindow).toHaveBeenCalled()

    await wrapper.find('.tags .tag[style*="cursor"]').trigger('click')
    expect(mocks.open).toHaveBeenCalledWith('https://example.test/ext-one', '_blank')
  })

  test('guards premium-only extensions before installing', async () => {
    const wrapper = mount(ExtensionManager, {
      global: { mocks: { $t: (key: string, value?: string) => value ? `${key}:${value}` : key } },
    })

    mocks.registryExtensions = [
      extension({
        id: 'premium-ext',
        displayName: 'Premium Extension',
        requirements: { premium: true, terminal: false },
      }),
    ]
    mocks.getRegistryExtensions.mockResolvedValue(mocks.registryExtensions)
    await mocks.actions.get('extension.show-manager')?.('premium-ext')
    await flushPromises()

    await (wrapper.vm as any).installLatest((wrapper.vm as any).currentExtension).catch(() => undefined)

    expect(mocks.showPremium).toHaveBeenCalled()
    expect(mocks.toastShow).toHaveBeenCalledWith('info', 'premium.need-purchase:Premium Extension')
    expect(mocks.install).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'premium-ext' }), expect.anything())
  })

  test('confirms unknown-origin enable, handles fetch failures, and saves registry settings', async () => {
    const wrapper = mount(ExtensionManager, {
      global: { mocks: { $t: (key: string, value?: string) => value ? `${key}:${value}` : key } },
    })

    const unknownInstalled = extension({
      id: 'unknown-installed',
      displayName: 'Unknown Installed',
      installed: true,
      enabled: false,
      origin: 'unknown',
      author: { name: 'Third Party' },
    })

    mocks.modalConfirm.mockResolvedValueOnce(false)
    await expect((wrapper.vm as any).enable(unknownInstalled)).rejects.toThrow('canceled')
    expect(mocks.enable).not.toHaveBeenCalled()

    mocks.modalConfirm.mockResolvedValueOnce(true)
    await (wrapper.vm as any).enable(unknownInstalled)
    expect(mocks.enable).toHaveBeenCalledWith(expect.objectContaining({ id: 'unknown-installed' }))
    expect(mocks.toastShow).toHaveBeenCalledWith('info', 'extension.toast-loaded')

    mocks.getRegistryExtensions.mockRejectedValueOnce(new Error('registry down'))
    await expect((wrapper.vm as any).fetchExtensions()).rejects.toThrow('registry down')
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'extension.fetch-registry-failed')
    expect((wrapper.vm as any).registryExtensions).toEqual([])

    ;(wrapper.vm as any).currentRegistry = 'registry.npmmirror.com'
    await flushPromises()
    expect(mocks.setSetting).toHaveBeenCalledWith('extension.registry', 'registry.npmmirror.com')
  })
})
