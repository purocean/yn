import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as nodePath from 'node:path'

const mocks = vi.hoisted(() => ({ realpath: vi.fn() }))
vi.mock('fs-extra', () => ({ realpath: mocks.realpath }))

let resolveHelpPath: typeof import('../help-path').resolveHelpPath

describe.each([
  { name: 'POSIX', paths: nodePath.posix, helpDir: '/app/help' },
  { name: 'Windows', paths: nodePath.win32, helpDir: 'C:\\app\\help' }
])('help paths with $name semantics', ({ paths, helpDir }) => {
  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('path', () => paths)
    mocks.realpath.mockReset().mockImplementation(async (target: string) => target)
    ;({ resolveHelpPath } = await import('../help-path'))
  })

  test.each([
    'README.md', '/README.md', 'nested/guide.png', '/nested/guide.png',
    './nested/guide.md', 'nested/../README.md', '..guide.md', 'nested/使用 指南.md'
  ])('keeps a help-root-relative path inside the root: %s', async input => {
    const target = paths.resolve(helpDir, input.replace(/^\//, ''))
    await expect(resolveHelpPath(helpDir, input)).resolves.toBe(target)
    expect(mocks.realpath.mock.calls).toEqual([[helpDir], [target]])
  })

  test.each([
    '../README.md', '../guide.png', '../../secret', '..//../secret',
    'nested/../../secret', '../help-other/secret', '/../secret',
    '..\\secret', 'nested\\..\\..\\secret', 'nested/..\\secret',
    'C:\\secret', 'C:/secret', 'C:secret', 'D:/secret',
    '//server/share/secret', '\\\\server\\share\\secret',
    '\\\\?\\C:\\secret', '\\\\.\\C:\\secret', 'README.md:stream',
    '.', '/', '..', 'nested/..', '', undefined, null, ['README.md'], 123, {}, 'README.md\0'
  ])('rejects invalid or escaping paths before touching the filesystem: %j', async input => {
    await expect(resolveHelpPath(helpDir, input)).resolves.toBeNull()
    expect(mocks.realpath).not.toHaveBeenCalled()
  })

  test.each(['../secret', '../help-other/secret', '..', '.'])('rejects a canonical target outside or equal to the root: %s', async target => {
    mocks.realpath.mockResolvedValueOnce(helpDir).mockResolvedValueOnce(paths.resolve(helpDir, target))
    await expect(resolveHelpPath(helpDir, 'link.md')).resolves.toBeNull()
  })

  test('checks and returns canonical paths when the help root itself is a symlink', async () => {
    const realRoot = paths.resolve(helpDir, '../real-help')
    const realTarget = paths.join(realRoot, 'nested', 'README.md')
    mocks.realpath.mockResolvedValueOnce(realRoot).mockResolvedValueOnce(realTarget)
    await expect(resolveHelpPath(helpDir, 'README.md')).resolves.toBe(realTarget)
  })

  test('rejects a canonical target on another Windows drive', async () => {
    if (paths !== nodePath.win32) return
    mocks.realpath.mockResolvedValueOnce(helpDir).mockResolvedValueOnce('D:\\secret.md')
    await expect(resolveHelpPath(helpDir, 'link.md')).resolves.toBeNull()
  })

  test('checks the unpacked help files in packaged apps', async () => {
    const packagedRoot = paths.resolve(helpDir, '../app.asar/help')
    const unpackedRoot = paths.resolve(helpDir, '../app.asar.unpacked/help')
    const target = paths.join(unpackedRoot, 'README.md')
    await expect(resolveHelpPath(packagedRoot, '/README.md')).resolves.toBe(target)
    expect(mocks.realpath.mock.calls).toEqual([[unpackedRoot], [target]])
  })

  test('fails closed when either canonical path cannot be resolved', async () => {
    mocks.realpath.mockRejectedValueOnce(new Error('Missing root'))
    await expect(resolveHelpPath(helpDir, 'README.md')).resolves.toBeNull()
    mocks.realpath.mockResolvedValueOnce(helpDir).mockRejectedValueOnce(new Error('Missing file'))
    await expect(resolveHelpPath(helpDir, 'README.md')).resolves.toBeNull()
  })
})

describe('help paths on the filesystem', () => {
  let tempDir: string
  let helpDir: string

  beforeEach(async () => {
    vi.resetModules()
    vi.doUnmock('path')
    mocks.realpath.mockReset().mockImplementation(fs.realpath)
    ;({ resolveHelpPath } = await import('../help-path'))
    tempDir = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'yn-help-path-'))
    helpDir = nodePath.join(tempDir, 'help')
    await fs.mkdir(nodePath.join(helpDir, 'nested'), { recursive: true })
    await fs.mkdir(nodePath.join(tempDir, 'help-other'))
    await fs.writeFile(nodePath.join(helpDir, 'nested', 'guide.md'), 'help content')
    await fs.writeFile(nodePath.join(tempDir, 'help-other', 'secret.md'), 'outside help')
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  test('reads a normal nested file and denies a missing file', async () => {
    const target = await resolveHelpPath(helpDir, '/nested/guide.md')
    expect(await fs.readFile(target!, 'utf-8')).toBe('help content')
    await expect(resolveHelpPath(helpDir, 'missing.md')).resolves.toBeNull()
  })

  test('allows in-root symlinks but denies escaping file and directory symlinks', async () => {
    await fs.symlink(nodePath.join(helpDir, 'nested', 'guide.md'), nodePath.join(helpDir, 'inside.md'))
    await fs.symlink(nodePath.join(tempDir, 'help-other', 'secret.md'), nodePath.join(helpDir, 'outside.md'))
    await fs.symlink(nodePath.join(tempDir, 'help-other'), nodePath.join(helpDir, 'outside'), 'junction')
    await expect(resolveHelpPath(helpDir, 'inside.md')).resolves.toBe(await fs.realpath(nodePath.join(helpDir, 'nested', 'guide.md')))
    await expect(resolveHelpPath(helpDir, 'outside.md')).resolves.toBeNull()
    await expect(resolveHelpPath(helpDir, 'outside/secret.md')).resolves.toBeNull()
  })

  test('allows a symlinked help root', async () => {
    const linkedRoot = nodePath.join(tempDir, 'linked-help')
    await fs.symlink(helpDir, linkedRoot, 'junction')
    await expect(resolveHelpPath(linkedRoot, 'nested/guide.md')).resolves.toBe(await fs.realpath(nodePath.join(helpDir, 'nested', 'guide.md')))
  })
})
