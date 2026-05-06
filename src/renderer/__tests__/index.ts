const mocks = vi.hoisted(() => ({
  use: vi.fn(),
  mount: vi.fn(),
  createApp: vi.fn(() => ({
    use: mocks.use,
    mount: mocks.mount,
  })),
  plugins: {
    directives: { name: 'directives' },
    toast: { name: 'toast' },
    modal: { name: 'modal' },
    contextmenu: { name: 'contextmenu' },
    quickFilter: { name: 'quickFilter' },
    fixedFloat: { name: 'fixedFloat' },
  },
}))

vi.mock('vue', () => ({
  createApp: mocks.createApp,
}))

vi.mock('@fe/others/demo', () => ({}))
vi.mock('@fe/Main.vue', () => ({ default: { name: 'Main' } }))
vi.mock('@fe/directives', () => ({ default: mocks.plugins.directives }))
vi.mock('@fe/support/ui/toast', () => ({ default: mocks.plugins.toast }))
vi.mock('@fe/support/ui/modal', () => ({ default: mocks.plugins.modal }))
vi.mock('@fe/support/ui/context-menu', () => ({ default: mocks.plugins.contextmenu }))
vi.mock('@fe/support/ui/quick-filter', () => ({ default: mocks.plugins.quickFilter }))
vi.mock('@fe/support/ui/fixed-float', () => ({ default: mocks.plugins.fixedFloat }))

describe('renderer entry', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.createApp.mockClear()
    mocks.use.mockClear()
    mocks.mount.mockClear()
  })

  test('creates the Vue app, installs shared UI plugins, and mounts it', async () => {
    await import('../index')

    expect(mocks.createApp).toHaveBeenCalledWith({ name: 'Main' })
    expect(mocks.use.mock.calls.map(([plugin]) => plugin)).toEqual([
      mocks.plugins.directives,
      mocks.plugins.toast,
      mocks.plugins.modal,
      mocks.plugins.contextmenu,
      mocks.plugins.quickFilter,
      mocks.plugins.fixedFloat,
    ])
    expect(mocks.mount).toHaveBeenCalledWith('#app')
  })
})
