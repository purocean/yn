const mocks = vi.hoisted(() => ({
  argv: {} as Record<string, any>,
}))

vi.mock('yargs', () => ({
  get argv () {
    return mocks.argv
  }
}))

describe('url module', () => {
  beforeEach(() => {
    mocks.argv = {}
  })

  test('builds a scheme URL with backend port and selected argv params', async () => {
    mocks.argv = {
      readonly: true,
      'show-status-bar': false,
      'init-repo': 'main',
      ignored: 'value',
    }

    const { buildAppUrl } = await import('../url')

    expect(buildAppUrl({
      mode: 'scheme',
      backendPort: 3044,
      devFrontendPort: 5173,
    })).toBe('yank-note://localhost:?readonly=true&show-status-bar=false&init-repo=main&port=3044')
  })

  test('builds dev and prod http URLs with the expected port', async () => {
    const { buildAppUrl } = await import('../url')

    expect(buildAppUrl({
      mode: 'dev',
      backendPort: 3044,
      devFrontendPort: 5173,
      includeArgParams: false,
    })).toBe('http://localhost:5173')

    expect(buildAppUrl({
      mode: 'prod',
      backendPort: 3044,
      devFrontendPort: 5173,
      includeArgParams: false,
    })).toBe('http://localhost:3044')
  })

  test('adds defined extra params and lets them override argv params', async () => {
    mocks.argv = {
      readonly: false,
      'init-file': 'old.md',
    }

    const { buildAppUrl } = await import('../url')

    expect(buildAppUrl({
      mode: 'prod',
      backendPort: 3044,
      devFrontendPort: 5173,
      extraSearchParams: {
        readonly: true,
        'init-file': undefined,
        zoom: 1.25,
      },
    })).toBe('http://localhost:3044?readonly=true&init-file=old.md&zoom=1.25')
  })
})
