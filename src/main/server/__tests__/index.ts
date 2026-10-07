const mocks = vi.hoisted(() => {
  const { EventEmitter } = require('node:events')
  const { PassThrough } = require('node:stream')
  const nodePath = require('node:path')

  class MockKoa {
    static instances: MockKoa[] = []
    middlewares: Function[] = []

    constructor () {
      MockKoa.instances.push(this)
    }

    use (middleware: Function) {
      this.middlewares.push(middleware)
      return this
    }

    callback () {
      return async (ctx: any) => {
        let index = -1
        const dispatch = async (i: number): Promise<void> => {
          if (i <= index) throw new Error('next() called multiple times')
          index = i
          const middleware = this.middlewares[i]
          if (middleware) {
            await middleware(ctx, () => dispatch(i + 1))
          }
        }

        await dispatch(0)
      }
    }
  }

  const socketEmitter = Object.assign(new EventEmitter(), { engine: { use: vi.fn() } })
  const httpServer = { listen: vi.fn(), on: vi.fn() }

  return {
    MockKoa,
    PassThrough,
    actions: new Map<string, any>(),
    bodyParser: vi.fn(() => async (_ctx: any, next: any) => next()),
    configGet: vi.fn(),
    configGetAll: vi.fn(),
    configSet: vi.fn(),
    configSetAll: vi.fn(),
    consoleError: vi.spyOn(console, 'error').mockImplementation(() => undefined),
    consoleLog: vi.spyOn(console, 'log').mockImplementation(() => undefined),
    convert: vi.fn(),
    disableServer: true,
    extensionAbortInstallation: vi.fn(),
    extensionDisable: vi.fn(),
    extensionDirnameToId: vi.fn((name: string) => `id:${name}`),
    extensionEnable: vi.fn(),
    extensionInstall: vi.fn(),
    extensionList: vi.fn(),
    extensionUninstall: vi.fn(),
    fileCheckHash: vi.fn(),
    fileCheckWriteable: vi.fn(),
    fileCommentHistoryVersion: vi.fn(),
    fileCp: vi.fn(),
    fileCreateReadStream: vi.fn(),
    fileDeleteHistoryVersion: vi.fn(),
    fileExists: vi.fn(),
    fileHash: vi.fn(),
    fileHistoryContent: vi.fn(),
    fileHistoryList: vi.fn(),
    fileMv: vi.fn(),
    fileRead: vi.fn(),
    fileRm: vi.fn(),
    fileStat: vi.fn(),
    fileTree: vi.fn(),
    fileUpload: vi.fn(),
    fileWatchFile: vi.fn(),
    fileWrite: vi.fn(),
    fsCreateReadStream: vi.fn(),
    fsEnsureFile: vi.fn(),
    fsExistsSync: vi.fn(),
    fsReadFile: vi.fn(),
    fsRealpathSync: vi.fn(),
    fsReaddir: vi.fn(),
    fsStat: vi.fn(),
    fsStatSync: vi.fn(),
    fsUnlink: vi.fn(),
    fsWriteFile: vi.fn(),
    handleMCPRequest: vi.fn(),
    httpCreateServer: vi.fn(() => httpServer),
    httpServer,
    jwtVerify: vi.fn(),
    nodePath,
    plantuml: vi.fn(),
    premiumActivate: vi.fn(),
    request: vi.fn(),
    runCode: vi.fn(),
    search: vi.fn(),
    shellGetShell: vi.fn(() => '/bin/zsh'),
    shellTransformCdCommand: vi.fn((data: string) => `cd:${data}`),
    socketEmitter,
    socketIo: vi.fn(() => socketEmitter)
  }
})

vi.mock('koa', () => ({
  __esModule: true,
  default: mocks.MockKoa
}))

vi.mock('koa-body', () => ({
  __esModule: true,
  default: (...args: any[]) => mocks.bodyParser(...args)
}))

vi.mock('http', () => ({
  createServer: (...args: any[]) => mocks.httpCreateServer(...args)
}))

vi.mock('socket.io', () => ({
  __esModule: true,
  default: (...args: any[]) => mocks.socketIo(...args)
}))

vi.mock('fs-extra', () => {
  const readFile = (...args: any[]) => {
    const cb = typeof args.at(-1) === 'function' ? args.at(-1) : null
    const promise = mocks.fsReadFile(...args.filter((x: any) => typeof x !== 'function'))
    if (cb) {
      Promise.resolve(promise).then((value) => cb(null, value), (error) => cb(error))
      return
    }
    return promise
  }

  return {
    constants: { W_OK: 2 },
    createReadStream: (...args: any[]) => mocks.fsCreateReadStream(...args),
    ensureFile: (...args: any[]) => mocks.fsEnsureFile(...args),
    existsSync: (...args: any[]) => mocks.fsExistsSync(...args),
    readFile,
    realpathSync: (...args: any[]) => mocks.fsRealpathSync(...args),
    readdir: (...args: any[]) => mocks.fsReaddir(...args),
    stat: (...args: any[]) => mocks.fsStat(...args),
    statSync: (...args: any[]) => mocks.fsStatSync(...args),
    unlink: (...args: any[]) => mocks.fsUnlink(...args),
    writeFile: (...args: any[]) => mocks.fsWriteFile(...args)
  }
})

vi.mock('undici', () => ({
  request: (...args: any[]) => mocks.request(...args)
}))

vi.mock('../../constant', () => ({
  APP_NAME: 'yank-note',
  BUILD_IN_STYLES: ['github.css', 'plain.css'],
  get FLAG_DISABLE_SERVER () {
    return mocks.disableServer
  },
  HELP_DIR: '/help',
  HOME_DIR: '/home/tester',
  RESOURCES_DIR: '/resources',
  STATIC_DIR: '/static',
  USER_DATA: '/user-data',
  USER_EXTENSION_DIR: '/extensions',
  USER_PLUGIN_DIR: '/plugins',
  USER_THEME_DIR: '/themes'
}))

vi.mock('../file', () => ({
  checkHash: (...args: any[]) => mocks.fileCheckHash(...args),
  checkWriteable: (...args: any[]) => mocks.fileCheckWriteable(...args),
  commentHistoryVersion: (...args: any[]) => mocks.fileCommentHistoryVersion(...args),
  cp: (...args: any[]) => mocks.fileCp(...args),
  createReadStream: (...args: any[]) => mocks.fileCreateReadStream(...args),
  deleteHistoryVersion: (...args: any[]) => mocks.fileDeleteHistoryVersion(...args),
  exists: (...args: any[]) => mocks.fileExists(...args),
  hash: (...args: any[]) => mocks.fileHash(...args),
  historyContent: (...args: any[]) => mocks.fileHistoryContent(...args),
  historyList: (...args: any[]) => mocks.fileHistoryList(...args),
  mv: (...args: any[]) => mocks.fileMv(...args),
  read: (...args: any[]) => mocks.fileRead(...args),
  rm: (...args: any[]) => mocks.fileRm(...args),
  stat: (...args: any[]) => mocks.fileStat(...args),
  tree: (...args: any[]) => mocks.fileTree(...args),
  upload: (...args: any[]) => mocks.fileUpload(...args),
  watchFile: (...args: any[]) => mocks.fileWatchFile(...args),
  write: (...args: any[]) => mocks.fileWrite(...args)
}))

vi.mock('../search', () => ({
  search: (...args: any[]) => mocks.search(...args)
}))

vi.mock('../run', () => ({
  __esModule: true,
  default: {
    runCode: (...args: any[]) => mocks.runCode(...args)
  }
}))

vi.mock('../convert', () => ({
  __esModule: true,
  default: (...args: any[]) => mocks.convert(...args)
}))

vi.mock('../plantuml', () => ({
  __esModule: true,
  default: (...args: any[]) => mocks.plantuml(...args)
}))

vi.mock('../premium', () => ({
  activate: (...args: any[]) => mocks.premiumActivate(...args)
}))

vi.mock('../../shell', () => ({
  __esModule: true,
  default: {
    CD_COMMAND_PREFIX: '\u001b]51;A',
    getShell: (...args: any[]) => mocks.shellGetShell(...args),
    transformCdCommand: (...args: any[]) => mocks.shellTransformCdCommand(...args)
  }
}))

vi.mock('../../config', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mocks.configGet(...args),
    getAll: (...args: any[]) => mocks.configGetAll(...args),
    set: (...args: any[]) => mocks.configSet(...args),
    setAll: (...args: any[]) => mocks.configSetAll(...args)
  }
}))

vi.mock('../../jwt', () => ({
  verify: (...args: any[]) => mocks.jwtVerify(...args)
}))

vi.mock('../../action', () => ({
  getAction: (name: string) => {
    const action = mocks.actions.get(name) || vi.fn()
    mocks.actions.set(name, action)
    return action
  }
}))

vi.mock('../../extension', () => ({
  abortInstallation: (...args: any[]) => mocks.extensionAbortInstallation(...args),
  dirnameToId: (...args: any[]) => mocks.extensionDirnameToId(...args),
  disable: (...args: any[]) => mocks.extensionDisable(...args),
  enable: (...args: any[]) => mocks.extensionEnable(...args),
  install: (...args: any[]) => mocks.extensionInstall(...args),
  list: (...args: any[]) => mocks.extensionList(...args),
  uninstall: (...args: any[]) => mocks.extensionUninstall(...args)
}))

vi.mock('../mcp', () => ({
  handleMCPRequest: (...args: any[]) => mocks.handleMCPRequest(...args)
}))

function createCtx (overrides: Record<string, any> = {}) {
  const headers: Record<string, any> = {}
  const ctx: any = {
    body: undefined,
    method: overrides.method || 'GET',
    originalUrl: overrides.originalUrl || overrides.path || '/',
    path: overrides.path || '/',
    query: overrides.query || {},
    req: overrides.req || {},
    request: {
      body: overrides.body || {},
      ip: overrides.ip || '127.0.0.1',
      ...(overrides.request || {})
    },
    res: overrides.res || {},
    response: {
      get: (name: string) => headers[name]
    },
    set: vi.fn((name: any, value?: any) => {
      if (typeof name === 'object') {
        Object.assign(headers, name)
      } else {
        headers[name] = value
      }
    }),
    redirect: vi.fn((url: string) => {
      ctx.status = 302
      headers.Location = url
    }),
    type: undefined,
    status: 200,
    get responseHeaders () {
      return headers
    },
    ...overrides,
    headers: { ...(['POST', 'PUT', 'PATCH'].includes(overrides.method) ? { 'content-type': 'application/json' } : {}), host: 'localhost:3099', origin: 'http://localhost:3099', ...overrides.headers }
  }

  return ctx
}

async function loadServer () {
  vi.resetModules()
  const mod = await import('../index')
  return mod
}

async function runRequest (overrides: Record<string, any>) {
  const { default: server } = await loadServer()
  const { callback } = server(3099)
  const ctx = createCtx(overrides)
  await callback(ctx)
  return ctx
}

describe('server index module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.doUnmock('node-pty')
    mocks.actions.clear()
    mocks.socketEmitter.removeAllListeners()
    mocks.MockKoa.instances.length = 0
    mocks.disableServer = true
    mocks.configGet.mockImplementation((_key: string, defaultValue: any) => defaultValue)
    mocks.configGetAll.mockReturnValue({})
    mocks.convert.mockResolvedValue(Buffer.from('converted'))
    mocks.extensionAbortInstallation.mockResolvedValue('aborted')
    mocks.extensionDisable.mockResolvedValue('disabled')
    mocks.extensionEnable.mockResolvedValue('enabled')
    mocks.extensionInstall.mockResolvedValue('installed')
    mocks.extensionList.mockResolvedValue([])
    mocks.extensionUninstall.mockResolvedValue('uninstalled')
    mocks.fileCheckHash.mockResolvedValue(true)
    mocks.fileCheckWriteable.mockResolvedValue(true)
    mocks.fileCp.mockResolvedValue(undefined)
    mocks.fileCreateReadStream.mockResolvedValue('repo-stream')
    mocks.fileDeleteHistoryVersion.mockResolvedValue('deleted-history')
    mocks.fileExists.mockResolvedValue(false)
    mocks.fileHash.mockResolvedValue('hash')
    mocks.fileHistoryContent.mockResolvedValue('history-content')
    mocks.fileHistoryList.mockResolvedValue(['history'])
    mocks.fileMv.mockResolvedValue(undefined)
    mocks.fileRead.mockResolvedValue(Buffer.from('file-content'))
    mocks.fileRm.mockResolvedValue(undefined)
    mocks.fileStat.mockResolvedValue({ size: 12, mtime: 10, birthtime: 5 })
    mocks.fileTree.mockResolvedValue(['tree'])
    mocks.fileUpload.mockResolvedValue({ path: '/asset.png', hash: 'upload-hash' })
    mocks.fileWatchFile.mockResolvedValue('watch-response')
    mocks.fileWrite.mockResolvedValue('new-hash')
    mocks.fsCreateReadStream.mockReturnValue('fs-stream')
    mocks.fsEnsureFile.mockResolvedValue(undefined)
    mocks.fsExistsSync.mockReturnValue(false)
    mocks.fsRealpathSync.mockImplementation((filePath: string) => filePath)
    mocks.fsReadFile.mockResolvedValue(Buffer.from('disk-content'))
    mocks.fsReaddir.mockResolvedValue([])
    mocks.fsStat.mockResolvedValue({ size: 8 })
    mocks.fsStatSync.mockReturnValue({
      isDirectory: () => false,
      mtime: new Date('2026-05-02T00:00:00Z'),
      size: 9
    })
    mocks.fsUnlink.mockResolvedValue(undefined)
    mocks.fsWriteFile.mockResolvedValue(undefined)
    mocks.handleMCPRequest.mockResolvedValue(undefined)
    mocks.jwtVerify.mockReturnValue({ role: 'admin' })
    mocks.plantuml.mockResolvedValue({ type: 'image/svg+xml', content: '<svg />' })
    mocks.premiumActivate.mockResolvedValue('premium-result')
    mocks.request.mockResolvedValue({
      body: new mocks.PassThrough(),
      headers: { 'content-type': 'text/plain' },
      statusCode: 201
    })
    mocks.runCode.mockResolvedValue('run-result')
    mocks.search.mockResolvedValue(['match'])
  })

  test('registers the expected middleware stack without starting http when disabled', async () => {
    const { default: server } = await loadServer()
    const result = server(3123)

    expect(result.server).toBeUndefined()
    expect(mocks.httpCreateServer).not.toHaveBeenCalled()
    expect(mocks.bodyParser).toHaveBeenCalledWith(expect.objectContaining({
      multipart: true,
      jsonLimit: '50mb',
      formidable: { maxFieldsSize: 268435456 }
    }))
    expect(mocks.MockKoa.instances[0].middlewares).toHaveLength(23)
  })

  test('enforces bearer permissions and allow lists before route handlers', async () => {
    mocks.jwtVerify.mockReturnValueOnce({ role: 'guest' }).mockReturnValueOnce({ role: 'guest' }).mockImplementation(() => {
      throw new Error('bad token')
    })

    const allowedGuest = await runRequest({
      headers: { authorization: 'Bearer guest-token' },
      path: '/api/file',
      query: { repo: 'main', path: '/a.md', exists: 'true' }
    })
    expect(allowedGuest.body).toEqual({ status: 'ok', message: 'success', data: false })

    const deniedGuest = await runRequest({
      headers: { authorization: 'Bearer guest-token' },
      method: 'POST',
      path: '/api/file',
      body: { oldHash: 'h', repo: 'main', path: '/a.md', content: 'x' }
    })
    expect(deniedGuest.status).toBe(403)
    expect(deniedGuest.body).toEqual({ status: 'error', message: 'Forbidden', data: null })

    const invalid = await runRequest({
      headers: { authorization: 'Bearer bad-token' },
      ip: '203.0.113.9',
      path: '/api/file',
      query: { repo: 'main', path: '/a.md' }
    })
    expect(invalid.status).toBe(401)
    expect(invalid.body).toEqual({ status: 'error', message: 'bad token', data: null })
  })

  test.each([
    '/api/file', '/api/tree', '/api/settings', '/api/settings/js', '/api/run',
    '/api/attachment', '/api/plugins', '/api/extensions', '/api/mcp', '/api/future-route'
  ])('rejects untrusted origins before any handler: %s', async (path) => {
    const ctx = await runRequest({ path, headers: { origin: 'https://attacker.example' } })
    expect(ctx.status).toBe(403)
    expect(mocks.configGetAll).not.toHaveBeenCalled()
    expect(mocks.fileRead).not.toHaveBeenCalled()
    expect(mocks.jwtVerify).not.toHaveBeenCalled()
    expect(mocks.handleMCPRequest).not.toHaveBeenCalled()
  })

  test('checks source even for token-bearing requests and rejects DNS rebinding', async () => {
    for (const headers of [
      { origin: 'null' },
      { origin: undefined, 'sec-fetch-site': 'none' },
      { origin: undefined, referer: 'http://localhost:3099/', 'sec-fetch-site': 'cross-site' },
      { host: 'rebound.example:3099', origin: 'http://rebound.example:3099', 'sec-fetch-site': 'same-origin' },
      { origin: 'http://localhost:3100' },
      { origin: 'https://localhost:3099' }
    ]) {
      const ctx = await runRequest({ path: '/api/settings', headers: { ...headers, authorization: 'Bearer admin' } })
      expect(ctx.status).toBe(403)
    }
    expect(mocks.jwtVerify).not.toHaveBeenCalled()
  })

  test('preserves same-origin bootstrap GET and trusted Electron protocol requests', async () => {
    for (const headers of [
      { origin: undefined, 'sec-fetch-site': 'same-origin' },
      { origin: undefined, referer: 'http://localhost:3099/' }
    ]) {
      expect((await runRequest({ path: '/api/settings/js', headers })).status).toBe(200)
    }
    expect((await runRequest({ path: '/api/settings', req: { _protocol: true }, headers: { origin: undefined } })).status).toBe(200)
    expect((await runRequest({ path: '/api/settings', req: { _protocol: true }, headers: { origin: 'null' } })).status).toBe(403)
  })

  test('preserves root navigation and native MCP while rejecting rebinding', async () => {
    mocks.fsExistsSync.mockReturnValueOnce(true)
    const home = await runRequest({ path: '/', headers: { origin: undefined, 'sec-fetch-site': 'none', 'sec-fetch-dest': 'document' } })
    expect(home.status).not.toBe(403)
    expect((await runRequest({ path: '/', headers: { host: 'evil.example:3099', origin: undefined } })).status).toBe(403)
    const native = await runRequest({ path: '/api/mcp/message', method: 'POST', headers: { origin: undefined, 'sec-fetch-mode': 'cors' }, body: { jsonrpc: '2.0', method: 'initialize', id: 1 } })
    expect(native.status).toBe(200)
    expect(native.req.jwt).toEqual({ role: 'admin' })
    expect(mocks.handleMCPRequest).toHaveBeenCalled()
    mocks.handleMCPRequest.mockClear()
    mocks.jwtVerify.mockReturnValue({ role: 'guest' })
    const guest = await runRequest({ path: '/api/mcp/message', method: 'POST', ip: '203.0.113.8', headers: { origin: undefined, authorization: 'Bearer guest' } })
    expect(guest.body.status).toBe('error')
    expect(mocks.handleMCPRequest).not.toHaveBeenCalled()
  })

  test('guards the actual executable embed file including static and encoded aliases', async () => {
    mocks.fsExistsSync.mockReturnValue(true)
    mocks.fsStatSync.mockImplementation((filePath: string) => ({ isDirectory: () => filePath.toLowerCase() === '/static/embed', mtime: new Date(), size: 9 }))
    for (const path of ['/embed/', '/embed/index.html', '/static/embed/', '/static/embed/index.html', '/%65mbed/index.html', '/static/./embed/index.html', '/EMBED/index.html', '/embed/INDEX.HTML', '/EMBED/']) {
      for (const headers of [
        { origin: undefined },
        { origin: undefined, 'sec-fetch-site': 'cross-site', 'sec-fetch-dest': 'document' },
        { origin: undefined, 'sec-fetch-site': 'none', 'sec-fetch-dest': 'document' }
      ]) {
        mocks.fsReadFile.mockClear()
        expect((await runRequest({ path, headers })).status).toBe(403)
        expect(mocks.fsReadFile).not.toHaveBeenCalled()
      }
      expect((await runRequest({ path })).status).toBe(200)
      expect((await runRequest({ path, headers: { origin: undefined }, req: { _protocol: true } })).status).toBe(200)
    }
  })

  test('guards executable embed filesystem identity aliases', async () => {
    mocks.fsExistsSync.mockReturnValue(true)
    mocks.fsStatSync.mockReturnValue({ isDirectory: () => false, mtime: new Date(), size: 9, dev: 1, ino: 42 })
    for (const path of ['/embed/index.html.', '/embed/index.html::$DATA', '/embed/INDEX~1.HTM', '/alias.html']) {
      expect((await runRequest({ path, headers: { origin: undefined } })).status).toBe(403)
    }
    expect(mocks.fsReadFile).not.toHaveBeenCalled()
  })

  test('preserves distinct static files and fails closed if embed aliases cannot be classified', async () => {
    mocks.fsExistsSync.mockReturnValue(true)
    mocks.fsStatSync.mockImplementation((filePath: string) => ({ isDirectory: () => false, mtime: new Date(), size: 9, dev: 1, ino: filePath === '/static/embed/index.html' ? 42 : 43 }))
    expect((await runRequest({ path: '/index.html', headers: { origin: undefined } })).status).toBe(200)
    mocks.fsRealpathSync.mockImplementation((filePath: string) => filePath === '/static/alias.html' ? '/static/embed/index.html' : filePath)
    expect((await runRequest({ path: '/alias.html', headers: { origin: undefined } })).status).toBe(403)
    mocks.fsStatSync.mockReturnValue({ isDirectory: () => false, mtime: new Date(), size: 9, dev: 0, ino: 0 })
    mocks.fsRealpathSync.mockImplementation((filePath: string) => filePath === '/static/alias.html' ? '/static/embed/index.html' : filePath)
    expect((await runRequest({ path: '/alias.html', headers: { origin: undefined } })).status).toBe(403)
    expect((await runRequest({ path: '/index.html', headers: { origin: undefined } })).status).toBe(200)
    mocks.fsRealpathSync.mockImplementation(() => { throw new Error('Unavailable') })
    expect((await runRequest({ path: '/alias.html', headers: { origin: undefined } })).status).toBe(403)
  })

  test.each(['application/x-www-form-urlencoded', 'multipart/form-data; boundary=test', 'text/plain'])('rejects non-JSON %s before API handlers', async contentType => {
    const ctx = await runRequest({ path: '/api/run', method: 'POST', headers: { 'content-type': contentType }, body: { cmd: 'dummy', code: 'dummy' } })
    expect(ctx.status).toBe(415)
    expect(mocks.runCode).not.toHaveBeenCalled()
  })

  test.each(['application/x-www-form-urlencoded', 'multipart/form-data; boundary=test', 'text/plain', 'application/json'])('rejects hostile POST %s before parser and any effects', async contentType => {
    const { default: server } = await loadServer()
    const { callback } = server(3099)
    const ctx = createCtx({ path: '/api/run', method: 'POST', headers: { origin: 'https://evil.example', 'content-type': contentType } })
    const parser = vi.fn()
    mocks.MockKoa.instances[0].middlewares[4] = parser
    await callback(ctx)
    expect(ctx.status).toBe(403)
    expect(parser).not.toHaveBeenCalled()
    expect(mocks.runCode).not.toHaveBeenCalled()
  })

  test.skipIf(!process.env.YN_TEST_CHROMIUM)('real Chromium rejects external executable embeds and preserves same-origin frames/windows', async () => {
    const { createServer } = await vi.importActual<typeof import('http')>('http')
    const { readFileSync } = await vi.importActual<typeof import('fs')>('fs')
    const { createRequire } = await import('module')
    const require = createRequire(import.meta.url)
    const { chromium } = require(process.env.YN_PLAYWRIGHT_MODULE || 'playwright')
    const embed = readFileSync('src/renderer/embed/index.html', 'utf8')
    let boundary: Function
    let bodyGuard: Function
    let serveStatic: Function
    let effects = 0
    const backend = createServer(async (req, res) => {
      const url = new URL(req.url!, 'http://' + req.headers.host)
      const ctx = createCtx({ path: url.pathname, method: req.method, headers: { origin: undefined, 'content-type': undefined, ...req.headers } })
      await boundary(ctx, () => bodyGuard(ctx, async () => {
        if (url.pathname === '/api/dummy') {
          effects++
          ctx.body = 'dummy only'
        } else {
          await serveStatic(ctx, async () => {})
        }
      }))
      res.writeHead(ctx.status, { 'Content-Type': ctx.path.startsWith('/api/') ? 'text/plain' : 'text/html' })
      res.end(typeof ctx.body === 'string' || Buffer.isBuffer(ctx.body) ? ctx.body : JSON.stringify(ctx.body))
    })
    await new Promise<void>(resolve => backend.listen(0, '127.0.0.1', resolve))
    const port = (backend.address() as import('net').AddressInfo).port
    const { default: server } = await loadServer()
    server(port)
    const middlewares = mocks.MockKoa.instances[mocks.MockKoa.instances.length - 1].middlewares
    boundary = middlewares[0]
    bodyGuard = middlewares[2]
    serveStatic = middlewares[middlewares.length - 1]
    mocks.fsExistsSync.mockReturnValue(true)
    mocks.fsStatSync.mockImplementation((filePath: string) => ({ isDirectory: () => ['/static', '/static/embed'].includes(filePath), mtime: new Date(), size: 9 }))
    mocks.fsReadFile.mockImplementation((filePath: string) => Buffer.from(filePath === '/static/embed/index.html' ? embed : '<!doctype html><title>Safe entry</title>'))
    const origin = `http://127.0.0.1:${port}`
    const payload = '<script>fetch("/api/dummy", {method:"POST", headers:{"content-type":"application/json"}, body:"{}"})</script>'
    const embedUrls = ['/embed/?html=' + encodeURIComponent(payload), '/embed/index.html#html=' + encodeURIComponent(payload)]
    const attacker = createServer((_req, res) => res.end('<a id="attack" href="' + origin + embedUrls[0] + '">Open</a>'))
    await new Promise<void>(resolve => attacker.listen(0, '127.0.0.1', resolve))
    const attackerOrigin = `http://127.0.0.1:${(attacker.address() as import('net').AddressInfo).port}`
    let browser: any
    try {
      browser = await chromium.launch({ executablePath: process.env.YN_TEST_CHROMIUM, headless: true, args: ['--no-sandbox'] })
      const page = await browser.newPage()
      for (const url of embedUrls) {
        expect((await page.goto(origin + url)).status()).toBe(403)
      }
      await page.goto(attackerOrigin)
      await Promise.all([page.waitForNavigation(), page.click('#attack')])
      expect(await page.textContent('body')).toContain('Forbidden request origin')
      expect(effects).toBe(0)
      await page.goto(origin)
      const frameRequest = page.waitForResponse((response: any) => response.url() === origin + '/api/dummy')
      await page.evaluate((url: string) => {
        const frame = document.createElement('iframe')
        frame.src = url
        document.body.appendChild(frame)
      }, embedUrls[0])
      expect((await frameRequest).status()).toBe(200)
      const popupPromise = page.waitForEvent('popup')
      await page.evaluate((url: string) => window.open(url), embedUrls[1])
      const popup = await popupPromise
      await popup.waitForLoadState()
      await expect.poll(() => effects).toBe(2)
      expect(await popup.textContent('body')).not.toContain('Forbidden request origin')
      // Node's native fetch adds Sec-Fetch-Mode: cors but no browser source.
      const native = await fetch(origin + '/api/dummy')
      expect(native.status).toBe(200)
      expect(effects).toBe(3)
    } finally {
      await browser?.close()
      await Promise.all([new Promise<void>(resolve => backend.close(() => resolve())), new Promise<void>(resolve => attacker.close(() => resolve()))])
    }
  }, 30000)

  test('redacts only the signing key from both admin settings formats without changing the cache', async () => {
    const saved = Object.freeze({
      'server.jwt-secret': 'signing-secret', 'other-secret': 'preserved', 'api-token': 'preserved',
      repositories: { main: '/repo' }, license: 'license', extensions: ['one'], theme: 'plain.css'
    })
    mocks.configGetAll.mockReturnValue(saved)
    const expected = { ...saved }
    delete expected['server.jwt-secret']
    const json = await runRequest({ path: '/api/settings' })
    const js = await runRequest({ path: '/api/settings/js' })
    expect(json.body.data).toEqual(expected)
    expect(js.body).toBe('_INIT_SETTINGS = ' + JSON.stringify(expected))
    expect(saved['server.jwt-secret']).toBe('signing-secret')
    await runRequest({ path: '/api/settings', method: 'POST', body: { theme: 'changed.css' } })
    expect(mocks.configSetAll).toHaveBeenCalledWith({ ...saved, theme: 'changed.css' })
  })

  test('handles file read, write, delete, rename, copy, history, tree, and watch routes', async () => {
    mocks.fileStat.mockResolvedValue({ size: 6, mtime: 2, birthtime: 1 })
    mocks.fileRead.mockResolvedValue(Buffer.from('hello'))
    mocks.fileHash.mockResolvedValue('read-hash')
    mocks.fileCheckWriteable.mockResolvedValue(true)

    await expect(runRequest({
      path: '/api/file',
      query: { repo: 'main', path: '/a.md', asBase64: 'true' }
    })).resolves.toMatchObject({
      body: {
        status: 'ok',
        data: {
          content: Buffer.from('hello').toString('base64'),
          hash: 'read-hash',
          stat: { size: 6, mtime: 2, birthtime: 1 },
          writeable: true
        }
      }
    })

    mocks.fileWrite.mockResolvedValue('write-hash')
    const write = await runRequest({
      method: 'POST',
      path: '/api/file',
      body: {
        asBase64: true,
        content: 'data:text/plain;base64,aGk=',
        oldHash: 'new',
        path: '/new.md',
        repo: 'main'
      }
    })
    expect(mocks.fileWrite).toHaveBeenCalledWith('main', '/new.md', Buffer.from('hi'))
    expect(write.body).toEqual({
      status: 'ok',
      message: 'success',
      data: { hash: 'write-hash', stat: { size: 6, mtime: 2, birthtime: 1 } }
    })

    await runRequest({ method: 'DELETE', path: '/api/file', query: { repo: 'main', path: '/a.md', trash: 'false' } })
    expect(mocks.fileRm).toHaveBeenCalledWith('main', '/a.md', false)

    await runRequest({ method: 'PATCH', path: '/api/file', body: { repo: 'main', oldPath: '/a.md', newPath: '/b.md' } })
    expect(mocks.fileMv).toHaveBeenCalledWith('main', '/a.md', '/b.md')

    await runRequest({ method: 'PUT', path: '/api/file', body: { repo: 'main', oldPath: '/a.md', newPath: '/c.md' } })
    expect(mocks.fileCp).toHaveBeenCalledWith('main', '/a.md', '/c.md')

    await runRequest({ path: '/api/tree', query: { repo: 'main', sort: 'mtime-desc', include: '\\.md$', noEmptyDir: 'true' } })
    expect(mocks.fileTree).toHaveBeenCalledWith('main', { by: 'mtime', order: 'desc' }, '\\.md$', true)

    await runRequest({ path: '/api/history/list', query: { repo: 'main', path: '/a.md' } })
    await runRequest({ path: '/api/history/content', query: { repo: 'main', path: '/a.md', version: 'v1' } })
    await runRequest({ method: 'POST', path: '/api/history/delete', body: { repo: 'main', path: '/a.md', version: 'v1' } })
    await runRequest({ method: 'POST', path: '/api/history/comment', body: { repo: 'main', path: '/a.md', version: 'v1', msg: 'keep' } })
    await runRequest({ method: 'POST', path: '/api/watch-file', body: { repo: 'main', path: '/a.md', options: { recursive: false } } })

    expect(mocks.fileHistoryList).toHaveBeenCalledWith('main', '/a.md')
    expect(mocks.fileHistoryContent).toHaveBeenCalledWith('main', '/a.md', 'v1')
    expect(mocks.fileDeleteHistoryVersion).toHaveBeenCalledWith('main', '/a.md', 'v1')
    expect(mocks.fileCommentHistoryVersion).toHaveBeenCalledWith('main', '/a.md', 'v1', 'keep')
    expect(mocks.fileWatchFile).toHaveBeenCalledWith('main', '/a.md', { recursive: false })
  })

  test('wraps file route validation and conflict errors', async () => {
    mocks.fileStat.mockResolvedValueOnce({ size: 31 * 1024 * 1024 })
    await expect(runRequest({ path: '/api/file', query: { repo: 'main', path: '/large.md' } })).resolves.toMatchObject({
      body: { status: 'error', message: 'File is too large.', data: null }
    })

    await expect(runRequest({ method: 'POST', path: '/api/file', body: { repo: 'main', path: '/a.md' } })).resolves.toMatchObject({
      body: { status: 'error', message: 'No hash.', data: null }
    })

    mocks.fileExists.mockResolvedValueOnce(true)
    await expect(runRequest({ method: 'POST', path: '/api/file', body: { oldHash: 'new', repo: 'main', path: '/a.md' } })).resolves.toMatchObject({
      body: { status: 'error', message: 'File or directory already exists.', data: null }
    })

    mocks.fileCheckHash.mockResolvedValueOnce(false)
    await expect(runRequest({ method: 'POST', path: '/api/file', body: { oldHash: 'old', repo: 'main', path: '/a.md' } })).resolves.toMatchObject({
      body: { status: 'error', message: 'File is stale. Please refresh.', data: null }
    })

    await expect(runRequest({ method: 'PATCH', path: '/api/file', body: { repo: 'main', oldPath: '/a.md', newPath: '/a.md' } })).resolves.toMatchObject({
      body: { status: 'error', message: 'No change.', data: null }
    })

    mocks.fileExists.mockResolvedValueOnce(true)
    await expect(runRequest({ method: 'PATCH', path: '/api/file', body: { repo: 'main', oldPath: '/a.md', newPath: '/b.md' } })).resolves.toMatchObject({
      body: { status: 'error', message: 'File or directory already exists.', data: null }
    })
  })

  test('serves and uploads attachments including ranges, URL paths, and absolute image fallback', async () => {
    const post = await runRequest({
      method: 'POST',
      path: '/api/attachment',
      body: {
        attachment: 'data:image/png;base64,aW1n',
        exists: 'rename',
        path: '/img.png',
        repo: 'main'
      }
    })
    expect(mocks.fileUpload).toHaveBeenCalledWith('main', Buffer.from('img'), '/img.png', 'rename')
    expect(post.body).toEqual({ status: 'ok', message: 'success', data: { path: '/asset.png', hash: 'upload-hash' } })

    const range = await runRequest({
      headers: { range: 'bytes=2-4' },
      path: '/api/attachment/main/video.mp4'
    })
    expect(mocks.fileCreateReadStream).toHaveBeenCalledWith('main', '/video.mp4', { start: 2, end: 4 })
    expect(range.status).toBe(206)
    expect(range.body).toBe('repo-stream')
    expect(range.responseHeaders).toMatchObject({
      'Accept-Ranges': 'bytes',
      'Content-Length': 3,
      'Content-Range': 'bytes 2-4/12'
    })

    const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' })
    mocks.fileRead.mockRejectedValueOnce(enoent)
    const fallback = await runRequest({
      path: '/api/attachment',
      query: { repo: 'main', path: '/absolute/photo.png' }
    })
    expect(mocks.fsReadFile).toHaveBeenCalledWith('/absolute/photo.png')
    expect(fallback.body).toEqual(Buffer.from('disk-content'))

    mocks.fileRead.mockRejectedValueOnce(enoent)
    mocks.fsReadFile.mockRejectedValueOnce(enoent)
    await expect(runRequest({ path: '/api/attachment', query: { repo: 'main', path: '/absolute/photo.png' } })).resolves.toMatchObject({
      status: 404,
      body: { status: 'error', message: 'Not found', data: null }
    })
  })

  test('dispatches simple content routes for search, plantuml, run, convert, help, plugins, and premium', async () => {
    await expect(runRequest({ method: 'POST', path: '/api/search', body: { query: 'needle' } })).resolves.toMatchObject({ body: ['match'] })
    expect(mocks.search).toHaveBeenCalledWith('needle')

    const plantuml = await runRequest({ path: '/api/plantuml', query: { data: 'diagram' } })
    expect(plantuml.type).toBe('image/svg+xml')
    expect(plantuml.body).toBe('<svg />')
    expect(plantuml.responseHeaders['cache-control']).toBe('max-age=86400')

    mocks.plantuml.mockRejectedValueOnce(new Error('bad diagram'))
    await expect(runRequest({ path: '/api/plantuml', query: { data: 'bad' } })).resolves.toMatchObject({
      body: new Error('bad diagram')
    })

    await expect(runRequest({ method: 'POST', path: '/api/run', body: { cmd: 'node', code: '1' } })).resolves.toMatchObject({ body: 'run-result' })

    const converted = await runRequest({ method: 'POST', path: '/api/convert/doc', body: { source: 's', fromType: 'md', toType: 'html', resourcePath: '/r' } })
    expect(converted.responseHeaders['content-type']).toBe('application/octet-stream')
    expect(converted.body).toEqual(Buffer.from('converted'))

    await runRequest({ path: '/api/help', query: { doc: '../README.md' } })
    expect(mocks.fsReadFile).toHaveBeenCalledWith('/help/README.md', 'utf-8')

    mocks.fsReaddir.mockResolvedValueOnce([
      { isFile: () => true, name: 'a.js' },
      { isFile: () => true, name: 'b.txt' }
    ])
    mocks.fsReadFile.mockResolvedValueOnce(Buffer.from('console.log(1)'))
    const plugins = await runRequest({ path: '/api/plugins' })
    expect(plugins.type).toBe('application/javascript; charset=utf-8')
    expect(plugins.body).toContain('a.js')
    expect(plugins.body).toContain('console.log(1)')

    await expect(runRequest({ method: 'POST', path: '/api/premium', body: { method: 'activate', payload: { code: 'x' } } })).resolves.toMatchObject({
      body: { status: 'ok', message: 'success', data: 'premium-result' }
    })
  })

  test('handles tmp files, user files, and recursive user directories', async () => {
    await runRequest({ method: 'POST', path: '/api/tmp-file', query: { name: 'a/b.txt', asBase64: 'true' }, body: Buffer.from('aGk=') })
    expect(mocks.fsWriteFile).toHaveBeenCalledWith(expect.stringContaining('/yank-note-a_b.txt'), Buffer.from('hi'))

    await runRequest({ path: '/api/tmp-file', query: { name: 'a/b.txt' } })
    expect(mocks.fsReadFile).toHaveBeenCalledWith(expect.stringContaining('/yank-note-a_b.txt'))

    await runRequest({ method: 'DELETE', path: '/api/tmp-file', query: { name: 'a/b.txt' } })
    expect(mocks.fsUnlink).toHaveBeenCalledWith(expect.stringContaining('/yank-note-a_b.txt'))

    await runRequest({ method: 'POST', path: '/api/user-file', query: { name: '../safe.txt' }, body: Buffer.from('content') })
    expect(mocks.fsEnsureFile).toHaveBeenCalledWith('/user-data/safe.txt')
    expect(mocks.fsWriteFile).toHaveBeenCalledWith('/user-data/safe.txt', 'content')

    await runRequest({ method: 'DELETE', path: '/api/user-file', query: { name: 'safe.txt' } })
    expect(mocks.fsUnlink).toHaveBeenCalledWith('/user-data/safe.txt')

    mocks.fsReaddir.mockImplementation(async (dir: string) => {
      if (dir === '/user-data/root') {
        return [
          { isFile: () => true, isDirectory: () => false, name: 'a.md' },
          { isFile: () => false, isDirectory: () => true, name: 'docs' }
        ]
      }
      return [{ isFile: () => true, isDirectory: () => false, name: 'b.md' }]
    })

    const dir = await runRequest({ path: '/api/user-dir', query: { name: 'root', recursive: 'true' } })
    expect(dir.body).toEqual({
      status: 'ok',
      message: 'success',
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'a.md', path: 'a.md', isFile: true, isDir: false }),
        expect.objectContaining({ name: 'docs', path: 'docs', isFile: false, isDir: true }),
        expect.objectContaining({ name: 'b.md', path: 'docs/b.md', isFile: true, isDir: false })
      ])
    })
  })

  test('sanitizes settings for guests and triggers reload actions for admin updates', async () => {
    mocks.jwtVerify.mockReturnValueOnce({ role: 'guest' }).mockReturnValueOnce({ role: 'admin' })
    mocks.configGetAll.mockReturnValueOnce({
      'api-token': 'secret',
      extensions: ['x'],
      license: 'license',
      mark: ['x'],
      repositories: { main: '/repo' },
      theme: 'github.css'
    }).mockReturnValueOnce({
      language: 'en',
      nested: { old: true },
      'updater.source': 'github'
    })

    const guest = await runRequest({ headers: { authorization: 'Bearer guest' }, path: '/api/settings' })
    expect(guest.body).toEqual({
      status: 'ok',
      message: 'success',
      data: {
        mark: [],
        repositories: {},
        theme: 'github.css'
      }
    })

    await runRequest({
      headers: { authorization: 'Bearer admin' },
      method: 'POST',
      path: '/api/settings',
      body: { language: 'zh-CN', nested: { old: false }, 'updater.source': 'mirror' }
    })

    expect(mocks.configSetAll).toHaveBeenCalledWith({
      language: 'zh-CN',
      nested: { old: false },
      'updater.source': 'mirror'
    })
    expect(mocks.actions.get('i18n.change-language')).toHaveBeenCalledWith('zh-CN')
    expect(mocks.actions.get('updater.change-source')).toHaveBeenCalledWith('mirror')
    expect(mocks.actions.get('proxy.reload')).toHaveBeenCalled()
    expect(mocks.actions.get('envs.reload')).toHaveBeenCalled()
    expect(mocks.actions.get('shortcuts.reload')).toHaveBeenCalledWith(['language', 'nested', 'updater.source'])
  })

  test('serves css, extension APIs, mcp, choose, rpc, proxy, and static files', async () => {
    mocks.fsReaddir.mockResolvedValueOnce([
      { isFile: () => true, name: 'custom.css' },
      { isFile: () => true, name: 'note.txt' }
    ])
    await expect(runRequest({ path: '/api/custom-styles' })).resolves.toMatchObject({
      body: { status: 'ok', data: ['github.css', 'plain.css', 'custom.css'] }
    })

    mocks.configGet.mockImplementation((key: string, defaultValue: any) => key.startsWith('custom-css') ? 'extension:foo/theme.css' : defaultValue)
    mocks.extensionList.mockResolvedValueOnce([{ enabled: true, id: 'id:foo' }])
    const cssRedirect = await runRequest({ path: '/custom-css' })
    expect(cssRedirect.redirect).toHaveBeenCalledWith('/extensions/foo/theme.css')

    await runRequest({ path: '/api/extensions' })
    await runRequest({ method: 'POST', path: '/api/extensions/install', query: { id: 'x', url: 'https://e.test/x.zip' } })
    await runRequest({ method: 'POST', path: '/api/extensions/uninstall', query: { id: 'x' } })
    await runRequest({ method: 'POST', path: '/api/extensions/enable', query: { id: 'x' } })
    await runRequest({ method: 'POST', path: '/api/extensions/disable', query: { id: 'x' } })
    await runRequest({ method: 'DELETE', path: '/api/extensions/abort-installation' })
    expect(mocks.extensionInstall).toHaveBeenCalledWith('x', 'https://e.test/x.zip')
    expect(mocks.extensionUninstall).toHaveBeenCalledWith('x')
    expect(mocks.extensionEnable).toHaveBeenCalledWith('x')
    expect(mocks.extensionDisable).toHaveBeenCalledWith('x')
    expect(mocks.extensionAbortInstallation).toHaveBeenCalled()

    const mcp = await runRequest({ method: 'POST', path: '/api/mcp/message', body: { jsonrpc: '2.0' } })
    expect(mocks.handleMCPRequest).toHaveBeenCalledWith(mcp.req, mcp.res, { jsonrpc: '2.0' })
    expect(mcp.respond).toBe(false)

    const choose = await runRequest({ method: 'POST', path: '/api/choose', query: { from: 'browser' }, body: { properties: ['openFile'] } })
    expect(mocks.actions.get('show-main-window')).toHaveBeenCalled()
    expect(mocks.actions.get('show-open-dialog')).toHaveBeenCalledWith({ properties: ['openFile'] })
    expect(mocks.actions.get('hide-main-window')).toHaveBeenCalled()
    expect(choose.body.status).toBe('ok')

    const rpc = await runRequest({ method: 'POST', path: '/api/rpc', body: { code: 'return require("node:path").basename("/a/b.md")' } })
    expect(rpc.body).toEqual({ status: 'ok', message: 'success', data: 'b.md' })

    const responseBody = new mocks.PassThrough()
    mocks.request.mockResolvedValueOnce({ body: responseBody, headers: { 'x-upstream': 'yes' }, statusCode: 202 })
    const proxy = await runRequest({
      headers: { host: 'localhost:3099', 'x-proxy-timeout': '1000', 'x-proxy-max-redirections': '1', accept: 'text/plain' },
      method: 'POST',
      originalUrl: '/api/proxy-fetch/https://example.test/data',
      path: '/api/proxy-fetch/https://example.test/data',
      req: new mocks.PassThrough()
    })
    expect(mocks.request).toHaveBeenCalledWith('https://example.test/data', expect.objectContaining({
      headers: { accept: 'text/plain', origin: 'http://localhost:3099', 'content-type': 'application/json' },
      maxRedirections: 1,
      method: 'POST'
    }))
    expect(proxy.status).toBe(202)
    expect(proxy.responseHeaders['x-upstream']).toBe('yes')
    responseBody.emit('close')

    mocks.fsExistsSync.mockReturnValueOnce(true)
    const staticFile = await runRequest({ path: '/static/app.js' })
    expect(staticFile.body).toEqual(Buffer.from('disk-content'))
    expect(staticFile.responseHeaders).toMatchObject({
      'Cache-Control': 'max-age=0',
      'Content-Length': 9,
      'X-XSS-Protection': '0'
    })
    expect(staticFile.type).toBe('.js')
  })

  test('does not kill pty objects that are not tracked by the server', async () => {
    const { killPtyProcesses } = await loadServer()
    const ptyProcess = {
      kill: vi.fn(),
      onExit: vi.fn()
    }

    await killPtyProcesses(ptyProcess as any)
    await killPtyProcesses()

    expect(ptyProcess.kill).not.toHaveBeenCalled()
  })

  test('wraps attachment, private repo, custom css, and proxy error boundaries', async () => {
    await expect(runRequest({ path: '/api/attachment' })).resolves.toMatchObject({
      body: { status: 'error', message: 'Invalid path.', data: null }
    })

    mocks.jwtVerify.mockReturnValueOnce({ role: 'guest' })
    await expect(runRequest({
      headers: { authorization: 'Bearer guest' },
      path: '/api/file',
      query: { repo: '__private', path: '/a.md', exists: 'true' }
    })).resolves.toMatchObject({
      body: { status: 'error', message: 'Forbidden', data: null }
    })

    mocks.configGet.mockImplementation((key: string, defaultValue: any) => key.startsWith('custom-css') ? 'missing.css' : defaultValue)
    mocks.fsReadFile
      .mockRejectedValueOnce(new Error('missing custom css'))
      .mockResolvedValueOnce(Buffer.from('default css'))
      .mockResolvedValueOnce(Buffer.from('restored css'))
    const css = await runRequest({ path: '/custom-css' })
    expect(mocks.fsWriteFile).toHaveBeenCalledWith('/themes/github.css', Buffer.from('default css'))
    expect(mocks.configSet).toHaveBeenCalledWith('custom-css', 'github.css')
    expect(css.body).toEqual(Buffer.from('restored css'))

    const upstreamError = new Error('upstream failed')
    mocks.request.mockRejectedValueOnce(upstreamError)
    await expect(runRequest({
      originalUrl: '/api/proxy-fetch/https://example.test/fail',
      path: '/api/proxy-fetch/https://example.test/fail'
    })).resolves.toMatchObject({
      status: 500,
      body: { status: 'error', message: 'upstream failed', data: null }
    })
  })

  test('covers attachment fallback edge cases and filesystem ranges', async () => {
    const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' })

    mocks.fileStat.mockRejectedValueOnce(enoent)
    const fallbackRange = await runRequest({
      headers: { range: 'bytes=3-' },
      path: '/api/attachment',
      query: { repo: 'main', path: '/absolute/photo.png' }
    })
    expect(mocks.fsStat).toHaveBeenCalledWith('/absolute/photo.png')
    expect(mocks.fsCreateReadStream).toHaveBeenCalledWith('/absolute/photo.png', { start: 3, end: 7 })
    expect(fallbackRange.status).toBe(206)
    expect(fallbackRange.body).toBe('fs-stream')
    expect(fallbackRange.responseHeaders).toMatchObject({
      'Content-Length': 5,
      'Content-Range': 'bytes 3-7/8'
    })

    mocks.fileRead.mockRejectedValueOnce(enoent)
    await expect(runRequest({
      path: '/api/attachment',
      query: { repo: 'main', path: '/absolute/readme.txt' }
    })).resolves.toMatchObject({
      status: 404,
      body: { status: 'error', message: 'Not found', data: null }
    })

    mocks.fileRead.mockRejectedValueOnce(enoent)
    mocks.fsReadFile.mockRejectedValueOnce(Object.assign(new Error('no access'), { code: 'EACCES' }))
    await expect(runRequest({
      path: '/api/attachment',
      query: { repo: 'main', path: '/absolute/photo.png' }
    })).resolves.toMatchObject({
      body: { status: 'error', message: 'no access', data: null }
    })
  })

  test('serves help assets, settings bootstrap js, extension files, and proxy dispatchers', async () => {
    const helpAsset = await runRequest({ path: '/api/help', query: { path: '../guide.png' } })
    expect(helpAsset.type).toBe('image/png')
    expect(mocks.fsReadFile).toHaveBeenCalledWith('/help/guide.png')

    mocks.configGetAll.mockReturnValueOnce({ theme: 'plain.css', 'api-token': 'secret' })
    const settingsJs = await runRequest({ path: '/api/settings/js' })
    expect(settingsJs.type).toBe('application/javascript; charset=utf-8')
    expect(settingsJs.body).toBe('_INIT_SETTINGS = {"theme":"plain.css","api-token":"secret"}')
    expect(settingsJs.responseHeaders).toMatchObject({
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache'
    })

    mocks.fsExistsSync.mockReturnValueOnce(true)
    const extensionFile = await runRequest({ path: '/extensions/foo/main.js' })
    expect(mocks.fsReadFile).toHaveBeenCalledWith('/extensions/foo/main.js')
    expect(extensionFile.type).toBe('.js')
    expect(extensionFile.responseHeaders['Cache-Control']).toBe('no-store, no-cache, must-revalidate')

    const responseBody = new mocks.PassThrough()
    mocks.request.mockResolvedValueOnce({ body: responseBody, headers: {}, statusCode: 204 })
    await runRequest({
      headers: { 'x-proxy-url': 'http://proxy.test', host: 'localhost:3099' },
      originalUrl: '/api/proxy-fetch/https://example.test/proxied',
      path: '/api/proxy-fetch/https://example.test/proxied'
    })
    expect(mocks.actions.get('new-proxy-dispatcher')).toHaveBeenCalledWith('http://proxy.test')
    expect(mocks.request).toHaveBeenCalledWith('https://example.test/proxied', expect.objectContaining({
      maxRedirections: 3
    }))
    responseBody.emit('close')
  })

  test('falls back through static, theme, directory index, and missing files', async () => {
    mocks.fsExistsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    const themeFallback = await runRequest({ path: '/custom.css' })
    expect(mocks.fsReadFile).toHaveBeenCalledWith('/themes/custom.css')
    expect(themeFallback.body).toEqual(Buffer.from('disk-content'))

    mocks.fsExistsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
    mocks.fsStatSync
      .mockReturnValueOnce({ isDirectory: () => true, mtime: new Date('2026-05-02T00:00:00Z'), size: 0 })
      .mockReturnValueOnce({ isDirectory: () => false, mtime: new Date('2026-05-02T00:00:00Z'), size: 9 })
    const directoryIndex = await runRequest({ path: '/docs' })
    expect(mocks.fsReadFile).toHaveBeenCalledWith('/static/docs/index.html')
    expect(directoryIndex.type).toBe('.html')
  })

  test('starts websocket server and handles localhost and non-localhost socket branches', async () => {
    const Module = (await import('node:module')).default as any
    const originalLoad = Module._load
    const loadSpy = vi.spyOn(Module, '_load').mockImplementation((request: string, parent: any, isMain: boolean) => {
      if (request === 'http') {
        return { createServer: mocks.httpCreateServer }
      }
      if (request === 'socket.io') {
        return mocks.socketIo
      }
      if (request === 'node-pty') {
        throw new Error('node-pty unavailable')
      }
      return originalLoad.call(Module, request, parent, isMain)
    })
    mocks.disableServer = false

    try {
      const { default: server } = await loadServer()
      const started = server(3999)
      expect(started.server).toBe(mocks.httpServer)
      expect(mocks.socketIo).toHaveBeenCalledWith(mocks.httpServer, expect.objectContaining({ path: '/ws', allowRequest: expect.any(Function) }))
      expect(mocks.httpServer.listen).toHaveBeenCalledWith(3999, '127.0.0.1')

      const remoteSocket = {
        client: { conn: { remoteAddress: '203.0.113.10' } },
        disconnect: vi.fn(),
        emit: vi.fn(),
        handshake: { headers: { host: 'localhost:3999', origin: 'http://localhost:3999' }, query: {} },
        on: vi.fn()
      }
      mocks.socketEmitter.emit('connection', remoteSocket)
      expect(remoteSocket.disconnect).toHaveBeenCalled()

      const localSocket = {
        client: { conn: { remoteAddress: '127.0.0.1' } },
        disconnect: vi.fn(),
        emit: vi.fn(),
        handshake: { headers: { host: 'localhost:3999', origin: 'http://localhost:3999' }, query: {} },
        on: vi.fn()
      }
      mocks.socketEmitter.emit('connection', localSocket)
      expect(localSocket.emit).toHaveBeenCalledWith(
        'output',
        expect.stringContaining('node-pty is not compatible')
      )
    } finally {
      loadSpy.mockRestore()
    }
  })

  test('handles websocket pty lifecycle, input, resize, and process cleanup', async () => {
    const Module = (await import('node:module')).default as any
    const originalLoad = Module._load
    const ptyExitHandlers: Function[] = []
    let dataHandler: Function | undefined
    const ptyProcess = {
      kill: vi.fn(),
      onData: vi.fn((handler: Function) => {
        dataHandler = handler
      }),
      onExit: vi.fn((handler: Function) => {
        ptyExitHandlers.push(handler)
      }),
      resize: vi.fn(),
      write: vi.fn(),
    }
    const pty = {
      spawn: vi.fn(() => ptyProcess),
    }
    const processOn = vi.spyOn(process, 'on')
    const processOff = vi.spyOn(process, 'off')
    const loadSpy = vi.spyOn(Module, '_load').mockImplementation((request: string, parent: any, isMain: boolean) => {
      if (request === 'http') {
        return { createServer: mocks.httpCreateServer }
      }
      if (request === 'socket.io') {
        return mocks.socketIo
      }
      if (request === 'node-pty') {
        return pty
      }
      return originalLoad.call(Module, request, parent, isMain)
    })
    mocks.disableServer = false

    try {
      const { default: server } = await loadServer()
      server(3999)

      const socketHandlers: Record<string, Function> = {}
      const localSocket = {
        client: { conn: { remoteAddress: '127.0.0.1' } },
        disconnect: vi.fn(),
        emit: vi.fn(),
        handshake: { headers: { host: 'localhost:3999', 'sec-fetch-site': 'same-origin' }, query: { cwd: '/repo', env: '{"TERM":"xterm"}' } },
        on: vi.fn((event: string, handler: Function) => {
          socketHandlers[event] = handler
        })
      }
      for (const origin of ['https://attacker.example', 'null', undefined]) {
        const blocked = { ...localSocket, handshake: { ...localSocket.handshake, headers: { host: 'localhost:3999', origin } } }
        mocks.socketEmitter.emit('connection', blocked)
        expect(pty.spawn).not.toHaveBeenCalled()
      }
      const allowRequest = mocks.socketIo.mock.calls.at(-1)![1].allowRequest
      const callback = vi.fn()
      allowRequest({ headers: { host: 'localhost:3999', origin: 'https://attacker.example' }, socket: { remoteAddress: '127.0.0.1' } }, callback)
      expect(callback).toHaveBeenCalledWith('Forbidden request origin', false)
      allowRequest({ headers: { host: 'localhost:3999', 'sec-fetch-site': 'same-origin' }, socket: { remoteAddress: '127.0.0.1' } }, callback)
      expect(callback).toHaveBeenLastCalledWith(null, true)
      allowRequest({ headers: { host: 'localhost:3999', 'sec-fetch-site': 'same-origin', upgrade: 'websocket' }, socket: { remoteAddress: '127.0.0.1' } }, callback)
      expect(callback).toHaveBeenLastCalledWith('Forbidden request origin', false)
      const engineGuard = mocks.socketEmitter.engine.use.mock.calls.at(-1)![0]
      engineGuard({ headers: { host: 'localhost:3999', origin: 'https://attacker.example' }, socket: { remoteAddress: '127.0.0.1' } }, {}, callback)
      expect(callback).toHaveBeenLastCalledWith(expect.any(Error))
      mocks.socketEmitter.emit('connection', localSocket)

      expect(pty.spawn).toHaveBeenCalledWith('/bin/zsh', [], expect.objectContaining({
        cols: 80,
        cwd: '/repo',
        env: expect.objectContaining({ TERM: 'xterm' }),
        rows: 24,
      }))
      expect(processOn).toHaveBeenCalledWith('exit', expect.any(Function))

      dataHandler?.('hello')
      expect(localSocket.emit).toHaveBeenCalledWith('output', 'hello')

      socketHandlers.input('\u001b]51;A/tmp\n')
      expect(mocks.shellTransformCdCommand).toHaveBeenCalledWith('\u001b]51;A/tmp\n')
      expect(ptyProcess.write).toHaveBeenLastCalledWith('cd:\u001b]51;A/tmp\n')

      socketHandlers.input('echo ok\n')
      expect(ptyProcess.write).toHaveBeenLastCalledWith('echo ok\n')

      socketHandlers.resize([100, 40])
      expect(ptyProcess.resize).toHaveBeenCalledWith(100, 40)

      ptyExitHandlers[0]()
      expect(localSocket.disconnect).toHaveBeenCalled()
      expect(processOff).toHaveBeenCalledWith('exit', expect.any(Function))

      const killPromise = socketHandlers.disconnect()
      ptyExitHandlers.at(-1)!()
      await killPromise
      expect(ptyProcess.kill).toHaveBeenCalled()
    } finally {
      loadSpy.mockRestore()
      processOn.mockRestore()
      processOff.mockRestore()
    }
  })
})
