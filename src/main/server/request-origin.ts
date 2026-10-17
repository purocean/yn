import type { IncomingHttpHeaders } from 'http'

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

export function createRequestOriginGuard (port: number) {
  return (headers: IncomingHttpHeaders, internalProtocol = false, websocket = false, allowNative = false): boolean => {
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

    // A reverse proxy may terminate TLS before forwarding to the HTTP server.
    const protocol = (origin || referer)?.startsWith('https:') ? 'https' : 'http'
    const targetOrigin = typeof headers.host === 'string' && parseOrigin(`${protocol}://${headers.host}`)
    if (!targetOrigin) return false

    // Electron's privileged, standard scheme connects to the local terminal over HTTP.
    if (origin === desktopOrigin) {
      const target = new URL(targetOrigin)
      return ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) &&
        (target.port || '80') === String(port) && (!referer || referer === desktopOrigin)
    }

    if (origin && origin !== targetOrigin) return false
    if (referer && referer !== targetOrigin) return false
    if (headers['sec-fetch-site'] !== undefined && headers['sec-fetch-site'] !== 'same-origin') return false

    // A WebSocket handshake must carry Origin. GET/script/image requests often do not;
    // Fetch Metadata or an exact Referer preserves those browser resource loads.
    if (websocket) return !!origin
    // Preserve existing native HTTP API authentication when no source evidence
    // exists. This exception is never used for executable embeds or terminals.
    return !!origin || !!referer || headers['sec-fetch-site'] === 'same-origin' || allowNative
  }
}
