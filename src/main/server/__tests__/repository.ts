import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'

const mocks = vi.hoisted(() => ({
  configGet: vi.fn(),
  isWsl: false,
  toWslPath: vi.fn((p: string) => `/mnt/${p[0].toLowerCase()}${p.slice(2).replace(/\\/g, '/')}`)
}))

vi.mock('../../config', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mocks.configGet(...args)
  }
}))

vi.mock('../../wsl', () => ({
  get isWsl () {
    return mocks.isWsl
  },
  toWslPath: (...args: any[]) => mocks.toWslPath(...args)
}))

async function loadRepository () {
  vi.resetModules()
  return (await import('../repository')).default
}

describe('server repository module', () => {
  let tempDir: string

  beforeEach(async () => {
    vi.clearAllMocks()
    mocks.isWsl = false
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yn-repository-test-'))
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  test('lists configured repositories using the default object when config is empty', async () => {
    const repositories = { main: tempDir, docs: path.join(tempDir, 'docs') }
    mocks.configGet.mockReturnValue(repositories)

    const repository = await loadRepository()

    expect(repository.list()).toBe(repositories)
    expect(mocks.configGet).toHaveBeenCalledWith('repositories', {})
  })

  test('resolves trimmed absolute repository paths that exist', async () => {
    mocks.configGet.mockReturnValue({ main: `  ${tempDir}  ` })

    const repository = await loadRepository()

    expect(repository.getPath('main')).toBe(tempDir)
  })

  test('resolves relative repository paths from the current working directory', async () => {
    const relative = path.relative(process.cwd(), tempDir)
    mocks.configGet.mockReturnValue({ main: relative })

    const repository = await loadRepository()

    expect(repository.getPath('main')).toBe(path.resolve(relative))
  })

  test('returns null for blank, missing, or non-existent repository paths', async () => {
    mocks.configGet.mockReturnValue({
      blank: '   ',
      missing: path.join(tempDir, 'does-not-exist')
    })

    const repository = await loadRepository()

    expect(repository.getPath('unknown')).toBeNull()
    expect(repository.getPath('blank')).toBeNull()
    expect(repository.getPath('missing')).toBeNull()
  })

  test('converts Windows drive paths when running under WSL before existence checks', async () => {
    const wslPath = path.join(tempDir, 'wsl-repo')
    await fs.ensureDir(wslPath)
    mocks.isWsl = true
    mocks.toWslPath.mockReturnValue(wslPath)
    mocks.configGet.mockReturnValue({ main: 'C:\\Users\\me\\notes' })

    const repository = await loadRepository()

    expect(repository.getPath('main')).toBe(wslPath)
    expect(mocks.toWslPath).toHaveBeenCalledWith('C:\\Users\\me\\notes')
  })
})
