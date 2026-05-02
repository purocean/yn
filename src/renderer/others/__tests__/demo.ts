const themeMocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
}))

const storageMocks = vi.hoisted(() => ({
  clear: vi.fn(),
}))

const toastMocks = vi.hoisted(() => ({
  show: vi.fn(),
}))

const viewMocks = vi.hoisted(() => ({
  iframeWindow: { addEventListener: vi.fn() },
  getRenderIframe: vi.fn(async () => ({ contentWindow: viewMocks.iframeWindow })),
}))

async function loadDemo (flagDemo: boolean) {
  vi.resetModules()
  vi.doMock('@fe/support/args', () => ({
    FLAG_DEMO: flagDemo,
  }))
  vi.doMock('@fe/services/theme', () => themeMocks)
  vi.doMock('@fe/utils/storage', () => storageMocks)
  vi.doMock('@fe/support/ui/toast', () => ({
    useToast: () => toastMocks,
  }))
  vi.doMock('@fe/services/view', () => viewMocks)
  vi.doMock('@fe/services/i18n', () => ({
    t: (key: string) => key,
  }))

  return await import('@fe/others/demo')
}

describe('demo mode bootstrap', () => {
  let originalFetch: typeof window.fetch
  let originalOpen: typeof window.open
  let baseFetch: ReturnType<typeof vi.fn>
  let baseOpen: ReturnType<typeof vi.fn>

  beforeEach(() => {
    originalFetch = window.fetch
    originalOpen = window.open
    baseFetch = vi.fn(async (uri: string) => ({
      text: async () => `# Loaded ${uri}`,
      json: async () => [{ id: 'extension' }],
    }))
    baseOpen = vi.fn(() => ({}))
    window.fetch = baseFetch as any
    window.open = baseOpen as any
    vi.clearAllMocks()
  })

  afterEach(() => {
    window.fetch = originalFetch
    window.open = originalOpen
    vi.doUnmock('@fe/support/args')
    vi.doUnmock('@fe/services/theme')
    vi.doUnmock('@fe/utils/storage')
    vi.doUnmock('@fe/support/ui/toast')
    vi.doUnmock('@fe/services/view')
    vi.doUnmock('@fe/services/i18n')
  })

  test('does nothing when demo mode is disabled', async () => {
    await loadDemo(false)

    expect(storageMocks.clear).not.toHaveBeenCalled()
    expect(themeMocks.setTheme).not.toHaveBeenCalled()
    expect(window.fetch).toBe(baseFetch)
    expect(window.open).toBe(baseOpen)
  })

  test('installs fake demo fetch handlers and local window opener', async () => {
    await loadDemo(true)

    expect(storageMocks.clear).toHaveBeenCalled()
    expect(themeMocks.setTheme).toHaveBeenCalledWith('dark')
    expect(viewMocks.getRenderIframe).toHaveBeenCalled()

    await expect(window.fetch('/api/settings', undefined as any).then(res => res.json())).resolves.toMatchObject({
      status: 'ok',
      data: expect.objectContaining({ shell: 'bash' }),
    })

    await expect(window.fetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ shell: 'zsh' }),
    } as any).then(res => res.json())).resolves.toMatchObject({
      data: expect.objectContaining({ shell: 'zsh' }),
    })

    await expect(window.fetch('/api/tree', undefined as any).then(res => res.json())).resolves.toMatchObject({
      status: 'ok',
      data: expect.any(Array),
    })
    await expect(window.fetch('/api/history/list', undefined as any).then(res => res.json())).resolves.toMatchObject({
      data: expect.arrayContaining([expect.objectContaining({ name: '2022-01-01 12-12-00.md' })]),
    })
    await expect(window.fetch('/api/history/content?version=v1', undefined as any).then(res => res.json())).resolves.toMatchObject({
      data: 'v1\nA\nB',
    })
    await expect(window.fetch('/api/mark', { method: 'POST' } as any).then(res => res.json())).resolves.toMatchObject({
      status: 'ok',
      data: {},
    })
    await expect(window.fetch('/api/repositories', undefined as any).then(res => res.json())).resolves.toMatchObject({
      data: { test: '/test' },
    })
    await expect(window.fetch('/api/help?path=Reveal-js.md', undefined as any).then(res => res.json())).resolves.toMatchObject({
      data: expect.objectContaining({ content: expect.stringContaining('Reveal.js') }),
    })
    await expect(window.fetch('/api/help?path=Markmap.md', undefined as any).then(res => res.json())).resolves.toMatchObject({
      data: expect.objectContaining({ content: expect.stringContaining('markmap') }),
    })
    await expect(window.fetch('/api/help?path=_FRAGMENT.md', undefined as any).then(res => res.json())).resolves.toMatchObject({
      data: expect.objectContaining({ content: expect.stringContaining('Content from a fragment') }),
    })
    await expect(window.fetch('/api/file?path=Project.luckysheet', undefined as any).then(res => res.json())).resolves.toMatchObject({
      data: expect.objectContaining({ content: expect.stringContaining('Sheet1') }),
    })
    await expect(window.fetch('/api/file?path=Drawio.drawio', undefined as any).then(res => res.json())).resolves.toMatchObject({
      data: expect.objectContaining({ content: expect.stringContaining('<mxfile') }),
    })
    await expect(window.fetch('/api/file', { method: 'POST' } as any).then(res => res.json())).resolves.toMatchObject({
      status: 'ok',
    })
    await expect(window.fetch('/api/extensions', undefined as any).then(res => res.json())).resolves.toMatchObject({
      data: [{ id: 'extension' }],
    })
    await expect(window.fetch('/extensions/pkg/package.json', undefined as any).then(res => res.json())).resolves.toEqual([{ id: 'extension' }])
    await expect(window.fetch('/extensions/pkg/README.md', undefined as any).then(res => res.text())).resolves.toBe('# Loaded /extensions/pkg/README.md')

    await expect(window.fetch('/api/help?doc=CACHED.md', undefined as any).then(res => res.json())).resolves.toMatchObject({
      data: expect.objectContaining({ content: expect.any(String) }),
    })
    await expect(window.fetch('/api/help?doc=CACHED.md', undefined as any).then(res => res.json())).resolves.toMatchObject({
      data: expect.objectContaining({ content: expect.stringContaining('# Loaded /CACHED.md') }),
    })
    await expect(window.fetch('/api/help', undefined as any).then(res => res.json())).resolves.toMatchObject({
      data: expect.objectContaining({ content: expect.stringContaining('demo-tips') }),
    })

    await window.fetch('https://example.com/remote.json', undefined as any)
    expect(baseFetch).toHaveBeenCalledWith('https://example.com/remote.json', undefined)

    const opened = window.open('/child') as any
    expect(baseOpen).toHaveBeenCalledWith('/child')
    expect(opened.fetch).toBe(window.fetch)

    await expect(window.fetch('/api/unknown', undefined as any).then(res => res.json())).resolves.toMatchObject({
      status: 'error',
      message: 'demo-tips',
    })
    expect(toastMocks.show).toHaveBeenCalledWith('warning', 'demo-tips')
  })

  test('handles demo image errors for plantuml and help assets', async () => {
    await loadDemo(true)

    const img = document.createElement('img')
    img.src = `${location.origin}/api/plantuml?code=x`
    const plantumlEvent = new ErrorEvent('error')
    Object.defineProperty(plantumlEvent, 'target', { value: img })
    window.dispatchEvent(plantumlEvent)
    expect(img.src).toContain('data:image/png;base64,')

    const helpImg = document.createElement('img')
    helpImg.src = `${location.origin}/api/help?path=./assets/a.png`
    const helpEvent = new ErrorEvent('error')
    Object.defineProperty(helpEvent, 'target', { value: helpImg })
    window.dispatchEvent(helpEvent)
    expect(helpImg.src).toBe(`${location.origin}/assets/a.png`)
  })
})
