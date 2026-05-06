const mocks = vi.hoisted(() => ({
  purchased: true,
  triggerHook: vi.fn(),
  storage: new Map<string, unknown>(),
  ioc: new Map<string, any[]>(),
  mediaListeners: [] as Array<() => void>,
  printMatches: false,
  darkMatches: false,
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/others/premium', () => ({
  getPurchased: () => mocks.purchased,
}))

vi.mock('@fe/utils/storage', () => ({
  get: vi.fn((key: string, fallback: unknown) => mocks.storage.has(key) ? mocks.storage.get(key) : fallback),
  set: vi.fn((key: string, value: unknown) => {
    mocks.storage.set(key, value)
  }),
}))

vi.mock('@fe/core/ioc', () => ({
  register: vi.fn((key: string, value: unknown) => {
    mocks.ioc.set(key, [...(mocks.ioc.get(key) || []), value])
  }),
  get: vi.fn((key: string) => mocks.ioc.get(key) || []),
  remove: vi.fn((key: string, valueOrPredicate: unknown) => {
    const values = mocks.ioc.get(key) || []
    const predicate = typeof valueOrPredicate === 'function'
      ? valueOrPredicate as (item: unknown) => boolean
      : (item: unknown) => item === valueOrPredicate
    mocks.ioc.set(key, values.filter(item => !predicate(item)))
  }),
  removeWhen: vi.fn((key: string, predicate: (item: unknown) => boolean) => {
    mocks.ioc.set(key, (mocks.ioc.get(key) || []).filter(item => !predicate(item)))
  }),
}))

beforeEach(() => {
  vi.resetModules()
  mocks.purchased = true
  mocks.storage.clear()
  mocks.ioc.clear()
  mocks.mediaListeners = []
  mocks.printMatches = false
  mocks.darkMatches = false
  mocks.triggerHook.mockClear()
  document.head.innerHTML = ''
  document.documentElement.removeAttribute('app-theme')
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: query === 'print' ? mocks.printMatches : mocks.darkMatches,
    media: query,
    onchange: null,
    addEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === 'change') {
        mocks.mediaListeners.push(listener)
      }
    }),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('reads explicit app theme or falls back to stored theme', async () => {
  const theme = await import('@fe/services/theme')

  expect(theme.getThemeName()).toBe('system')

  mocks.storage.set('app.theme', 'dark')
  expect(theme.getThemeName()).toBe('dark')

  document.documentElement.setAttribute('app-theme', 'light')
  expect(theme.getThemeName()).toBe('light')
})

test('resolves system color scheme through match media', async () => {
  const theme = await import('@fe/services/theme')

  mocks.darkMatches = true
  expect(theme.getColorScheme()).toBe('dark')

  document.documentElement.setAttribute('app-theme', 'light')
  expect(theme.getColorScheme()).toBe('light')
})

test('sets theme, persists it, and gates premium themes', async () => {
  const theme = await import('@fe/services/theme')

  theme.setTheme('dark')

  expect(document.documentElement.getAttribute('app-theme')).toBe('dark')
  expect(mocks.storage.get('app.theme')).toBe('dark')
  expect(mocks.triggerHook).toHaveBeenLastCalledWith('THEME_CHANGE', { name: 'dark' })

  mocks.purchased = false
  theme.setTheme('system')

  expect(document.documentElement.getAttribute('app-theme')).toBe('light')
  expect(mocks.storage.get('app.theme')).toBe('light')
})

test('adds inline and linked styles to document head', async () => {
  const theme = await import('@fe/services/theme')

  const style = await theme.addStyles('.a { color: red; }')
  const link = await theme.addStyleLink('data:text/css,.linked{}')

  expect(style.tagName).toBe('STYLE')
  expect(style.innerHTML).toBe('.a { color: red; }')
  expect(link.rel).toBe('stylesheet')
  expect(link.href).toContain('data:text/css')
  expect(document.head.children).toHaveLength(2)
})

test('registers, lists, and removes theme styles', async () => {
  const theme = await import('@fe/services/theme')
  const first = { from: 'custom' as const, name: 'first', css: '.first{}' }
  const second = { from: 'extension' as const, name: 'second', css: '.second{}' }

  theme.registerThemeStyle(first)
  theme.registerThemeStyle(second)
  expect(theme.getThemeStyles()).toStrictEqual([first, second])

  theme.removeThemeStyle(first)
  expect(theme.getThemeStyles()).toStrictEqual([second])

  theme.removeThemeStyle(item => item.name === 'second')
  expect(theme.getThemeStyles()).toStrictEqual([])
})

test('system media change reapplies system theme outside print mode', async () => {
  const theme = await import('@fe/services/theme')

  document.documentElement.setAttribute('app-theme', 'system')
  mocks.mediaListeners[0]()

  expect(mocks.triggerHook).toHaveBeenCalledWith('THEME_CHANGE', { name: 'system' })

  mocks.triggerHook.mockClear()
  mocks.printMatches = true
  mocks.mediaListeners[0]()

  expect(mocks.triggerHook).not.toHaveBeenCalled()
  expect(theme.getThemeName()).toBe('system')
})
