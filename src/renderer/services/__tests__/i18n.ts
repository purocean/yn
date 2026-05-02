const storageMocks = vi.hoisted(() => ({
  values: new Map<string, any>(),
  get: vi.fn((key: string, fallback?: any) => storageMocks.values.has(key) ? storageMocks.values.get(key) : fallback),
  set: vi.fn((key: string, value: any) => {
    storageMocks.values.set(key, value)
  }),
}))

const hookMocks = vi.hoisted(() => ({
  registerHook: vi.fn(),
  removeHook: vi.fn(),
  triggerHook: vi.fn(),
}))

vi.mock('@fe/utils/storage', () => storageMocks)

vi.mock('@fe/core/hook', () => hookMocks)

describe('renderer i18n service', () => {
  beforeEach(() => {
    storageMocks.values.clear()
    storageMocks.get.mockClear()
    storageMocks.set.mockClear()
    hookMocks.registerHook.mockClear()
    hookMocks.removeHook.mockClear()
    hookMocks.triggerHook.mockClear()
    vi.resetModules()
    Object.defineProperty(navigator, 'language', {
      value: 'zh-CN',
      configurable: true,
    })
  })

  test('uses system language until an explicit language is set', async () => {
    const i18n = await import('@fe/services/i18n')

    expect(i18n.getLanguage()).toBe('system')
    expect(i18n.getCurrentLanguage()).toBe('zh-CN')

    i18n.setLanguage('en')

    expect(i18n.getLanguage()).toBe('en')
    expect(i18n.getCurrentLanguage()).toBe('en')
    expect(storageMocks.set).toHaveBeenCalledWith('app.language', 'en')
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('I18N_CHANGE_LANGUAGE', { lang: 'en', currentLang: 'en' })
  })

  test('translates static and dynamic text', async () => {
    const i18n = await import('@fe/services/i18n')

    i18n.setLanguage('en')

    expect(i18n.t('app.quit' as any)).toBeTruthy()
    expect(i18n.$$t('app.quit' as any).toString()).toBe(i18n.t('app.quit' as any))
    expect((i18n.$$t('app.quit' as any) as any).toJson()).toBe(JSON.stringify(i18n.t('app.quit' as any)))
  })

  test('merges extra language data', async () => {
    const i18n = await import('@fe/services/i18n')

    i18n.setLanguage('en')
    i18n.mergeLanguage('en', {
      test: {
        greeting: 'Hello %s',
      },
    })

    expect(i18n.t('test.greeting' as any, 'Yank Note')).toBe('Hello Yank Note')
  })

  test('creates scoped i18n helpers with fallback language and lazy hook registration', async () => {
    const i18n = await import('@fe/services/i18n')

    i18n.setLanguage('ru')
    const scoped = i18n.createI18n({
      en: {
        title: 'Title %s',
      },
      'zh-CN': {
        title: '标题 %s',
      },
    })

    expect(scoped.t('title', 'A')).toBe('Title A')
    expect(scoped.$$t('title', 'B').toString()).toBe('Title B')
    expect((scoped.$$t('title', 'B') as any).toJson()).toBe(JSON.stringify('Title B'))

    ;(scoped.$t as any).dep.sc = 1
    expect(hookMocks.registerHook).toHaveBeenCalledWith('I18N_CHANGE_LANGUAGE', expect.any(Function))

    ;(scoped.$t as any).dep.sc = 0
    expect(hookMocks.removeHook).toHaveBeenCalledWith('I18N_CHANGE_LANGUAGE', expect.any(Function))
  })

  test('scoped i18n returns the path when no language data is available', async () => {
    const i18n = await import('@fe/services/i18n')

    i18n.setLanguage('ru')
    const scoped = i18n.createI18n({}, 'en')

    expect(scoped.t('missing' as any)).toBe('missing')
    expect(scoped.$$t('missing' as any).toString()).toBe('missing')
  })

  test('throws when useI18n is called outside a component instance', async () => {
    const i18n = await import('@fe/services/i18n')

    expect(() => i18n.useI18n()).toThrow('VM Error')
  })
})
