import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import tar from 'tar-stream'
import { gzipSync } from 'zlib'
import { request } from 'undici'

const mocks = vi.hoisted(() => ({
  configStore: new Map<string, any>(),
  extensionDir: '',
  getProxyDispatcher: vi.fn(),
}))

vi.mock('../constant', () => ({
  get USER_EXTENSION_DIR () {
    return mocks.extensionDir
  }
}))

vi.mock('../config', () => ({
  __esModule: true,
  default: {
    get: (key: string, defaultValue?: any) => mocks.configStore.has(key) ? mocks.configStore.get(key) : defaultValue,
    set: (key: string, value: any) => mocks.configStore.set(key, value),
  }
}))

vi.mock('../action', () => ({
  getAction: (name: string) => {
    if (name === 'get-proxy-dispatcher') {
      return mocks.getProxyDispatcher
    }
    return undefined
  }
}))

vi.mock('undici', () => ({
  request: vi.fn()
}))

async function loadExtension () {
  vi.resetModules()
  return await import('../extension')
}

async function makeExtensionArchive (files: Record<string, string>) {
  const pack = tar.pack()
  const chunks: Buffer[] = []

  pack.on('data', chunk => chunks.push(chunk))

  for (const [name, contents] of Object.entries(files)) {
    await new Promise<void>((resolve, reject) => {
      pack.entry({ name, type: 'file' }, contents, err => err ? reject(err) : resolve())
    })
  }

  await new Promise<void>((resolve, reject) => {
    pack.finalize()
    pack.on('end', resolve)
    pack.on('error', reject)
  })

  return gzipSync(Buffer.concat(chunks))
}

describe('main extension module', () => {
  let tempDir: string

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(request).mockReset()
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yn-extension-test-'))
    mocks.extensionDir = path.join(tempDir, 'extensions')
    mocks.configStore.clear()
    mocks.getProxyDispatcher.mockResolvedValue(undefined)
    await fs.ensureDir(mocks.extensionDir)
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  test('lists valid extension directories and prunes stale settings', async () => {
    await fs.ensureDir(path.join(mocks.extensionDir, 'author$plugin'))
    await fs.ensureDir(path.join(mocks.extensionDir, 'plain-plugin'))
    await fs.outputFile(path.join(mocks.extensionDir, 'not-a-dir'), 'x')
    await fs.ensureDir(path.join(mocks.extensionDir, 'bad.name'))
    mocks.configStore.set('extensions', {
      'author/plugin': { enabled: true },
      'missing/plugin': { enabled: true },
    })

    const extension = await loadExtension()
    const result = await extension.list()

    expect(result).toEqual([
      { id: 'author/plugin', enabled: true, isDev: false },
      { id: 'plain-plugin', enabled: undefined, isDev: false },
    ])
    expect(mocks.configStore.get('extensions')).toEqual({
      'author/plugin': { enabled: true },
    })
    expect(extension.dirnameToId('author$plugin')).toBe('author/plugin')
  })

  test('updates enabled state in extension config without dropping existing fields', async () => {
    mocks.configStore.set('extensions', {
      'author/plugin': { enabled: false, option: 1 },
    })
    const extension = await loadExtension()

    await extension.enable('author/plugin')
    expect(mocks.configStore.get('extensions')).toEqual({
      'author/plugin': { enabled: true, option: 1 },
    })

    await extension.disable('new/plugin')
    expect(mocks.configStore.get('extensions')).toMatchObject({
      'new/plugin': { enabled: false },
    })
  })

  test('uninstall removes existing extension directories and rejects invalid ids', async () => {
    await fs.ensureDir(path.join(mocks.extensionDir, 'author$plugin'))
    const extension = await loadExtension()

    await extension.uninstall('author/plugin')
    await expect(fs.pathExists(path.join(mocks.extensionDir, 'author$plugin'))).resolves.toBe(false)

    await expect(extension.uninstall('../bad')).rejects.toThrow('Invalid extension id')
  })

  test('installs extension archives through proxy dispatcher and skips unsafe entries', async () => {
    const archive = await makeExtensionArchive({
      'package/index.js': 'console.log("ok")',
      'package/nested/readme.md': '# readme',
      'package/../escape.txt': 'nope',
    })
    const dispatcher = { name: 'dispatcher' }
    mocks.getProxyDispatcher.mockResolvedValue(dispatcher)
    vi.mocked(request).mockResolvedValue({
      body: {
        arrayBuffer: async () => archive,
      },
    } as any)

    const extension = await loadExtension()
    await extension.install('author/plugin', 'https://example.com/plugin.tgz')

    expect(mocks.getProxyDispatcher).toHaveBeenCalledWith('https://example.com/plugin.tgz')
    expect(request).toHaveBeenCalledWith('https://example.com/plugin.tgz', expect.objectContaining({
      dispatcher,
      maxRedirections: 3,
      signal: expect.any(AbortSignal),
    }))
    await expect(fs.readFile(path.join(mocks.extensionDir, 'author$plugin/index.js'), 'utf8')).resolves.toBe('console.log("ok")')
    await expect(fs.pathExists(path.join(mocks.extensionDir, 'escape.txt'))).resolves.toBe(false)
  })

  test('rejects concurrent installs and aborts the active request signal', async () => {
    let resolveBody: (value: ArrayBuffer) => void = () => {}
    const bodyPromise = new Promise<ArrayBuffer>(resolve => {
      resolveBody = resolve
    })
    const archive = await makeExtensionArchive({ 'package/index.js': 'done' })
    vi.mocked(request).mockResolvedValue({
      body: {
        arrayBuffer: () => bodyPromise,
      },
    } as any)
    const extension = await loadExtension()

    const installing = extension.install('author/plugin', 'https://example.com/plugin.tgz')
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    await expect(extension.install('other/plugin', 'https://example.com/other.tgz')).rejects.toThrow('Another extension is being installed')

    const requestOptions = vi.mocked(request).mock.calls[0][1] as any
    expect(requestOptions.signal.aborted).toBe(false)
    await extension.abortInstallation()
    expect(requestOptions.signal.aborted).toBe(true)

    resolveBody(archive)
    await installing
  })

  test('cleans temp install directory after request or extraction failure', async () => {
    vi.mocked(request).mockRejectedValue(new Error('download failed'))
    const extension = await loadExtension()

    await expect(extension.install('author/plugin', 'https://example.com/plugin.tgz')).rejects.toThrow('download failed')
    const entries = await fs.readdir(mocks.extensionDir)
    expect(entries).toEqual([])
  })
})
