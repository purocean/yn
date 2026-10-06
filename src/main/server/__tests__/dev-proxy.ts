import type { IncomingMessage } from 'http'
import { createDevProxy } from '../../../../scripts/dev-proxy'
import { createRequestOriginGuard } from '../request-origin'

describe('Vite development proxy origin adaptation', () => {
  const proxy = createDevProxy('http://127.0.0.1:3044')
  const backend = createRequestOriginGuard(3044, '127.0.0.1')
  const request = (headers: Record<string, string | undefined>, port = 8066) => ({
    headers: { host: `localhost:${port}`, ...headers },
    socket: { localAddress: '127.0.0.1', localPort: port }
  }) as IncomingMessage

  test.each([
    { origin: 'http://localhost:8066' },
    { referer: 'http://localhost:8066/embed/?a=1' },
    { 'sec-fetch-site': 'same-origin' },
    { origin: 'http://localhost:8066', upgrade: 'websocket' }
  ])('validates then adapts a trusted request: %j', headers => {
    const req = request(headers)
    expect(proxy.bypass!(req, undefined, proxy)).toBeUndefined()
    // http-proxy applies changeOrigin to the forwarded Host after bypass.
    expect(proxy.changeOrigin).toBe(true)
    req.headers.host = '127.0.0.1:3044'
    expect(backend(req.headers, false, !!headers.upgrade)).toBe(true)
    if (headers.origin) expect(req.headers.origin).toBe('http://127.0.0.1:3044')
    if (headers.referer) expect(req.headers.referer).toBe('http://127.0.0.1:3044/embed/?a=1')
  })

  test.each([
    {},
    { origin: 'https://attacker.example' },
    { origin: 'null', 'sec-fetch-site': 'same-origin' },
    { origin: 'http://localhost:8067' },
    { origin: 'http://localhost:8066', 'sec-fetch-site': 'cross-site' },
    { referer: 'http://localhost:8066/', 'sec-fetch-site': 'same-site' },
    { origin: 'http://localhost:8066', referer: 'https://attacker.example/' },
    { host: 'rebound.example:8066', origin: 'http://rebound.example:8066', 'sec-fetch-site': 'same-origin' },
    { upgrade: 'websocket', 'sec-fetch-site': 'same-origin' },
    { upgrade: 'websocket', origin: 'null' },
    { upgrade: 'websocket', origin: 'https://attacker.example' }
  ])('rejects without rewriting attacker-controlled evidence: %j', headers => {
    const req = request(headers)
    const original = { ...req.headers }
    expect(proxy.bypass!(req, undefined, proxy)).toBe(false)
    expect(req.headers).toEqual(original)
  })

  test('preserves the trusted Electron scheme when adapting the target Host', () => {
    const req = request({ origin: 'yank-note://localhost', referer: 'yank-note://localhost/', 'sec-fetch-site': 'cross-site' })
    expect(proxy.bypass!(req, undefined, proxy)).toBeUndefined()
    req.headers.host = '127.0.0.1:3044'
    expect(backend(req.headers)).toBe(true)
    expect(req.headers.origin).toBe('yank-note://localhost')
  })

  test('uses the actual listening port, never an arbitrary Host-derived port', () => {
    expect(proxy.bypass!(request({ origin: 'http://localhost:8070' }, 8070), undefined, proxy)).toBeUndefined()
    expect(proxy.bypass!(request({ host: 'localhost:8070', origin: 'http://localhost:8070' }), undefined, proxy)).toBe(false)
  })

  test('does not add a Vite-origin exception to the backend', () => {
    expect(backend({ host: '127.0.0.1:3044', origin: 'http://localhost:8066' })).toBe(false)
  })
})
