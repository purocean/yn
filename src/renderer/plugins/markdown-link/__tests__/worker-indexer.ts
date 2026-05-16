const mocks = vi.hoisted(() => ({
  convertResourceState: vi.fn(() => true),
}))

vi.mock('../lib', () => ({
  convertResourceState: mocks.convertResourceState,
}))

describe('markdown-link worker indexer', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  test('registers resource conversion rule and disables link validation', async () => {
    let rule: Function | undefined
    const md = {
      core: {
        ruler: {
          push: vi.fn((_name: string, fn: Function) => {
            rule = fn
          }),
        },
      },
      validateLink: vi.fn(() => false),
    }
    const ctx = {
      markdown: {
        use: vi.fn((fn: Function) => fn(md)),
      },
    }
    vi.stubGlobal('self', { ctx })

    await import('../worker-indexer')

    expect(ctx.markdown.use).toHaveBeenCalledWith(expect.any(Function))
    expect(md.core.ruler.push).toHaveBeenCalledWith('convert-relative-path', expect.any(Function))
    expect(md.validateLink('javascript:alert(1)')).toBe(true)

    const state = { env: { file: { repo: 'repo', path: '/a.md' } } }
    expect(rule!(state)).toBe(true)
    expect(mocks.convertResourceState).toHaveBeenCalledWith(state.env.file, state)
  })
})
