import { networkInterfaces } from 'os'
import { createRequestOriginGuard } from '../request-origin'

vi.mock('os', () => {
  const networkInterfaces = vi.fn(() => ({
    eth0: [{ address: '192.168.1.4', family: 'IPv4' }, { address: '2001:db8::1', family: 'IPv6' }]
  }))
  return { networkInterfaces, default: { networkInterfaces } }
})

describe('request origin boundary', () => {
  const check = createRequestOriginGuard(3044, '127.0.0.1')

  test.each([
    { host: 'localhost:3044', origin: 'http://localhost:3044' },
    { host: '127.0.0.1:3044', origin: 'http://127.0.0.1:3044' },
    { host: '[::1]:3044', origin: 'http://[::1]:3044' },
    { host: 'localhost:3044', referer: 'http://localhost:3044/embed/?a=1' },
    { host: 'localhost:3044', 'sec-fetch-site': 'same-origin' },
    { host: 'localhost:3044', origin: 'yank-note://localhost', 'sec-fetch-site': 'cross-site' }
  ])('accepts a trusted browser source: %j', headers => {
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
    { host: 'localhost:3044', origin: 'https://localhost:3044' },
    { host: 'localhost:3044', origin: 'http://127.0.0.1:3044' },
    { host: 'localhost:3044', referer: 'http://localhost:3044/', 'sec-fetch-site': 'same-site' },
    { host: 'localhost:3044', origin: 'http://localhost:3044', referer: 'https://evil.example/' },
    { host: 'localhost:3044', origin: 'http://localhost:3044', 'sec-fetch-site': 'cross-site' },
    { host: 'evil.example:3044', origin: 'http://evil.example:3044', 'sec-fetch-site': 'same-origin' },
    { host: 'evil.example:3044', origin: 'http://localhost:3044', 'x-forwarded-host': 'localhost:3044' },
    { host: 'localhost:3044.evil.example', origin: 'http://localhost:3044' },
    { host: 'localhost:3044', origin: 'yank-note://evil.example' },
    { host: 'localhost:3044', origin: 'yank-note://localhost:1234' }
  ])('rejects missing, opaque, mismatched or rebinding sources: %j', headers => {
    expect(check(headers)).toBe(false)
  })

  test('allows actual interface addresses for a wildcard listener, never arbitrary DNS names', () => {
    const wildcard = createRequestOriginGuard(3044, '0.0.0.0')
    expect(wildcard({ host: '192.168.1.4:3044', origin: 'http://192.168.1.4:3044' })).toBe(true)
    expect(wildcard({ host: '[2001:db8::1]:3044', origin: 'http://[2001:db8::1]:3044' })).toBe(true)
    expect(wildcard({ host: 'rebound.example:3044', origin: 'http://rebound.example:3044' })).toBe(false)
  })

  test('fails closed if interface enumeration is unavailable', () => {
    vi.mocked(networkInterfaces).mockImplementationOnce(() => { throw new Error('Unavailable') })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const wildcard = createRequestOriginGuard(3044, '::', ['https://notes.example'])
      expect(wildcard({ host: 'localhost:3044', origin: 'http://localhost:3044' })).toBe(true)
      expect(wildcard({ host: 'notes.example', origin: 'https://notes.example' })).toBe(true)
      expect(wildcard({ host: 'unknown.example', origin: 'http://unknown.example' })).toBe(false)
    } finally {
      warn.mockRestore()
    }
  })

  test('supports the default HTTP port for the Electron terminal', () => {
    expect(createRequestOriginGuard(80, '127.0.0.1')({ host: 'localhost', origin: 'yank-note://localhost' }, false, true)).toBe(true)
  })

  test('requires explicit Origin for WebSocket even with matching fetch metadata', () => {
    expect(check({ host: 'localhost:3044', 'sec-fetch-site': 'same-origin' }, false, true)).toBe(false)
    expect(check({ host: 'localhost:3044', origin: 'http://localhost:3044' }, false, true)).toBe(true)
  })

  test('only grants the metadata-free exception to internal Electron transport', () => {
    expect(check({}, true)).toBe(true)
    expect(check({}, false)).toBe(false)
    expect(check({ origin: 'null' }, true)).toBe(false)
    expect(check({ origin: 'https://evil.example' }, true)).toBe(false)
    expect(check({ origin: 'yank-note://localhost' }, true)).toBe(true)
    expect(check({ 'sec-fetch-site': 'cross-site' }, true)).toBe(false)
  })

  test('supports explicitly configured remote origins and development proxy without trusting forwarding headers', () => {
    const remote = createRequestOriginGuard(3044, '0.0.0.0', ['https://notes.example', 'http://localhost:8066'])
    expect(remote({ host: 'notes.example', origin: 'https://notes.example' })).toBe(true)
    expect(remote({ host: 'notes.example', origin: 'http://notes.example' })).toBe(false)
    expect(remote({ host: 'localhost:8066', referer: 'http://localhost:8066/' })).toBe(true)
    expect(check({ host: 'localhost:8066', origin: 'http://localhost:8066' })).toBe(false)
  })
})
