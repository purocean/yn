const mocks = vi.hoisted(() => ({
  sleep: vi.fn(() => Promise.resolve()),
  createdObjectUrls: [] as string[],
  revokedObjectUrls: [] as string[],
  workers: [] as any[],
}))

vi.mock('@fe/utils', () => ({
  sleep: mocks.sleep,
}))

import codeRunners from '../code-runners'

function createCtx () {
  const runners: any[] = []
  const completions: any[] = []
  return {
    editor: {
      tapSimpleCompletionItems: vi.fn((fn: any) => fn(completions)),
    },
    i18n: {
      t: vi.fn((key: string, value?: string) => `${key}:${value || ''}`),
    },
    runner: {
      registerRunner: vi.fn((runner: any) => runners.push(runner)),
    },
    _completions: completions,
    _runners: runners,
  } as any
}

describe('code-runners plugin', () => {
  beforeEach(() => {
    mocks.createdObjectUrls.length = 0
    mocks.revokedObjectUrls.length = 0
    mocks.workers.length = 0
    document.body.innerHTML = ''
    ;(window as any).ctx = { ui: { useToast: vi.fn() } }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (window as any).ctx
  })

  test('registers javascript and script runners plus markdown completions', () => {
    const ctx = createCtx()

    codeRunners.register(ctx)

    expect(ctx.runner.registerRunner).toHaveBeenCalledTimes(2)
    expect(ctx._runners.map((runner: any) => runner.name)).toEqual(['javascript', '_scripts'])
    expect(ctx._runners[0].match('JavaScript')).toBe(true)
    expect(ctx._runners[0].match('ts')).toBe(false)
    expect(ctx._runners[1].match('python')).toBe(true)
    expect(ctx._runners[1].match('ruby')).toBe(false)
    expect(ctx._completions.map((item: any) => item.label)).toEqual([
      '/ ``` Run Code (JavaScript)',
      '/ ``` Run Code (JavaScript - No Worker)',
      '/ ``` Run Code (Bash)',
      '/ ``` Run Code (C)',
    ])
  })

  test('script runner returns install extension link without invoking external processes', async () => {
    const ctx = createCtx()
    codeRunners.register(ctx)

    await expect(ctx._runners[1].run()).resolves.toEqual({
      type: 'html',
      value: expect.stringContaining('@yank-note/extension-code-runner'),
    })
    expect(ctx._runners[1].getTerminalCmd()).toBeNull()
  })

  test('javascript no-worker runner executes inside a hidden iframe and flushes html console output until abort', async () => {
    const ctx = createCtx()
    codeRunners.register(ctx)
    const controller = new AbortController()
    const flush = vi.fn()

    const runPromise = ctx._runners[0].run('js', [
      '// --run-- --no-worker-- --output-html--',
      'console.log("<b>hello</b>", { ok: true })',
    ].join('\n'), {
      signal: controller.signal,
      flusher: flush,
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(document.getElementById('code-runner-javascript-vm')).toBeTruthy()
    expect(flush).toHaveBeenCalledWith('html', '<b>hello</b> {"ok":true}\n')

    controller.abort()
    await expect(runPromise).resolves.toBeNull()
    expect(document.getElementById('code-runner-javascript-vm')).toBeNull()
  })

  test('javascript worker runner posts code to a worker, flushes output and terminates on abort', async () => {
    class FakeWorker {
      onmessage: ((event: any) => void) | null = null
      postMessage = vi.fn(() => {
        this.onmessage?.({ data: { type: 'output', value: 'worker log\n' } })
        this.onmessage?.({ data: { type: 'error', value: 'worker error' } })
        this.onmessage?.({ data: { type: 'done', value: '' } })
      })

      terminate = vi.fn()

      constructor (public url: string) {
        mocks.workers.push(this)
      }
    }

    vi.stubGlobal('Worker', FakeWorker)
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      const url = `blob:${(blob as Blob).size}`
      mocks.createdObjectUrls.push(url)
      return url
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => {
      mocks.revokedObjectUrls.push(url)
    })
    vi.spyOn(Atomics, 'wait').mockImplementation(() => 'ok')
    vi.spyOn(Atomics, 'notify').mockImplementation(() => 1)

    const ctx = createCtx()
    codeRunners.register(ctx)
    const controller = new AbortController()
    const flush = vi.fn()

    const runPromise = ctx._runners[0].run('javascript', '// --run--\nconsole.log("x")', {
      signal: controller.signal,
      flusher: flush,
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(mocks.createdObjectUrls[0]).toMatch(/^blob:/)
    expect(mocks.revokedObjectUrls).toEqual(mocks.createdObjectUrls)
    expect(mocks.workers[0].postMessage).toHaveBeenCalledWith(expect.objectContaining({
      code: '// --run--\nconsole.log("x")',
    }))
    expect(flush).toHaveBeenCalledWith('plain', 'worker log\n')
    expect(flush).toHaveBeenCalledWith('plain', 'worker error')
    expect(flush).toHaveBeenCalledWith('plain', '')

    controller.abort()
    await expect(runPromise).resolves.toBeNull()
    expect(mocks.workers[0].terminate).toHaveBeenCalled()
  })
})
