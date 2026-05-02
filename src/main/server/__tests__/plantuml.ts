import * as os from 'os'
import * as path from 'path'

const mocks = vi.hoisted(() => {
  const { PassThrough } = require('node:stream')

  class MockPlantUmlPipe {
    in = new PassThrough()
    out = new PassThrough()
    options: any

    constructor (options: any) {
      this.options = options
      this.in.on('finish', () => {
        setImmediate(() => this.out.end(Buffer.from(`rendered:${options.outputFormat}`)))
      })
    }
  }

  return {
    assetsDir: '',
    binDir: '',
    cacheDir: '',
    commandExists: vi.fn(),
    configGet: vi.fn(),
    getProxyDispatcher: vi.fn(),
    inflateRaw: vi.fn(() => Buffer.from('@startuml\nA -> B\n@enduml')),
    request: vi.fn(),
    MockPlantUmlPipe
  }
})

vi.mock('command-exists', () => ({
  __esModule: true,
  default: (...args: any[]) => mocks.commandExists(...args)
}))

vi.mock('pako', () => ({
  __esModule: true,
  default: {
    inflateRaw: (...args: any[]) => mocks.inflateRaw(...args)
  },
  inflateRaw: (...args: any[]) => mocks.inflateRaw(...args)
}))

vi.mock('plantuml-pipe', () => ({
  PlantUmlPipe: mocks.MockPlantUmlPipe
}))

vi.mock('undici', () => ({
  request: (...args: any[]) => mocks.request(...args)
}))

vi.mock('../../config', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mocks.configGet(...args)
  }
}))

vi.mock('../../constant', () => ({
  get ASSETS_DIR () {
    return mocks.assetsDir
  },
  get BIN_DIR () {
    return mocks.binDir
  },
  get CACHE_DIR () {
    return mocks.cacheDir
  }
}))

vi.mock('../../action', () => ({
  getAction: (name: string) => {
    if (name === 'get-proxy-dispatcher') return mocks.getProxyDispatcher
    throw new Error(`unexpected action ${name}`)
  }
}))

async function loadPlantuml () {
  vi.resetModules()
  return (await import('../plantuml')).default
}

async function readContent (content: NodeJS.ReadableStream) {
  const chunks: Buffer[] = []
  for await (const chunk of content) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

describe('server plantuml module', () => {
  let tempDir: string

  beforeEach(async () => {
    vi.clearAllMocks()
    tempDir = await import('fs-extra').then(fs => fs.mkdtemp(path.join(os.tmpdir(), 'yn-plantuml-test-')))
    mocks.assetsDir = path.join(tempDir, 'assets')
    mocks.binDir = path.join(tempDir, 'bin')
    mocks.cacheDir = path.join(tempDir, 'cache')
    mocks.commandExists.mockResolvedValue(true)
    mocks.configGet.mockReturnValue('local')
    mocks.getProxyDispatcher.mockResolvedValue('dispatcher')
    mocks.request.mockImplementation(() => {
      const body = new (require('node:stream').PassThrough)()
      setImmediate(() => body.end(Buffer.from('remote image')))
      return Promise.resolve({ headers: { 'content-type': 'image/svg+xml' }, body })
    })
  })

  afterEach(async () => {
    await import('fs-extra').then(fs => fs.remove(tempDir))
  })

  test('renders local PlantUML through plantuml.jar and caches the rendered stream', async () => {
    mocks.configGet.mockReturnValue('local-svg')
    const plantuml = await loadPlantuml()

    const first = await plantuml('encoded')
    const firstContent = await readContent(first.content)
    const second = await plantuml('encoded')
    const secondContent = await readContent(second.content)

    expect(first.type).toBe('image/svg+xml')
    expect(firstContent.toString()).toBe('rendered:svg')
    expect(secondContent.toString()).toBe('rendered:svg')
    expect(mocks.commandExists).toHaveBeenCalledWith('java')
    expect(mocks.inflateRaw).toHaveBeenCalledTimes(1)
  })

  test('throws the no-java image stream when the local renderer cannot run', async () => {
    const fs = await import('fs-extra')
    await fs.outputFile(path.join(mocks.assetsDir, 'no-java-runtime.png'), 'missing java')
    mocks.commandExists.mockRejectedValue(new Error('java missing'))
    const plantuml = await loadPlantuml()

    try {
      await plantuml('encoded')
      throw new Error('expected plantuml to throw')
    } catch (error: any) {
      expect(await readContent(error)).toEqual(Buffer.from('missing java'))
    }
  })

  test('requests remote PlantUML URLs through the proxy dispatcher and caches the response body', async () => {
    mocks.configGet.mockReturnValue('https://plantuml.example/svg/{data}')
    const plantuml = await loadPlantuml()

    const first = await plantuml('QUJD')
    const second = await plantuml('QUJD')

    expect(first.type).toBe('image/svg+xml')
    expect(await readContent(first.content)).toEqual(Buffer.from('remote image'))
    expect(await readContent(second.content)).toEqual(Buffer.from('remote image'))
    expect(mocks.getProxyDispatcher).toHaveBeenCalledWith('https://plantuml.example/svg/GK93')
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('https://plantuml.example/svg/GK93', { dispatcher: 'dispatcher' })
  })
})
