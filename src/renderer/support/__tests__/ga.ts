import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
  },
  uuid: vi.fn(() => 'generated-client-id'),
  analyticsCtor: vi.fn(),
  themeName: vi.fn(() => 'dark'),
  language: vi.fn(() => 'en'),
}))

vi.mock('uuid', () => ({
  v4: mocks.uuid,
}))

vi.mock('@fe/utils/storage', () => mocks.storage)

vi.mock('@fe/others/google-analytics', () => ({
  FirebaseAnalyticsJS: vi.fn(function FirebaseAnalyticsJS (...args) {
    mocks.analyticsCtor(...args)
    return { type: 'ga', args }
  }),
}))

vi.mock('@fe/context', () => ({
  default: {
    version: '1.2.3',
    theme: { getThemeName: mocks.themeName },
    i18n: { getCurrentLanguage: mocks.language },
  },
}))

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe('ga support', () => {
  it('uses the stored client id and persists it', async () => {
    mocks.storage.get.mockReturnValue('stored-client-id')

    const ga = await import('../ga')

    expect(ga.default).toMatchObject({ type: 'ga' })
    expect(mocks.uuid).toHaveBeenCalled()
    expect(mocks.storage.get).toHaveBeenCalledWith('_ga-client-id', 'generated-client-id')
    expect(mocks.storage.set).toHaveBeenCalledWith('_ga-client-id', 'stored-client-id')
    expect(mocks.analyticsCtor).toHaveBeenCalledWith(
      { measurementId: 'G-7M1Y4FTCKM' },
      expect.objectContaining({
        clientId: 'stored-client-id',
        screenRes: `${window.screen.width}x${window.screen.height}`,
      }),
    )
  })

  it('passes dynamic app metadata to analytics custom args', async () => {
    mocks.storage.get.mockReturnValue('client-id')

    await import('../ga')
    const customArgs = mocks.analyticsCtor.mock.calls[0][1].customArgs

    expect(customArgs.uafvl).toBe(navigator.userAgent)
    expect(customArgs['ep.app_name']).toBe('Yank Note')
    expect(customArgs['ep.app_version']).toBe('1.2.3')
    expect(customArgs['ep.yn_theme'].toString()).toBe('dark')
    expect(customArgs['ep.yn_lang'].toString()).toBe('en')
  })
})
