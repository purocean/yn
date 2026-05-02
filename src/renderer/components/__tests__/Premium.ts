import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  actions: new Map<string, Function>(),
  toastShow: vi.fn(),
  modalConfirm: vi.fn(),
  openWindow: vi.fn(),
  copyText: vi.fn(),
  confetti: vi.fn(),
  random: vi.fn(() => 123),
  qrcodeToDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,qrcode')),
  activateLicense: vi.fn(),
  activateByTokenString: vi.fn(),
  getPurchased: vi.fn(),
  getLicenseToken: vi.fn(),
  refreshLicense: vi.fn(),
  requestApi: vi.fn(),
  decodeDevice: vi.fn(),
}))

vi.mock('canvas-confetti', () => ({
  default: mocks.confetti,
}))

vi.mock('qrcode', () => ({
  default: { toDataURL: mocks.qrcodeToDataURL },
}))

vi.mock('lodash-es', async () => {
  const actual: any = await vi.importActual('lodash-es')
  return {
    ...actual,
    random: mocks.random,
    debounce: (fn: any) => fn,
  }
})

vi.mock('app-license', () => ({
  decodeDevice: mocks.decodeDevice,
  LicenseToken: class {},
}))

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action.handler),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({
    t: (key: string, value?: string) => value ? `${key}:${value}` : key,
  }),
}))

vi.mock('@fe/others/premium', () => ({
  activateByTokenString: mocks.activateByTokenString,
  activateLicense: mocks.activateLicense,
  getLicenseToken: mocks.getLicenseToken,
  getPurchased: mocks.getPurchased,
  refreshLicense: mocks.refreshLicense,
  requestApi: mocks.requestApi,
  tokenAvailableDays: () => 7,
  tokenIsExpiredSoon: () => false,
  tokenIsStaleSoon: () => false,
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow }),
}))

vi.mock('@fe/support/ui/modal', () => ({
  useModal: () => ({ confirm: mocks.modalConfirm }),
}))

vi.mock('@fe/support/args', () => ({
  FLAG_DEMO: false,
}))

vi.mock('@fe/support/env', () => ({
  openWindow: mocks.openWindow,
}))

vi.mock('@fe/utils', () => ({
  copyText: mocks.copyText,
}))

vi.mock('@share/misc', () => ({
  HOMEPAGE_URL: 'https://example.test',
}))

vi.mock('../Mask.vue', () => ({
  default: { name: 'XMask', props: ['show'], emits: ['close'], template: '<div><slot /></div>' },
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i />' },
}))

vi.mock('../GroupTabs.vue', () => ({
  default: {
    name: 'GroupTabs',
    props: ['tabs', 'modelValue'],
    emits: ['update:modelValue'],
    template: '<div><button v-for="tab in tabs" :key="tab.value" class="tab" @click="$emit(\'update:modelValue\', tab.value)">{{tab.label}}</button></div>',
  },
}))

import Premium from '../Premium.vue'

beforeEach(() => {
  mocks.actions.clear()
  mocks.toastShow.mockReset()
  mocks.modalConfirm.mockReset()
  mocks.modalConfirm.mockResolvedValue(true)
  mocks.openWindow.mockReset()
  mocks.copyText.mockReset()
  mocks.confetti.mockReset()
  mocks.qrcodeToDataURL.mockClear()
  mocks.activateLicense.mockReset()
  mocks.activateLicense.mockResolvedValue(undefined)
  mocks.activateByTokenString.mockReset()
  mocks.activateByTokenString.mockResolvedValue(undefined)
  mocks.getPurchased.mockReset()
  mocks.getPurchased.mockReturnValue(false)
  mocks.getLicenseToken.mockReset()
  mocks.getLicenseToken.mockReturnValue(null)
  mocks.refreshLicense.mockReset()
  mocks.refreshLicense.mockResolvedValue(undefined)
  mocks.requestApi.mockReset()
  mocks.requestApi.mockResolvedValue([])
  mocks.decodeDevice.mockReset()
  mocks.decodeDevice.mockImplementation((val: string) => {
    const [id, platform, hostname] = val.split(':')
    return { id, platform, hostname }
  })
})

describe('Premium', () => {
  test('registers show action, switches tabs, opens purchase URLs, and closes', async () => {
    const wrapper = mount(Premium, {
      global: { mocks: { $t: (key: string) => key } },
    })

    expect(mocks.actions.has('premium.show')).toBe(true)

    await mocks.actions.get('premium.show')?.('activation')
    await flushPromises()

    expect((wrapper.vm as any).showPanel).toBe(true)
    expect((wrapper.vm as any).tab).toBe('activation')
    expect(mocks.refreshLicense).toHaveBeenCalled()

    ;(wrapper.vm as any).buy()
    expect(mocks.openWindow).toHaveBeenCalledWith('https://example.test/pricing')
    expect((wrapper.vm as any).tab).toBe('activation')

    ;(wrapper.vm as any).close()
    expect((wrapper.vm as any).showPanel).toBe(false)

    wrapper.unmount()
    expect(mocks.actions.has('premium.show')).toBe(false)
  })

  test('loads license devices, copies identifiers, refreshes, and removes devices', async () => {
    const token = {
      licenseId: 'license-1',
      name: 'Ada',
      email: 'ada@example.test',
      displayName: 'Premium',
      expires: new Date('2030-01-01T00:00:00Z'),
      device: 'dev1:darwin:mac',
      devices: ['dev1:darwin:mac'],
      status: 'stale',
    }
    mocks.getPurchased.mockReturnValue(true)
    mocks.getLicenseToken.mockReturnValue(token)
    mocks.requestApi.mockResolvedValue(['dev1:darwin:mac', 'dev2:win32:pc'])

    const wrapper = mount(Premium, {
      global: { mocks: { $t: (key: string, value?: string) => value ? `${key}:${value}` : key } },
    })
    await flushPromises()

    expect((wrapper.vm as any).purchased).toBe(true)
    expect((wrapper.vm as any).devices).toHaveLength(2)

    ;(wrapper.vm as any).copyLicenseId()
    expect(mocks.copyText).toHaveBeenCalledWith('license-1')
    expect(mocks.toastShow).toHaveBeenCalledWith('info', 'copied')

    await (wrapper.vm as any).refresh()
    expect(mocks.refreshLicense).toHaveBeenCalledWith({ throwError: true })

    await (wrapper.vm as any).removeDevice((wrapper.vm as any).devices[1])
    expect(mocks.requestApi).toHaveBeenCalledWith('removeDevice', {
      licenseId: 'license-1',
      device: 'dev2:win32:pc',
    })
  })

  test('supports online and offline activation flows with machine code qrcode', async () => {
    const wrapper = mount(Premium, {
      global: { mocks: { $t: (key: string) => key } },
    })

    ;(wrapper.vm as any).license = ' 12345678-1234-1234-1234-123456789abc '
    await (wrapper.vm as any).activate()
    expect(mocks.activateLicense).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc')
    expect(mocks.toastShow).toHaveBeenCalledWith('info', 'premium.activation.success')

    mocks.requestApi.mockResolvedValueOnce('machine-code')
    ;(wrapper.vm as any).offline = true
    await flushPromises()
    expect((wrapper.vm as any).machineCode).toBe('machine-code')
    expect(mocks.qrcodeToDataURL).toHaveBeenCalledWith('https://example.test/gat?machineCode=machine-code')

    ;(wrapper.vm as any).copyMachineCode()
    expect(mocks.copyText).toHaveBeenCalledWith('machine-code')

    ;(wrapper.vm as any).getActivationToken()
    expect(mocks.openWindow).toHaveBeenCalledWith('https://example.test/gat?machineCode=machine-code')

    ;(wrapper.vm as any).activationToken = ' offline-token-123456789012345678901234 '
    await (wrapper.vm as any).activateOffline()
    expect(mocks.activateByTokenString).toHaveBeenCalledWith('offline-token-123456789012345678901234')
  })
})
