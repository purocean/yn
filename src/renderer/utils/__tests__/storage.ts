import * as storage from '@fe/utils/storage'

describe('storage utilities', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  test('sets and gets JSON values', () => {
    storage.set('settings', { theme: 'dark', count: 2 })

    expect(storage.get('settings')).toStrictEqual({ theme: 'dark', count: 2 })
    expect(window.localStorage.settings).toBe('{"theme":"dark","count":2}')
  })

  test('returns the default value for missing keys', () => {
    expect(storage.get('missing')).toBeUndefined()
    expect(storage.get('missing', 'fallback')).toBe('fallback')
  })

  test('returns the default value when stored JSON cannot be parsed', () => {
    window.localStorage.bad = '{'

    expect(storage.get('bad', { ok: true })).toStrictEqual({ ok: true })
  })

  test('removes individual keys and clears all keys', () => {
    storage.set('a', 1)
    storage.set('b', 2)

    storage.remove('a')
    expect(storage.get('a')).toBeUndefined()
    expect(storage.get('b')).toBe(2)

    storage.clear()
    expect(window.localStorage.length).toBe(0)
  })

  test('returns the backing localStorage object', () => {
    storage.set('answer', 42)

    expect(storage.getAll()).toBe(window.localStorage)
    expect(storage.getAll().answer).toBe('42')
  })
})
