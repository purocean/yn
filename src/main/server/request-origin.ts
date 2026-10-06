import type { IncomingHttpHeaders } from 'http'
import { networkInterfaces } from 'os'

const desktopOrigin = 'yank-note://localhost'

function parseOrigin (value: unknown, allowPath = false): string | undefined {
  if (typeof value !== 'string' || !value || value.trim() !== value || value === 'null') return
  try {
    const url = new URL(value)
    if (url.username || url.password || (!allowPath && ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash))) return
    if (url.protocol === 'yank-note:' && url.host === 'localhost') return desktopOrigin
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return
    return url.origin
  } catch (_) {
    return undefined
  }
}

export function createRequestOriginGuard (port: number, host: string, additionalOrigins: string[] = []) {
  // Never derive the allowlist from Host or forwarding headers: they are attacker-controlled.
  const hosts = new Set(['localhost', '127.0.0.1', '[::1]'])
  if (host === '0.0.0.0' || host === '::') {
    try {
      Object.values(networkInterfaces()).flat().forEach(address => {
        if (address && !address.address.includes('%')) {
          hosts.add(address.family === 'IPv6' ? `[${address.address}]` : address.address)
        }
      })
    } catch (error) {
      // Sandboxed platforms may deny interface enumeration. Fail closed to
      // loopback plus explicit trusted origins instead of trusting request Host.
      console.warn('Unable to enumerate server interfaces', error)
    }
  } else {
    hosts.add(host.includes(':') && !host.startsWith('[') ? `[${host}]` : host)
  }

  const origins = new Set([...hosts].map(hostname => new URL(`http://${hostname}:${port}`).origin))
  for (const value of additionalOrigins) {
    const origin = parseOrigin(value)
    if (origin && origin !== desktopOrigin) origins.add(origin)
  }
  const authorities = new Set([...origins].map(origin => new URL(origin).host))

  return (headers: IncomingHttpHeaders, internalProtocol = false, websocket = false): boolean => {
    const originHeader = headers.origin
    const refererHeader = headers.referer
    const origin = parseOrigin(originHeader)
    const referer = parseOrigin(refererHeader, true)

    // Reject opaque, malformed and conflicting evidence rather than falling back past it.
    if (originHeader !== undefined && !origin) return false
    if (refererHeader !== undefined && !referer) return false

    if (internalProtocol) {
      return (!origin || origin === desktopOrigin) && (!referer || referer === desktopOrigin) &&
        (!headers['sec-fetch-site'] || headers['sec-fetch-site'] === 'same-origin' || headers['sec-fetch-site'] === 'none')
    }

    const authority = headers.host
    if (typeof authority !== 'string' || !authorities.has(authority)) return false

    // Electron's privileged, standard scheme connects to the local terminal over HTTP.
    if (origin === desktopOrigin) {
      return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${authority}`).hostname) &&
        (new URL(`http://${authority}`).port || '80') === String(port) && (!referer || referer === desktopOrigin)
    }

    const matchesTarget = (source: string) => origins.has(source) && new URL(source).host === authority
    if (origin && !matchesTarget(origin)) return false
    if (referer && !matchesTarget(referer)) return false
    if (origin && referer && origin !== referer) return false
    if (headers['sec-fetch-site'] && headers['sec-fetch-site'] !== 'same-origin') return false

    // A WebSocket handshake must carry Origin. GET/script/image requests often do not;
    // Fetch Metadata or an exact Referer preserves those browser resource loads.
    if (websocket) return !!origin
    return !!origin || !!referer || headers['sec-fetch-site'] === 'same-origin'
  }
}
