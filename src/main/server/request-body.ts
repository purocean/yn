import type { Middleware } from 'koa'

const postOnlyPaths = new Set([
  '/api/history/delete',
  '/api/history/comment',
  '/api/watch-file',
])

const extensionPostPrefixes = [
  '/api/extensions/install',
  '/api/extensions/uninstall',
  '/api/extensions/enable',
  '/api/extensions/disable',
]

/** Run before the proxy, body parser and API handlers. */
export const checkApiRequestBody: Middleware = async (ctx, next) => {
  if (ctx.path !== '/api' && !ctx.path.startsWith('/api/')) {
    await next()
    return
  }

  // This endpoint forwards the original stream, rather than parsing an API body.
  // It is still subject to the source and permission checks before this middleware.
  if (ctx.path.startsWith('/api/proxy-fetch/')) {
    await next()
    return
  }

  const extensionPost = extensionPostPrefixes.some(prefix => ctx.path.startsWith(prefix))
  const extensionDelete = ctx.path.startsWith('/api/extensions/abort-installation')
  const extensionAction = extensionPost || extensionDelete
  const postOnly = postOnlyPaths.has(ctx.path) || ctx.path.startsWith('/api/run') || ctx.path.startsWith('/api/convert/')
  const requiredMethod = extensionDelete ? 'DELETE' : (extensionPost || postOnly) ? 'POST' : undefined

  // Every GET /api/extensions* is a read-only list in the existing handler.
  if (requiredMethod && ctx.method !== requiredMethod && !(extensionAction && ctx.method === 'GET')) {
    ctx.status = 405
    ctx.set('Allow', extensionAction ? `GET, ${requiredMethod}` : requiredMethod)
    ctx.body = { status: 'error', message: 'Method not allowed', data: null }
    return
  }

  const contentType = ctx.headers['content-type']
  const mediaType = typeof contentType === 'string' ? contentType.split(';', 1)[0].trim().toLowerCase() : ''
  const hasBody = Number(ctx.headers['content-length'] || 0) > 0 || ctx.headers['transfer-encoding'] !== undefined
  const bodyMethod = ['POST', 'PUT', 'PATCH'].includes(ctx.method)

  // Extension actions and GET/DELETE calls already pass their arguments in the
  // URL. Preserve their bodyless requests without requiring a Content-Type.
  if (!hasBody && contentType === undefined && (!bodyMethod || extensionPost)) {
    await next()
    return
  }

  const textUpload = ctx.method === 'POST' && (ctx.path === '/api/tmp-file' || ctx.path === '/api/user-file')
  const multipartUpload = ctx.method === 'POST' && ctx.path === '/api/attachment'

  if (mediaType !== 'application/json' &&
    !(textUpload && mediaType === 'text/plain') &&
    !(multipartUpload && mediaType === 'multipart/form-data')) {
    ctx.status = 415
    ctx.body = { status: 'error', message: 'Unsupported API request Content-Type', data: null }
    return
  }

  await next()
}
