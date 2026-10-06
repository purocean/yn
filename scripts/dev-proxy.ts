import type { ProxyOptions } from 'vite'
import { createRequestOriginGuard } from '../src/main/server/request-origin'

export function createDevProxy (target: string): ProxyOptions {
  const backend = new URL(target)
  return {
    target,
    changeOrigin: true,
    // Vite runs bypass before both HTTP proxying and WebSocket upgrades. Validate
    // first: blindly rewriting Origin would turn Vite into a cross-site gateway.
    bypass (req) {
      const { localAddress, localPort } = req.socket
      if (!localAddress || !localPort) return false
      const checkOrigin = createRequestOriginGuard(localPort, localAddress)
      if (!checkOrigin(req.headers, false, req.headers.upgrade?.toLowerCase() === 'websocket')) return false

      if (req.headers.origin?.startsWith('http')) req.headers.origin = backend.origin
      if (req.headers.referer?.startsWith('http')) {
        const referer = new URL(req.headers.referer)
        req.headers.referer = backend.origin + referer.pathname + referer.search
      }
    }
  }
}
