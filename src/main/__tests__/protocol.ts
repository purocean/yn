const mocks = vi.hoisted(() => ({
  registerSchemesAsPrivileged: vi.fn(),
  getBlobData: vi.fn(),
}))

vi.mock('electron', () => ({
  protocol: {
    registerSchemesAsPrivileged: (...args: any[]) => mocks.registerSchemesAsPrivileged(...args),
  },
  session: {
    defaultSession: {
      getBlobData: (...args: any[]) => mocks.getBlobData(...args),
    },
  },
}))

async function loadProtocol () {
  vi.resetModules()
  return await import('../protocol')
}

describe('protocol module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('registers the app scheme as privileged on import', async () => {
    await loadProtocol()

    expect(mocks.registerSchemesAsPrivileged).toHaveBeenCalledWith([{
      scheme: 'yank-note',
      privileges: {
        supportFetchAPI: true,
        standard: true,
        secure: true,
        allowServiceWorkers: true,
        bypassCSP: true,
        corsEnabled: true,
      },
    }])
  })

  test('transforms protocol requests into node request and response streams', async () => {
    mocks.getBlobData.mockResolvedValue(Buffer.from(' blob'))
    const { transformProtocolRequest } = await loadProtocol()

    const { req, res, out } = await transformProtocolRequest({
      method: 'POST',
      url: 'yank-note://localhost/api',
      headers: {
        'X-Test': 'ok',
      },
      uploadData: [
        { bytes: Buffer.from('bytes') },
        { blobUUID: 'blob-1' },
      ],
    } as any)

    expect(req.method).toBe('POST')
    expect(req.url).toBe('http://localhost/api')
    expect(req.headers['x-test']).toBe('ok')
    expect(req.headers['content-length']).toBe('10')
    expect(mocks.getBlobData).toHaveBeenCalledWith('blob-1')

    const chunks: Buffer[] = []
    out.on('data', chunk => chunks.push(Buffer.from(chunk)))
    res.write('hello')
    res.end(' world')

    await new Promise(resolve => out.on('end', resolve))
    expect(Buffer.concat(chunks).toString()).toBe('hello world')
  })

  test('creates an empty request body when upload data is absent', async () => {
    const { transformProtocolRequest } = await loadProtocol()

    const { req } = await transformProtocolRequest({
      method: 'GET',
      url: 'yank-note://localhost/api',
      headers: {},
    } as any)

    const push = vi.spyOn(req, 'push')
    req._read()

    expect(push).toHaveBeenCalledWith(null)
    expect(req.headers['content-length']).toBeUndefined()
  })
})
