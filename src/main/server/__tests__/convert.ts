const mocks = vi.hoisted(() => {
  const EventEmitter = require('node:events')

  class MockProcess extends EventEmitter {
    stderr = new EventEmitter()
    stdin = {
      write: vi.fn(),
      end: vi.fn()
    }
  }

  return {
    currentProcess: null as InstanceType<typeof MockProcess> | null,
    MockProcess,
    platform: vi.fn(() => 'linux'),
    spawn: vi.fn(),
    tmpdir: vi.fn(() => '/tmp'),
    readFile: vi.fn(),
    unlink: vi.fn()
  }
})

vi.mock('os', () => ({
  platform: (...args: any[]) => mocks.platform(...args),
  tmpdir: (...args: any[]) => mocks.tmpdir(...args)
}))

vi.mock('child_process', () => ({
  __esModule: true,
  default: {
    spawn: (...args: any[]) => mocks.spawn(...args)
  },
  spawn: (...args: any[]) => mocks.spawn(...args)
}))

vi.mock('fs-extra', () => ({
  readFile: (...args: any[]) => mocks.readFile(...args),
  unlink: (...args: any[]) => mocks.unlink(...args)
}))

vi.mock('../../constant', () => ({
  BIN_DIR: '/app/bin',
  PANDOC_REFERENCE_FILE: 'reference.docx',
  RESOURCES_DIR: '/app/resources',
  USER_DIR: '/user'
}))

async function loadConvert () {
  vi.resetModules()
  return (await import('../convert')).default
}

describe('server convert module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-02T00:00:00Z'))
    mocks.platform.mockReturnValue('linux')
    mocks.tmpdir.mockReturnValue('/tmp')
    mocks.readFile.mockResolvedValue(Buffer.from('converted'))
    mocks.unlink.mockResolvedValue(undefined)
    mocks.spawn.mockImplementation(() => {
      mocks.currentProcess = new mocks.MockProcess()
      return mocks.currentProcess
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('spawns pandoc with the expected arguments and returns the generated file', async () => {
    const convert = await loadConvert()
    const resultPromise = convert('# Title', 'markdown', 'docx', '/repo/assets')

    expect(mocks.spawn).toHaveBeenCalledWith('/app/bin/linux-pandoc-2.14.2', [
      '--self-contained',
      '--lua-filter', '/app/resources/pandoc-filter.lua',
      '--resource-path', '/repo/assets',
      '-f', 'markdown',
      '-o', '/tmp/yn_convert_1777680000000.docx',
      '--reference-doc', '/user/reference.docx'
    ], {
      env: expect.objectContaining({
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8'
      })
    })
    expect(mocks.currentProcess?.stdin.write).toHaveBeenCalledWith('# Title')
    expect(mocks.currentProcess?.stdin.end).toHaveBeenCalled()

    mocks.currentProcess?.emit('close', 0)

    await expect(resultPromise).resolves.toEqual(Buffer.from('converted'))
    expect(mocks.readFile).toHaveBeenCalledWith('/tmp/yn_convert_1777680000000.docx')
    expect(mocks.unlink).toHaveBeenCalledWith('/tmp/yn_convert_1777680000000.docx')
  })

  test('rejects with pandoc stderr when the process exits non-zero', async () => {
    const convert = await loadConvert()
    const resultPromise = convert('bad', 'markdown', 'html', '/repo')

    mocks.currentProcess?.stderr.emit('data', Buffer.from('pandoc failed'))
    mocks.currentProcess?.emit('close', 2)

    await expect(resultPromise).rejects.toThrow('pandoc failed')
  })

  test('rejects when spawn emits an error', async () => {
    const convert = await loadConvert()
    const resultPromise = convert('bad', 'markdown', 'html', '/repo')

    mocks.currentProcess?.emit('error', new Error('spawn failed'))

    await expect(resultPromise).rejects.toThrow('spawn failed')
  })
})
