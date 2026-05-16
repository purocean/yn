const mocks = vi.hoisted(() => {
  const EventEmitter = require('node:events')
  const { PassThrough } = require('node:stream')
  const nodePath = require('node:path')

  class MockProcess extends EventEmitter {
    stdout = new PassThrough()
    stderr = new PassThrough()
    kill = vi.fn()
  }

  return {
    MockProcess,
    configGet: vi.fn(),
    exec: vi.fn(),
    execFile: vi.fn(),
    glob: vi.fn(),
    platform: vi.fn(() => 'linux'),
    tmpdir: vi.fn(() => '/tmp'),
    writeFile: vi.fn(),
    remove: vi.fn(),
    mergeStreams: vi.fn(() => new PassThrough()),
    pathJoin: nodePath.join
  }
})

vi.mock('os', () => ({
  platform: (...args: any[]) => mocks.platform(...args),
  tmpdir: (...args: any[]) => mocks.tmpdir(...args)
}))

vi.mock('child_process', () => ({
  __esModule: true,
  default: {
    exec: (...args: any[]) => mocks.exec(...args),
    execFile: (...args: any[]) => mocks.execFile(...args)
  },
  exec: (...args: any[]) => mocks.exec(...args),
  execFile: (...args: any[]) => mocks.execFile(...args)
}))

vi.mock('fs-extra', () => ({
  writeFile: (...args: any[]) => mocks.writeFile(...args),
  remove: (...args: any[]) => mocks.remove(...args)
}))

vi.mock('glob', () => ({
  __esModule: true,
  default: (...args: any[]) => mocks.glob(...args)
}))

vi.mock('../../config', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mocks.configGet(...args)
  }
}))

vi.mock('../../helper', () => ({
  mergeStreams: (...args: any[]) => mocks.mergeStreams(...args)
}))

async function loadRun () {
  vi.resetModules()
  return (await import('../run')).default
}

describe('server run module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.platform.mockReturnValue('linux')
    mocks.tmpdir.mockReturnValue('/tmp')
    mocks.configGet.mockReturnValue(false)
    mocks.writeFile.mockResolvedValue(undefined)
    mocks.remove.mockResolvedValue(undefined)
    mocks.glob.mockImplementation((_pattern: string, _options: any, cb: Function) => cb(null, ['/tmp/yn-run-a.py']))
    mocks.exec.mockImplementation(() => new mocks.MockProcess())
    mocks.execFile.mockImplementation(() => new mocks.MockProcess())
  })

  test('executes array commands with code appended and a normalized non-Windows environment', async () => {
    const run = await loadRun()
    const resultPromise = run.runCode({ cmd: 'python3', args: ['-c'] }, 'print(1)')
    const process = mocks.execFile.mock.results[0].value

    process.emit('spawn')

    await expect(resultPromise).resolves.toBe(mocks.mergeStreams.mock.results[0].value)
    expect(mocks.execFile).toHaveBeenCalledWith('python3', ['-c', 'print(1)'], expect.objectContaining({
      timeout: 300000,
      env: expect.objectContaining({
        PATH: expect.stringContaining('/usr/local/bin:')
      })
    }))
  })

  test('writes template code to a temporary file and removes matching files after output closes', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)
    const run = await loadRun()
    const resultPromise = run.runCode('python $tmpFile.py', 'print(2)')
    await Promise.resolve()
    const process = mocks.exec.mock.results[0].value

    process.emit('spawn')
    const output = mocks.mergeStreams.mock.results[0].value
    output.emit('close')

    await expect(resultPromise).resolves.toBe(output)
    expect(mocks.writeFile).toHaveBeenCalledWith('/tmp/yn-run-4fzzzxjylrx.py', 'print(2)')
    expect(mocks.exec.mock.calls[0][0]).toBe('python /tmp/yn-run-4fzzzxjylrx.py')
    expect(mocks.glob).toHaveBeenCalledWith('/tmp/yn-run-4fzzzxjylrx*', {}, expect.any(Function))
    expect(mocks.remove).toHaveBeenCalledWith('/tmp/yn-run-a.py')
    vi.mocked(Math.random).mockRestore()
  })

  test('returns process error messages instead of throwing', async () => {
    const run = await loadRun()
    const resultPromise = run.runCode('node bad.js', '')
    const process = mocks.exec.mock.results[0].value

    process.emit('error', new Error('not found'))

    await expect(resultPromise).resolves.toBe('not found')
  })

  test('uses wsl.exe for array commands on Windows when configured', async () => {
    mocks.platform.mockReturnValue('win32')
    mocks.configGet.mockReturnValue('Ubuntu')

    const run = await loadRun()
    const resultPromise = run.runCode({ cmd: 'python3', args: ['-c'] }, 'print(3)')
    const process = mocks.execFile.mock.results[0].value

    process.emit('spawn')

    await expect(resultPromise).resolves.toBe(mocks.mergeStreams.mock.results[0].value)
    expect(mocks.execFile).toHaveBeenCalledWith('wsl.exe', [
      '--distribution', 'Ubuntu', '--', 'python3', '-c', 'print(3)'
    ], expect.objectContaining({ timeout: 300000 }))
  })
})
