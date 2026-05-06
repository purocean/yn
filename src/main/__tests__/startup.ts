import * as path from 'path'

const mocks = vi.hoisted(() => ({
  constants: {
    USER_DIR: '/user',
    USER_PLUGIN_DIR: '/user/plugins',
    USER_THEME_DIR: '/user/themes',
    RESOURCES_DIR: '/resources',
    BUILD_IN_STYLES: ['github.css'],
    PANDOC_REFERENCE_FILE: 'pandoc-reference.docx',
    HISTORY_DIR: '/user/histories',
    USER_EXTENSION_DIR: '/user/extensions',
  },
  createReadStream: vi.fn(),
  createWriteStream: vi.fn(),
  ensureDirSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

vi.mock('fs-extra', () => ({
  ensureDirSync: (...args: any[]) => mocks.ensureDirSync(...args),
  existsSync: (...args: any[]) => mocks.existsSync(...args),
  mkdirSync: (...args: any[]) => mocks.mkdirSync(...args),
  readFileSync: (...args: any[]) => mocks.readFileSync(...args),
  writeFileSync: (...args: any[]) => mocks.writeFileSync(...args),
  createReadStream: (...args: any[]) => mocks.createReadStream(...args),
  createWriteStream: (...args: any[]) => mocks.createWriteStream(...args),
}))

vi.mock('../constant', () => mocks.constants)

vi.mock('../updater', () => ({}))

async function loadStartup () {
  vi.resetModules()
  return (await import('../startup')).default
}

describe('main startup module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.existsSync.mockReturnValue(true)
    mocks.readFileSync.mockReturnValue(Buffer.from('style'))
    mocks.createReadStream.mockReturnValue({ pipe: vi.fn() })
    mocks.createWriteStream.mockReturnValue('write-stream')
  })

  test('ensures user directories and refreshes built-in styles', async () => {
    const startup = await loadStartup()

    startup()

    expect(mocks.ensureDirSync).toHaveBeenCalledWith('/user')
    expect(mocks.ensureDirSync).toHaveBeenCalledWith('/user/themes')
    expect(mocks.ensureDirSync).toHaveBeenCalledWith('/user/histories')
    expect(mocks.ensureDirSync).toHaveBeenCalledWith('/user/extensions')
    expect(mocks.writeFileSync).toHaveBeenCalledWith(
      path.join('/user/themes', 'github.css'),
      Buffer.from('style')
    )
    expect(mocks.mkdirSync).not.toHaveBeenCalled()
    expect(mocks.createReadStream).not.toHaveBeenCalled()
  })

  test('creates example plugin and pandoc reference when missing', async () => {
    mocks.existsSync.mockImplementation((target: string) => {
      if (target === '/user/plugins') return false
      if (target === path.join('/user', 'pandoc-reference.docx')) return false
      return true
    })
    const stream = { pipe: vi.fn() }
    mocks.createReadStream.mockReturnValue(stream)
    const startup = await loadStartup()

    startup()

    expect(mocks.mkdirSync).toHaveBeenCalledWith('/user/plugins')
    expect(mocks.writeFileSync).toHaveBeenCalledWith(
      path.join('/user/plugins', 'plugin-example.js'),
      expect.stringContaining('window.registerPlugin')
    )
    expect(mocks.createReadStream).toHaveBeenCalledWith(path.join('/resources', 'pandoc-reference.docx'))
    expect(mocks.createWriteStream).toHaveBeenCalledWith(path.join('/user', 'pandoc-reference.docx'))
    expect(stream.pipe).toHaveBeenCalledWith('write-stream')
  })
})
