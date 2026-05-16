const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  isElectron: false,
}))

vi.mock('@fe/support/args', () => ({
  HELP_REPO_NAME: '__help__',
  JWT_TOKEN: 'jwt-token',
}))

vi.mock('@fe/support/env', () => ({
  get isElectron () {
    return mocks.isElectron
  },
}))

import {
  abortExtensionInstallation,
  choosePath,
  commentHistoryVersion,
  convertFile,
  copyFile,
  deleteFile,
  deleteHistoryVersion,
  deleteTmpFile,
  deleteUserFile,
  disableExtension,
  enableExtension,
  existsFile,
  fetchCustomStyles,
  fetchHistoryContent,
  fetchHistoryList,
  fetchHttp,
  fetchInstalledExtensions,
  fetchSettings,
  fetchTree,
  installExtension,
  listUserDir,
  moveFile,
  proxyFetch,
  readTmpFile,
  readFile,
  readUserFile,
  rpc,
  runCode,
  search,
  uninstallExtension,
  upload,
  watchFs,
  writeFile,
  writeSettings,
  writeTmpFile,
  writeUserFile,
} from '@fe/support/api'

function jsonResponse (body: any, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function streamResponse (lines: string[]) {
  return new Response(new ReadableStream({
    start (controller) {
      const encoder = new TextEncoder()
      for (const line of lines) {
        controller.enqueue(encoder.encode(line))
      }
      controller.close()
    },
  }))
}

beforeEach(() => {
  mocks.fetch.mockReset()
  mocks.isElectron = false
  vi.stubGlobal('fetch', mocks.fetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('fetchHttp adds authorization and unwraps successful json', async () => {
  mocks.fetch.mockResolvedValueOnce(jsonResponse({ status: 'ok', data: { value: 1 }, message: '' }))

  await expect(fetchHttp('/api/test', { headers: { accept: 'json' } })).resolves.toStrictEqual({
    status: 'ok',
    data: { value: 1 },
    message: '',
  })

  expect(mocks.fetch).toHaveBeenCalledWith('/api/test', {
    headers: { accept: 'json', Authorization: 'Bearer jwt-token' },
  })
})

test('fetchHttp returns non-json or malformed json responses and throws api errors', async () => {
  const textResponse = new Response('plain', { headers: { 'content-type': 'text/plain' } })
  mocks.fetch.mockResolvedValueOnce(textResponse)
  await expect(fetchHttp('/plain')).resolves.toBe(textResponse)

  const malformed = new Response('{', { headers: { 'content-type': 'application/json' } })
  mocks.fetch.mockResolvedValueOnce(malformed)
  await expect(fetchHttp('/bad-json')).resolves.toBe(malformed)

  mocks.fetch.mockResolvedValueOnce(jsonResponse({ status: 'error', message: 'failed' }))
  await expect(fetchHttp('/error')).rejects.toThrow('failed')
})

test('proxyFetch rewrites requests and maps proxy options into headers', async () => {
  mocks.fetch.mockResolvedValueOnce(new Response('ok'))

  await proxyFetch('https://example.com/data', {
    method: 'POST',
    headers: { accept: 'application/json' },
    body: { ok: true },
    timeout: 300,
    proxy: 'http://proxy.local',
    redirect: 'manual',
    jsonBody: true,
  })

  const [url, init] = mocks.fetch.mock.calls[0]
  expect(url).toBe('/api/proxy-fetch/https://example.com/data')
  expect(init.method).toBe('POST')
  expect(init.body).toBe(JSON.stringify({ ok: true }))
  expect(init.headers.get('accept')).toBe('application/json')
  expect(init.headers.get('Content-Type')).toBe('application/json')
  expect(init.headers.get('x-proxy-timeout')).toBe('300')
  expect(init.headers.get('x-proxy-url')).toBe('http://proxy.local')
  expect(init.headers.get('x-proxy-max-redirections')).toBe('0')
  expect(init.headers.get('x-yn-authorization')).toBe('Bearer jwt-token')
})

test('proxyFetch reports encoded proxy errors', async () => {
  mocks.fetch.mockResolvedValueOnce(new Response('bad', {
    headers: {
      'x-yank-note-api-status': 'error',
      'x-yank-note-api-message': encodeURIComponent('proxy failed'),
    },
  }))

  await expect(proxyFetch('https://example.com/a')).rejects.toThrow('proxy failed')
  expect(mocks.fetch.mock.calls[0][0]).toBe('/api/proxy-fetch/https://example.com/a')
})

test('proxyFetch supports Request inputs and rejects missing urls', async () => {
  mocks.fetch
    .mockResolvedValueOnce(new Response('request'))

  await expect(proxyFetch(undefined as any)).rejects.toThrow('url is required')
  await expect(proxyFetch(new Request('https://example.com/request', {
    headers: { 'x-from': 'request' },
  }))).resolves.toBeInstanceOf(Response)

  expect(mocks.fetch.mock.calls[0][0]).toBeInstanceOf(Request)
  expect((mocks.fetch.mock.calls[0][0] as Request).url).toBe('http://localhost:3000/api/proxy-fetch/https://example.com/request')
  expect(mocks.fetch.mock.calls[0][1].headers.get('x-from')).toBe('request')
})

test('file helpers build expected requests including help repo special case', async () => {
  mocks.fetch
    .mockResolvedValueOnce(jsonResponse({ data: { content: '# Help' } }))
    .mockResolvedValueOnce(jsonResponse({ data: { content: 'note' } }))
    .mockResolvedValueOnce(jsonResponse({ data: { hash: 'new', stat: { size: 4 } } }))

  await expect(readFile({ repo: '__help__', path: 'intro.md' } as any)).resolves.toMatchObject({
    content: '# Help',
    writeable: true,
  })
  await expect(readFile({ repo: 'notes', path: '/a b.md' } as any, true)).resolves.toStrictEqual({ content: 'note' })
  await expect(writeFile({ repo: 'notes', path: '/a.md', contentHash: 'old' }, 'body', true)).resolves.toStrictEqual({
    hash: 'new',
    stat: { size: 4 },
  })

  expect(mocks.fetch.mock.calls[0][0]).toBe('/api/help?doc=intro.md')
  expect(mocks.fetch.mock.calls[1][0]).toBe('/api/file?path=%2Fa%20b.md&repo=notes&asBase64=true')
  expect(JSON.parse(mocks.fetch.mock.calls[2][1].body)).toStrictEqual({
    repo: 'notes',
    path: '/a.md',
    content: 'body',
    oldHash: 'old',
    asBase64: true,
  })
})

test('file, history, tree, and settings helpers map requests and unwrap data', async () => {
  mocks.fetch
    .mockResolvedValueOnce(jsonResponse({ data: true }))
    .mockResolvedValueOnce(jsonResponse({ data: { ok: 'move' } }))
    .mockResolvedValueOnce(jsonResponse({ data: { ok: 'copy' } }))
    .mockResolvedValueOnce(jsonResponse({ data: { ok: 'delete' } }))
    .mockResolvedValueOnce(jsonResponse({ data: { size: 1, list: [{ name: 'v1', comment: '' }] } }))
    .mockResolvedValueOnce(jsonResponse({ data: 'old content' }))
    .mockResolvedValueOnce(jsonResponse({ data: 'deleted' }))
    .mockResolvedValueOnce(jsonResponse({ data: 'commented' }))
    .mockResolvedValueOnce(jsonResponse({ data: [{ path: '/a.md' }] }))
    .mockResolvedValueOnce(jsonResponse({ data: ['custom.css'] }))
    .mockResolvedValueOnce(jsonResponse({ data: { theme: 'dark' } }))
    .mockResolvedValueOnce(jsonResponse({ status: 'ok', data: { saved: true }, message: '' }))

  await expect(existsFile({ repo: '__help__', path: 'intro.md' } as any)).resolves.toBe(false)
  await expect(existsFile({ repo: 'notes', path: '/a b.md' } as any)).resolves.toBe(true)
  await expect(moveFile({ repo: 'notes', path: '/a.md' } as any, '/b.md')).resolves.toMatchObject({ data: { ok: 'move' } })
  await expect(copyFile({ repo: 'notes', path: '/a.md' } as any, '/copy.md')).resolves.toMatchObject({ data: { ok: 'copy' } })
  await expect(deleteFile({ repo: 'notes', path: '/a.md' } as any, false)).resolves.toMatchObject({ data: { ok: 'delete' } })
  await expect(fetchHistoryList({ repo: 'notes', path: '/a.md' } as any)).resolves.toStrictEqual({ size: 1, list: [{ name: 'v1', comment: '' }] })
  await expect(fetchHistoryContent({ repo: 'notes', path: '/a.md' } as any, 'v 1')).resolves.toBe('old content')
  await expect(deleteHistoryVersion({ repo: 'notes', path: '/a.md' } as any, 'v1')).resolves.toBe('deleted')
  await expect(commentHistoryVersion({ repo: 'notes', path: '/a.md' } as any, 'v1', 'keep')).resolves.toBe('commented')
  await expect(fetchTree('notes', { by: 'name', order: 'asc' } as any, 'docs/*.md', true)).resolves.toStrictEqual([{ path: '/a.md' }])
  await expect(fetchCustomStyles()).resolves.toStrictEqual(['custom.css'])
  await expect(fetchSettings()).resolves.toStrictEqual({ theme: 'dark' })
  await expect(writeSettings({ theme: 'light' })).resolves.toMatchObject({ data: { saved: true } })

  expect(mocks.fetch.mock.calls[0][0]).toBe('/api/file?path=%2Fa%20b.md&repo=notes&exists=true')
  expect(JSON.parse(mocks.fetch.mock.calls[1][1].body)).toStrictEqual({ repo: 'notes', oldPath: '/a.md', newPath: '/b.md' })
  expect(mocks.fetch.mock.calls[3][0]).toBe('/api/file?path=%2Fa.md&repo=notes&trash=false')
  expect(mocks.fetch.mock.calls[5][0]).toBe('/api/history/content?path=%2Fa.md&repo=notes&version=v%201')
  expect(mocks.fetch.mock.calls[8][0]).toBe('/api/tree?repo=notes&sort=name-asc&include=docs%2F*.md&noEmptyDir=true')
  expect(JSON.parse(mocks.fetch.mock.calls[11][1].body)).toStrictEqual({ theme: 'light' })
})

test('search reads streamed result, message, and done payload lines', async () => {
  mocks.fetch.mockResolvedValueOnce(streamResponse([
    JSON.stringify({ type: 'result', payload: [{ path: '/a.md' }] }) + '\n',
    JSON.stringify({ type: 'message', payload: { message: 'scanning' } }) + '\n',
    JSON.stringify({ type: 'done', payload: { stats: { matches: 1 } } }) + '\n',
  ]))
  const controller = new AbortController()
  const consume = await search(controller, { pattern: 'hello' } as any)
  const onResult = vi.fn()
  const onMessage = vi.fn()

  await expect(consume(onResult, onMessage)).resolves.toStrictEqual({ stats: { matches: 1 } })
  expect(onResult).toHaveBeenCalledWith([{ path: '/a.md' }])
  expect(onMessage).toHaveBeenCalledWith({ message: 'scanning' })
  expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toStrictEqual({ query: { pattern: 'hello' } })
})

test('search throws stream payloads for unknown line types and returns null on closed streams', async () => {
  mocks.fetch
    .mockResolvedValueOnce(streamResponse([
      JSON.stringify({ type: 'error', payload: { message: 'bad stream' } }) + '\n',
    ]))
    .mockResolvedValueOnce(streamResponse([]))

  const consumeError = await search(new AbortController(), { pattern: 'bad' } as any)
  await expect(consumeError(vi.fn())).rejects.toStrictEqual({ message: 'bad stream' })

  const consumeClosed = await search(new AbortController(), { pattern: 'none' } as any)
  await expect(consumeClosed(vi.fn())).resolves.toBeNull()
})

test('watchFs returns abort handle and suppresses abort errors', async () => {
  let abortReject!: (error: Error) => void
  mocks.fetch.mockResolvedValueOnce({
    headers: new Headers(),
    body: {
      getReader: () => ({
        read: () => new Promise((_resolve, reject) => {
          abortReject = reject
        }),
      }),
    },
  })
  const onResult = vi.fn()
  const onError = vi.fn()

  const watcher = await watchFs('notes', ['/a.md'], { mdContent: true }, onResult, onError)
  watcher.abort()
  abortReject(new Error('abort'))
  await expect(watcher.result).rejects.toThrow('abort')
  await Promise.resolve()

  expect(onError).not.toHaveBeenCalled()
  expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toStrictEqual({
    repo: 'notes',
    path: ['/a.md'],
    options: { mdContent: true },
  })
})

test('watchFs forwards non-abort read errors to onError', async () => {
  let rejectRead!: (error: Error) => void
  mocks.fetch.mockResolvedValueOnce({
    headers: new Headers(),
    body: {
      getReader: () => ({
        read: () => new Promise((_resolve, reject) => {
          rejectRead = reject
        }),
      }),
    },
  })
  const onError = vi.fn()

  const watcher = await watchFs('notes', '/a.md', {}, vi.fn(), onError)
  const error = new Error('stream failed')
  rejectRead(error)
  await expect(watcher.result).rejects.toThrow('stream failed')
  await Promise.resolve()

  expect(onError).toHaveBeenCalledWith(error)
})

test('runCode, rpc, and choosePath unwrap API responses', async () => {
  mocks.fetch
    .mockResolvedValueOnce(new Response('stdout'))
    .mockResolvedValueOnce(jsonResponse({ data: 3 }))
    .mockResolvedValueOnce(jsonResponse({ data: { canceled: false, filePaths: ['/tmp/a'] } }))

  await expect(runCode('node', 'console.log(1)')).resolves.toBe('stdout')
  await expect(rpc('return 1 + 2')).resolves.toBe(3)
  mocks.isElectron = true
  await expect(choosePath({ properties: ['openFile'] })).resolves.toStrictEqual({
    canceled: false,
    filePaths: ['/tmp/a'],
  })

  expect(mocks.fetch.mock.calls[0][0]).toBe('/api/run')
  expect(mocks.fetch.mock.calls[1][0]).toBe('/api/rpc')
  expect(mocks.fetch.mock.calls[2][0]).toBe('/api/choose?from=electron')
})

test('runCode can return stream reader and choosePath uses browser source by default', async () => {
  const reader = { read: vi.fn() }
  mocks.fetch
    .mockResolvedValueOnce({ headers: new Headers(), body: { getReader: () => reader } })
    .mockResolvedValueOnce(jsonResponse({ data: { canceled: true, filePaths: [] } }))

  await expect(runCode({ cmd: 'python', args: ['-'] }, 'print(1)', { stream: true })).resolves.toBe(reader)
  await expect(choosePath({ properties: ['openDirectory'] })).resolves.toStrictEqual({ canceled: true, filePaths: [] })

  expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toStrictEqual({ cmd: { cmd: 'python', args: ['-'] }, code: 'print(1)' })
  expect(mocks.fetch.mock.calls[1][0]).toBe('/api/choose?from=browser')
})

test('temporary, user file, conversion, upload, and extension helpers map endpoints', async () => {
  const rawResponse = new Response('raw')
  mocks.fetch
    .mockResolvedValueOnce(jsonResponse({ data: { path: '/tmp/a' } }))
    .mockResolvedValueOnce(rawResponse)
    .mockResolvedValueOnce(jsonResponse({ data: { ok: 'tmp-del' } }))
    .mockResolvedValueOnce(jsonResponse({ data: [{ name: 'a', path: '/a', parent: '/', isFile: true, isDir: false }] }))
    .mockResolvedValueOnce(jsonResponse({ data: { path: '/user/a' } }))
    .mockResolvedValueOnce(rawResponse)
    .mockResolvedValueOnce(jsonResponse({ data: { ok: 'user-del' } }))
    .mockResolvedValueOnce(rawResponse)
    .mockResolvedValueOnce(jsonResponse({ data: { path: '/asset.png', hash: 'h' } }))
    .mockResolvedValueOnce(jsonResponse({ data: [{ id: 'ext', enabled: true }] }))
    .mockResolvedValueOnce(jsonResponse({ data: { installed: true } }))
    .mockResolvedValueOnce(jsonResponse({ data: { aborted: true } }))
    .mockResolvedValueOnce(jsonResponse({ data: { uninstalled: true } }))
    .mockResolvedValueOnce(jsonResponse({ data: { enabled: true } }))
    .mockResolvedValueOnce(jsonResponse({ data: { disabled: true } }))

  await expect(writeTmpFile('a b.txt', 'data', true)).resolves.toMatchObject({ data: { path: '/tmp/a' } })
  await expect(readTmpFile('a b.txt')).resolves.toBe(rawResponse)
  await expect(deleteTmpFile('a b.txt')).resolves.toMatchObject({ data: { ok: 'tmp-del' } })
  await expect(listUserDir('docs', true)).resolves.toStrictEqual([{ name: 'a', path: '/a', parent: '/', isFile: true, isDir: false }])
  await expect(writeUserFile('a.txt', 'body')).resolves.toMatchObject({ data: { path: '/user/a' } })
  await expect(readUserFile('a.txt')).resolves.toBe(rawResponse)
  await expect(deleteUserFile('a.txt')).resolves.toMatchObject({ data: { ok: 'user-del' } })
  await expect(convertFile('# hi', 'markdown', 'html', '/docs')).resolves.toBe(rawResponse)
  await expect(upload('notes', 'data:image/png;base64,a', '/img.png', 'overwrite')).resolves.toMatchObject({ data: { path: '/asset.png', hash: 'h' } })
  await expect(fetchInstalledExtensions()).resolves.toStrictEqual([{ id: 'ext', enabled: true }])
  await expect(installExtension('a b', 'https://e/x y.zip')).resolves.toMatchObject({ data: { installed: true } })
  await expect(abortExtensionInstallation()).resolves.toMatchObject({ data: { aborted: true } })
  await expect(uninstallExtension('a b')).resolves.toMatchObject({ data: { uninstalled: true } })
  await expect(enableExtension('a b')).resolves.toMatchObject({ data: { enabled: true } })
  await expect(disableExtension('a b')).resolves.toMatchObject({ data: { disabled: true } })

  expect(mocks.fetch.mock.calls[0][0]).toBe('/api/tmp-file?name=a%20b.txt&asBase64=true')
  expect(mocks.fetch.mock.calls[3][0]).toBe('/api/user-dir?name=docs&recursive=true')
  expect(JSON.parse(mocks.fetch.mock.calls[7][1].body)).toStrictEqual({
    source: '# hi',
    fromType: 'markdown',
    toType: 'html',
    resourcePath: '/docs',
  })
  expect(mocks.fetch.mock.calls[8][1].body).toBeInstanceOf(FormData)
  expect(mocks.fetch.mock.calls[10][0]).toBe('/api/extensions/install?id=a%20b&url=https%3A%2F%2Fe%2Fx%20y.zip')
  expect(mocks.fetch.mock.calls[11][0]).toBe('/api/extensions/abort-installation')
  expect(mocks.fetch.mock.calls[12][0]).toBe('/api/extensions/uninstall?id=a%20b')
  expect(mocks.fetch.mock.calls[13][0]).toBe('/api/extensions/enable?id=a%20b')
  expect(mocks.fetch.mock.calls[14][0]).toBe('/api/extensions/disable?id=a%20b')
})
