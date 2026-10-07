import { createRequestOriginGuard } from '../request-origin'

describe('request origin boundary', () => {
  const check = createRequestOriginGuard(3044)

  test.each([
    { host: 'localhost:3044', origin: 'http://localhost:3044' },
    { host: '127.0.0.1:3044', origin: 'http://127.0.0.1:3044' },
    { host: '[::1]:3044', origin: 'http://[::1]:3044' },
    { host: 'notes.example:3044', origin: 'http://notes.example:3044' },
    { host: 'notes.example', origin: 'https://notes.example' },
    { host: 'notes.example:443', origin: 'https://notes.example' },
    { host: 'notes.example:8443', origin: 'https://notes.example:8443' },
    { host: 'notes.example', referer: 'https://notes.example/embed/?a=1' },
    { host: 'notes.example:443', origin: 'https://notes.example', referer: 'https://notes.example/', 'sec-fetch-site': 'same-origin' },
    { host: '[::1]:443', origin: 'https://[::1]' },
    { host: 'localhost:3044', origin: 'https://localhost:3044' },
    { host: '192.168.1.4:3044', origin: 'http://192.168.1.4:3044' },
    { host: '192.168.2.20:3044', referer: 'http://192.168.2.20:3044/' },
    { host: '[2001:db8::1]:3044', origin: 'http://[2001:db8::1]:3044' },
    { host: 'localhost:8066', origin: 'http://localhost:8066' },
    { host: 'localhost:3044', referer: 'http://localhost:3044/embed/?a=1' },
    { host: 'localhost:3044', 'sec-fetch-site': 'same-origin' },
    { host: 'localhost:3044', origin: 'yank-note://localhost', 'sec-fetch-site': 'cross-site' }
  ])('accepts a same-origin browser source: %j', headers => {
    expect(check(headers)).toBe(true)
  })

  test.each([
    {},
    { host: 'localhost:3044' },
    { host: 'localhost:3044', origin: 'null', 'sec-fetch-site': 'same-origin' },
    { host: 'localhost:3044', origin: '' },
    { host: 'localhost:3044', origin: 'file://' },
    { host: 'localhost:3044', origin: 'http://localhost:3044/path' },
    { host: 'localhost:3044', origin: 'http://user@localhost:3044' },
    { host: 'localhost:3044', origin: 'http://localhost:3044 https://evil.example' },
    { host: 'localhost:3044', origin: 'http://localhost:3045' },
    { host: 'notes.example', origin: 'https://other.example' },
    { host: 'notes.example:8443', origin: 'https://notes.example' },
    { host: 'notes.example', origin: 'https://notes.example', referer: 'http://notes.example/' },
    { host: 'notes.example', origin: 'http://notes.example', referer: 'https://notes.example/' },
    { host: 'notes.example', origin: 'https://notes.example', 'sec-fetch-site': 'cross-site' },
    { host: 'notes.example', origin: 'https://other.example', 'x-forwarded-proto': 'https' },
    { host: 'localhost:3044', origin: 'http://127.0.0.1:3044' },
    { host: 'localhost:3044', referer: 'http://localhost:3044/', 'sec-fetch-site': 'same-site' },
    { host: 'localhost:3044', origin: 'http://localhost:3044', referer: 'https://evil.example/' },
    { host: 'localhost:3044', origin: 'http://localhost:3044', 'sec-fetch-site': 'cross-site' },
    { host: 'evil.example:3044', origin: 'http://localhost:3044', 'x-forwarded-host': 'localhost:3044' },
    { host: 'localhost:3044.evil.example', origin: 'http://localhost:3044' },
    { host: 'localhost:3044', origin: 'yank-note://evil.example' },
    { host: 'localhost:3044', origin: 'yank-note://localhost:1234' }
  ])('rejects missing, opaque or mismatched sources: %j', headers => {
    expect(check(headers)).toBe(false)
  })

  test('supports the default HTTP port for the Electron terminal', () => {
    expect(createRequestOriginGuard(80)({ host: 'localhost', origin: 'yank-note://localhost' }, false, true)).toBe(true)
  })

  test('requires explicit Origin for WebSocket even with matching fetch metadata', () => {
    expect(check({ host: 'localhost:3044', 'sec-fetch-site': 'same-origin' }, false, true)).toBe(false)
    expect(check({ host: 'localhost:3044', origin: 'http://localhost:3044' }, false, true)).toBe(true)
    expect(check({ host: 'notes.example:443', origin: 'https://notes.example' }, false, true)).toBe(true)
    expect(check({ host: 'notes.example:443', referer: 'https://notes.example/', 'sec-fetch-site': 'same-origin' }, false, true)).toBe(false)
  })

  test('only grants the metadata-free exception to internal Electron transport', () => {
    expect(check({}, true)).toBe(true)
    expect(check({}, false)).toBe(false)
    expect(check({ origin: 'null' }, true)).toBe(false)
    expect(check({ origin: 'https://evil.example' }, true)).toBe(false)
    expect(check({ origin: 'yank-note://localhost' }, true)).toBe(true)
    expect(check({ 'sec-fetch-site': 'cross-site' }, true)).toBe(false)
  })

  test('only API mode allows source-free native requests; explicit bad evidence never falls back', () => {
    expect(check({ host: 'localhost:3044' }, false, false, true)).toBe(true)
    expect(check({ host: 'notes.example:3044' }, false, false, true)).toBe(true)
    expect(check({ host: 'localhost:3044', 'sec-fetch-mode': 'cors' }, false, false, true)).toBe(true)
    for (const headers of [
      { origin: 'null' }, { origin: '' }, { origin: 'https://evil.example' },
      { referer: '' }, { referer: 'https://evil.example/' },
      { 'sec-fetch-site': 'same-site' }, { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': '' }
    ]) {
      expect(check({ host: 'localhost:3044', ...headers }, false, false, true)).toBe(false)
    }
    expect(check({ host: 'localhost:3044' }, false, true, true)).toBe(false)
  })
})
