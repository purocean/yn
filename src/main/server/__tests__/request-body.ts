// @vitest-environment node
import type { Context } from 'koa'
import type { Server } from 'http'
import type { AddressInfo } from 'net'
import Koa from 'koa'
import bodyParser from 'koa-body'
import { checkApiRequestBody } from '../request-body'

async function check (path: string, method = 'POST', headers: Record<string, string> = {}) {
  const ctx = { path, method, headers, set: vi.fn() } as unknown as Context
  const next = vi.fn(async () => undefined)
  await checkApiRequestBody(ctx, next)
  return { ctx, next }
}

describe('API request body policy', () => {
  test.each([
    'application/json',
    'application/json; charset=utf-8',
    'Application/JSON; Charset=UTF-8',
  ])('accepts the JSON media type %s', async contentType => {
    const { next } = await check('/api/settings', 'POST', { 'content-type': contentType })
    expect(next).toHaveBeenCalledOnce()
  })

  test.each([
    undefined,
    '',
    'text/plain',
    'text/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data; boundary=example',
    'application/jsonp',
    'application/problem+json',
    'text/plain; application/json',
    'application/json, text/plain',
  ])('rejects non-JSON API bodies before downstream parsing: %s', async contentType => {
    const headers: Record<string, string> = { 'content-length': '20' }
    if (contentType !== undefined) headers['content-type'] = contentType
    const { ctx, next } = await check('/api/settings', 'POST', headers)
    expect(ctx.status).toBe(415)
    expect(ctx.body).toMatchObject({ status: 'error' })
    expect(next).not.toHaveBeenCalled()
  })

  test.each(['POST', 'PUT', 'PATCH'])('requires JSON even for empty %s requests', async method => {
    const { ctx, next } = await check('/api/file', method, { 'content-length': '0' })
    expect(ctx.status).toBe(415)
    expect(next).not.toHaveBeenCalled()
  })

  test.each([
    ['/api/file', 'GET'],
    ['/api/file', 'DELETE'],
    ['/api/tree', 'GET'],
    ['/api/history/list', 'GET'],
    ['/api/history/content', 'GET'],
    ['/api/settings', 'GET'],
    ['/api/tmp-file', 'GET'],
    ['/api/tmp-file', 'DELETE'],
    ['/api/user-file', 'GET'],
    ['/api/user-file', 'DELETE'],
    ['/api/attachment/main/image.png', 'GET'],
  ])('preserves bodyless %s %s requests', async (path, method) => {
    const { next } = await check(path, method, { 'content-length': '0' })
    expect(next).toHaveBeenCalledOnce()
  })

  test.each(['GET', 'HEAD', 'DELETE', 'OPTIONS'])('checks declared %s bodies too', async method => {
    const requestHeaders: Record<string, string>[] = [
      { 'content-type': 'text/plain', 'content-length': '5' },
      { 'transfer-encoding': 'chunked' },
      { 'content-length': '5' },
    ]
    for (const headers of requestHeaders) {
      const { ctx, next } = await check('/api/file', method, headers)
      expect(ctx.status).toBe(415)
      expect(next).not.toHaveBeenCalled()
    }
  })

  test.each(['/api/tmp-file', '/api/user-file'])('preserves exact raw-text upload %s', async path => {
    const { next } = await check(path, 'POST', { 'content-type': 'text/plain;charset=UTF-8' })
    expect(next).toHaveBeenCalledOnce()
  })

  test.each(['/api/tmp-file/extra', '/api/tmp-file-other', '/api/user-file/extra', '/api/user-file-other'])('does not extend raw-text upload exception to %s', async path => {
    const { ctx, next } = await check(path, 'POST', { 'content-type': 'text/plain' })
    expect(ctx.status).toBe(415)
    expect(next).not.toHaveBeenCalled()
  })

  test.each(['/api/tmp-file', '/api/user-file'])('does not accept form or multipart uploads at %s', async path => {
    for (const contentType of ['application/x-www-form-urlencoded', 'multipart/form-data; boundary=example']) {
      const { ctx, next } = await check(path, 'POST', { 'content-type': contentType })
      expect(ctx.status).toBe(415)
      expect(next).not.toHaveBeenCalled()
    }
  })

  test.each(['PUT', 'PATCH', 'DELETE', 'GET', 'HEAD', 'OPTIONS'])('does not extend upload exceptions to %s', async method => {
    for (const [path, contentType] of [
      ['/api/tmp-file', 'text/plain'],
      ['/api/user-file', 'text/plain'],
      ['/api/attachment', 'multipart/form-data; boundary=example'],
    ]) {
      const { ctx, next } = await check(path, method, { 'content-type': contentType, 'content-length': '5' })
      expect(ctx.status).toBe(415)
      expect(next).not.toHaveBeenCalled()
    }
  })

  test.each(['multipart/form-data; boundary=example', 'application/json'])('preserves attachment uploads with %s', async contentType => {
    const { next } = await check('/api/attachment', 'POST', { 'content-type': contentType })
    expect(next).toHaveBeenCalledOnce()
  })

  test.each(['/api/attachment/extra', '/api/attachment-other'])('does not extend multipart exception to %s', async path => {
    const { ctx, next } = await check(path, 'POST', { 'content-type': 'multipart/form-data; boundary=example' })
    expect(ctx.status).toBe(415)
    expect(next).not.toHaveBeenCalled()
  })

  test.each([
    '/api/run',
    '/api/run/extra',
    '/api/runtime',
    '/api/convert/export.html',
    '/api/history/delete',
    '/api/history/comment',
    '/api/watch-file',
  ])('requires POST and JSON for the body-driven handler %s', async path => {
    for (const method of ['GET', 'HEAD', 'DELETE', 'PUT', 'PATCH', 'OPTIONS']) {
      const { ctx, next } = await check(path, method, { 'content-type': 'application/json' })
      expect(ctx.status).toBe(405)
      expect(ctx.set).toHaveBeenCalledWith('Allow', 'POST')
      expect(next).not.toHaveBeenCalled()
    }

    expect((await check(path)).ctx.status).toBe(415)
    expect((await check(path, 'POST', { 'content-type': 'application/json' })).next).toHaveBeenCalledOnce()
  })

  test.each([
    ['/api/extensions/install', 'POST'],
    ['/api/extensions/uninstall', 'POST'],
    ['/api/extensions/enable', 'POST'],
    ['/api/extensions/disable', 'POST'],
    ['/api/extensions/abort-installation', 'DELETE'],
  ])('preserves bodyless %s %s but rejects method and MIME bypasses', async (path, method) => {
    expect((await check(path, method)).next).toHaveBeenCalledOnce()
    expect((await check(path, method, { 'content-length': '0' })).next).toHaveBeenCalledOnce()
    expect((await check(path, method, { 'content-type': 'application/json' })).next).toHaveBeenCalledOnce()
    expect((await check(path, 'GET')).next).toHaveBeenCalledOnce()
    expect((await check(path + '/suffix', 'GET')).next).toHaveBeenCalledOnce()

    for (const contentType of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=example']) {
      const { ctx, next } = await check(path, method, { 'content-type': contentType })
      expect(ctx.status).toBe(415)
      expect(next).not.toHaveBeenCalled()
    }

    for (const otherMethod of ['HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].filter(value => value !== method)) {
      const { ctx, next } = await check(path + '/suffix', otherMethod)
      expect(ctx.status).toBe(405)
      expect(ctx.set).toHaveBeenCalledWith('Allow', `GET, ${method}`)
      expect(next).not.toHaveBeenCalled()
    }
  })

  test('does not broaden the streaming proxy exception', async () => {
    const headers = { 'content-type': 'text/plain' }
    expect((await check('/api/proxy-fetch/https://example.test', 'POST', headers)).next).toHaveBeenCalledOnce()
    expect((await check('/api/proxy-fetch', 'POST', headers)).ctx.status).toBe(415)
    expect((await check('/api/proxy-fetch-other', 'POST', headers)).ctx.status).toBe(415)
  })

  test.each(['/index.html', '/custom-css', '/extensions/sample.js', '/api-other'])('leaves non-API path %s alone', async path => {
    const { next } = await check(path, 'POST', { 'content-type': 'text/plain' })
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('API body policy before the real Koa body parser', () => {
  let server: Server
  let origin: string
  let parserVisits = 0
  let handlerVisits = 0

  beforeAll(async () => {
    const app = new Koa()
    app.silent = true
    app.use(checkApiRequestBody)
    const parse = bodyParser({ multipart: true })
    app.use(async (ctx, next) => {
      parserVisits++
      await parse(ctx, next)
    })
    app.use(ctx => {
      handlerVisits++
      ctx.body = { parsed: ctx.request.body }
    })
    await new Promise<void>(resolve => {
      server = app.listen(0, '127.0.0.1', resolve)
    })
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
      server.closeAllConnections()
    })
  })

  beforeEach(() => {
    parserVisits = 0
    handlerVisits = 0
  })

  test('parses normal API JSON', async () => {
    const response = await fetch(origin + '/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ language: 'en' }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ parsed: { language: 'en' } })
    expect(handlerVisits).toBe(1)
  })

  test.each(['application/x-www-form-urlencoded', 'text/plain'])('rejects %s before the parser or handler runs', async contentType => {
    const response = await fetch(origin + '/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: 'language=en',
    })
    expect(response.status).toBe(415)
    expect(parserVisits).toBe(0)
    expect(handlerVisits).toBe(0)
  })

  test('rejects multipart outside the exact attachment endpoint before parsing', async () => {
    const data = new FormData()
    data.set('language', 'en')
    const response = await fetch(origin + '/api/settings', { method: 'POST', body: data })
    expect(response.status).toBe(415)
    expect(parserVisits).toBe(0)
    expect(handlerVisits).toBe(0)
  })

  test('preserves the actual multipart attachment fields', async () => {
    const fields = { repo: 'main', path: '/image.png', attachment: 'data:image/png;base64,aGk=', exists: 'rename' }
    const data = new FormData()
    Object.entries(fields).forEach(([key, value]) => data.set(key, value))
    const response = await fetch(origin + '/api/attachment', { method: 'POST', body: data })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ parsed: fields })
    expect(handlerVisits).toBe(1)
  })

  test.each(['/api/tmp-file', '/api/user-file'])('preserves the raw text body at %s', async path => {
    const body = '{"this":"must stay text"}'
    const response = await fetch(origin + path, { method: 'POST', body })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ parsed: body })
    expect(handlerVisits).toBe(1)
  })

  test('invalid JSON cannot reach an API handler', async () => {
    const response = await fetch(origin + '/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })
    expect(response.status).toBe(400)
    expect(parserVisits).toBe(1)
    expect(handlerVisits).toBe(0)
  })

  test.each([
    ['/api/run', 'GET'],
    ['/api/convert/export.html', 'DELETE'],
    ['/api/history/delete', 'HEAD'],
    ['/api/history/comment', 'OPTIONS'],
    ['/api/watch-file', 'GET'],
    ['/api/extensions/install', 'HEAD'],
    ['/api/extensions/enable', 'OPTIONS'],
  ])('rejects unsupported %s %s before parsing or mutation', async (path, method) => {
    const response = await fetch(origin + path, { method })
    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe(path.startsWith('/api/extensions/') ? 'GET, POST' : 'POST')
    expect(parserVisits).toBe(0)
    expect(handlerVisits).toBe(0)
  })
})
