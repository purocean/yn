import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hook: {
    registerHook: vi.fn(),
    removeHook: vi.fn(),
    triggerHook: vi.fn(),
  },
  plugin: {
    getApi: vi.fn(() => ({ plugin: true })),
  },
  premium: {
    getPurchased: vi.fn(() => ({ plan: 'pro' })),
    showPremium: vi.fn(),
  },
  extension: {
    showManager: vi.fn(),
    getLoadStatus: vi.fn(() => 'ready'),
    getInitialized: vi.fn(() => true),
    whenInitialized: vi.fn(async () => true),
  },
  ui: {
    toast: vi.fn(() => ({ show: vi.fn() })),
    modal: vi.fn(() => ({ alert: vi.fn() })),
    quickFilter: vi.fn(() => ({ show: vi.fn() })),
    fixedFloat: vi.fn(() => ({ show: vi.fn() })),
    contextMenu: vi.fn(() => ({ show: vi.fn() })),
  },
}))

const marker = (name: string) => ({ name })

vi.mock('@fe/utils/storage', () => marker('storage'))
vi.mock('@fe/utils/index', () => marker('utils'))
vi.mock('@fe/others/premium', () => mocks.premium)
vi.mock('@fe/others/extension', () => mocks.extension)
vi.mock('@fe/core/ioc', () => marker('ioc'))
vi.mock('@fe/core/plugin', () => mocks.plugin)
vi.mock('@fe/core/hook', () => mocks.hook)
vi.mock('@fe/core/action', () => marker('action'))
vi.mock('@fe/core/keybinding', () => marker('keybinding'))
vi.mock('@fe/support/ui/toast', () => ({ useToast: mocks.ui.toast }))
vi.mock('@fe/support/ui/modal', () => ({ useModal: mocks.ui.modal }))
vi.mock('@fe/support/ui/quick-filter', () => ({ useQuickFilter: mocks.ui.quickFilter }))
vi.mock('@fe/support/ui/fixed-float', () => ({ useFixedFloat: mocks.ui.fixedFloat }))
vi.mock('@fe/support/ui/context-menu', () => ({ useContextMenu: mocks.ui.contextMenu }))
vi.mock('@fe/support/env', () => marker('env'))
vi.mock('@fe/support/store', () => ({ default: marker('store') }))
vi.mock('@fe/services/base', () => marker('base'))
vi.mock('@fe/services/workbench', () => marker('workbench'))
vi.mock('@fe/support/api', () => marker('api'))
vi.mock('@fe/support/embed', () => marker('embed'))
vi.mock('@fe/support/args', () => marker('args'))
vi.mock('@fe/services/document', () => marker('doc'))
vi.mock('@fe/services/view', () => marker('view'))
vi.mock('@fe/services/tree', () => marker('tree'))
vi.mock('@fe/services/markdown', () => marker('markdown'))
vi.mock('@fe/services/status-bar', () => marker('statusBar'))
vi.mock('@fe/services/layout', () => marker('layout'))
vi.mock('@fe/services/editor', () => marker('editor'))
vi.mock('@fe/services/theme', () => marker('theme'))
vi.mock('@fe/services/setting', () => marker('setting'))
vi.mock('@fe/services/i18n', () => marker('i18n'))
vi.mock('@fe/services/runner', () => marker('runner'))
vi.mock('@fe/services/renderer', () => marker('renderer'))
vi.mock('@fe/services/export', () => marker('export'))
vi.mock('@fe/services/routines', () => marker('routines'))
vi.mock('@fe/directives/index', () => marker('directives'))
vi.mock('@fe/services/indexer', () => marker('indexer'))
vi.mock('@fe/services/repo', () => marker('repo'))
vi.mock('../lib', () => marker('lib'))
vi.mock('../components', () => marker('components'))

afterEach(() => {
  vi.clearAllMocks()
})

describe('renderer context', () => {
  it('publishes a frozen plugin context on window and delegates facades', async () => {
    vi.stubGlobal('__APP_VERSION__', '9.9.9-test')

    const mod = await import('../index')
    const ctx = mod.default

    expect((window as any).ctx).toBe(ctx)
    expect(Object.isFrozen(ctx)).toBe(true)
    expect(ctx.version).toBe('9.9.9-test')
    expect(ctx.lib).toEqual(marker('lib'))
    expect(ctx.components).toEqual(marker('components'))
    expect(ctx.doc).toEqual(marker('doc'))
    expect(ctx.export).toEqual(marker('export'))
    expect(ctx.ui.useToast).toBe(mocks.ui.toast)
    expect(ctx.registerHook).toBe(mocks.hook.registerHook)
    expect(ctx.getPluginApi()).toEqual({ plugin: true })
    expect(ctx.getPremium()).toEqual({ plan: 'pro' })

    const descriptor = Object.getOwnPropertyDescriptor(window, 'ctx')!
    expect(descriptor.configurable).toBe(false)
    expect(descriptor.writable).toBe(false)

    ctx.showPremium()
    ctx.showExtensionManager()

    expect(mocks.premium.showPremium).toHaveBeenCalledTimes(1)
    expect(mocks.extension.showManager).toHaveBeenCalledTimes(1)
    expect(ctx.getExtensionLoadStatus()).toBe('ready')
    expect(ctx.getExtensionInitialized()).toBe(true)
    await expect(ctx.whenExtensionInitialized()).resolves.toBe(true)
  })
})
