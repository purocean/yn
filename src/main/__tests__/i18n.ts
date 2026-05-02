const mocks = vi.hoisted(() => ({
  configGet: vi.fn(),
  getAction: vi.fn(),
  locale: 'zh-CN',
  refreshMenus: vi.fn(),
  registerAction: vi.fn(),
  translate: vi.fn()
}))

vi.mock('electron', () => ({
  app: {
    getLocale: () => mocks.locale
  }
}))

vi.mock('../config', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mocks.configGet(...args)
  }
}))

vi.mock('../action', () => ({
  getAction: (...args: any[]) => mocks.getAction(...args),
  registerAction: (...args: any[]) => mocks.registerAction(...args)
}))

vi.mock('../../share/i18n', () => ({
  translate: (...args: any[]) => mocks.translate(...args)
}))

async function loadI18n () {
  vi.resetModules()
  return await import('../i18n')
}

describe('main i18n module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.locale = 'zh-CN'
    mocks.configGet.mockReturnValue('system')
    mocks.getAction.mockReturnValue(mocks.refreshMenus)
    mocks.translate.mockImplementation((lang: string, path: string, ...args: string[]) => `${lang}:${path}:${args.join(',')}`)
  })

  test('registers the language-change action on import', async () => {
    const i18n = await loadI18n()

    expect(mocks.configGet).toHaveBeenCalledWith('language', 'system')
    expect(mocks.registerAction).toHaveBeenCalledWith('i18n.change-language', i18n.setLanguage)
  })

  test('translates with the Electron locale when language is system', async () => {
    const { $t } = await loadI18n()

    expect($t('app.name' as any, 'one', 'two')).toBe('zh-CN:app.name:one,two')
    expect(mocks.translate).toHaveBeenCalledWith('zh-CN', 'app.name', 'one', 'two')
  })

  test('setLanguage overrides the locale and refreshes menus', async () => {
    const { $t, setLanguage } = await loadI18n()

    setLanguage('en')

    expect($t('app.name' as any)).toBe('en:app.name:')
    expect(mocks.getAction).toHaveBeenCalledWith('refresh-menus')
    expect(mocks.refreshMenus).toHaveBeenCalled()
  })

  test('setLanguage without a value returns to system locale', async () => {
    mocks.configGet.mockReturnValue('en')
    const { $t, setLanguage } = await loadI18n()

    expect($t('app.name' as any)).toBe('en:app.name:')
    setLanguage()
    expect($t('app.name' as any)).toBe('zh-CN:app.name:')
  })
})
