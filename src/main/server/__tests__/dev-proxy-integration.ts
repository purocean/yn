// @vitest-environment node
import { createServer, request } from 'http'
import type { IncomingHttpHeaders } from 'http'
import type { AddressInfo } from 'net'
import { createServer as createViteServer } from 'vite'
import { createDevProxy } from '../../../../scripts/dev-proxy'
import { createRequestOriginGuard } from '../request-origin'

test('the real Vite proxy validates HTTP, polling and WebSocket requests before forwarding', async () => {
  let forwarded = 0
  let checkBackend: ReturnType<typeof createRequestOriginGuard>
  const backend = createServer((req, res) => {
    forwarded++
    res.statusCode = checkBackend(req.headers) ? 200 : 403
    res.end(JSON.stringify(req.headers))
  })
  backend.on('upgrade', (req, socket) => {
    forwarded++
    if (!checkBackend(req.headers, false, true)) {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n')
    } else {
      socket.end('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n')
    }
  })
  await new Promise<void>(resolve => backend.listen(0, '127.0.0.1', resolve))
  const backendPort = (backend.address() as AddressInfo).port
  checkBackend = createRequestOriginGuard(backendPort, '127.0.0.1')
  const target = `http://127.0.0.1:${backendPort}`
  const vite = await createViteServer({
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: {
      host: '127.0.0.1', port: 0, hmr: false, watch: null,
      proxy: { '/api': createDevProxy(target), '/ws': { ...createDevProxy(target), ws: true } }
    }
  })

  try {
    await vite.listen()
    const port = (vite.httpServer!.address() as AddressInfo).port
    const origin = `http://localhost:${port}`
    const send = (path: string, headers: IncomingHttpHeaders) => new Promise<{ status: number, body: string }>((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port, path, headers: { host: `localhost:${port}`, ...headers } })
      req.on('response', res => {
        let body = ''
        res.on('data', chunk => { body += chunk })
        res.on('end', () => resolve({ status: res.statusCode!, body }))
      })
      req.on('upgrade', (res, socket) => {
        socket.destroy()
        resolve({ status: res.statusCode!, body: '' })
      })
      req.on('error', reject)
      req.end()
    })

    const api = await send('/api/settings', { origin, referer: origin + '/', 'sec-fetch-site': 'same-origin' })
    expect(api.status).toBe(200)
    expect(JSON.parse(api.body)).toMatchObject({ host: `127.0.0.1:${backendPort}`, origin: target, referer: target + '/' })
    expect((await send('/ws?transport=polling', { referer: origin + '/', 'sec-fetch-site': 'same-origin' })).status).toBe(200)
    expect((await send('/ws?transport=websocket', { origin, connection: 'Upgrade', upgrade: 'websocket' })).status).toBe(101)

    const accepted = forwarded
    for (const headers of [
      {},
      { origin: 'null' },
      { origin: 'https://attacker.example' },
      { origin, 'sec-fetch-site': 'cross-site' },
      { host: `rebound.example:${port}`, origin: `http://rebound.example:${port}`, 'sec-fetch-site': 'same-origin' }
    ]) {
      expect([403, 404]).toContain((await send('/api/settings', headers)).status)
      expect([403, 404]).toContain((await send('/ws?transport=polling', headers)).status)
      expect((await send('/ws?transport=websocket', { ...headers, connection: 'Upgrade', upgrade: 'websocket' })).status).toBe(404)
    }
    expect((await send('/ws?transport=websocket', { 'sec-fetch-site': 'same-origin', connection: 'Upgrade', upgrade: 'websocket' })).status).toBe(404)
    expect(forwarded).toBe(accepted)
  } finally {
    await vite.close()
    await new Promise<void>((resolve, reject) => backend.close(error => error ? reject(error) : resolve()))
  }
}, 15000)
