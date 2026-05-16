import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hooks: new Map<string, () => void>(),
  language: 'zh-CN',
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: vi.fn((name: string, handler: () => void) => {
    mocks.hooks.set(name, handler)
  }),
}))

vi.mock('@fe/services/i18n', () => ({
  getCurrentLanguage: () => mocks.language,
}))

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  mocks.hooks.clear()
  mocks.language = 'zh-CN'
})

describe('context lib', () => {
  it('initializes dayjs locale and updates it when language changes', async () => {
    const lib = await import('../lib')

    expect(lib.dayjs.locale()).toBe('zh-cn')
    expect(mocks.hooks.has('I18N_CHANGE_LANGUAGE')).toBe(true)

    mocks.language = 'en'
    mocks.hooks.get('I18N_CHANGE_LANGUAGE')!()
    expect(lib.dayjs.locale()).toBe('en')

    mocks.language = 'zh-CN'
    mocks.hooks.get('I18N_CHANGE_LANGUAGE')!()
    expect(lib.dayjs.locale()).toBe('zh-cn')
  })

  it('re-exports common libraries for plugin context consumers', async () => {
    const lib = await import('../lib')

    expect(lib.lodash.camelCase('hello-world')).toBe('helloWorld')
    expect(lib.uuid.v4).toEqual(expect.any(Function))
    expect(lib.vue.ref(1).value).toBe(1)
    expect(lib.dayjs).toEqual(expect.any(Function))
  })
})
