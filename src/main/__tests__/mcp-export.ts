const mocks = vi.hoisted(() => ({
  buildAppUrl: vi.fn(),
  configGet: vi.fn(),
  destroy: vi.fn(),
  executeJavaScript: vi.fn(),
  getAction: vi.fn(),
  loadURL: vi.fn(),
  outputFile: vi.fn(),
  onceHandlers: {} as Record<string, Function>,
}))

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(function BrowserWindow (this: any, options: any) {
    this.options = options
    this.webContents = {
      once: (event: string, handler: Function) => {
        mocks.onceHandlers[event] = handler
      },
      executeJavaScript: (...args: any[]) => mocks.executeJavaScript(...args),
    }
    this.loadURL = (...args: any[]) => mocks.loadURL(...args)
    this.destroy = (...args: any[]) => mocks.destroy(...args)
  }),
}))

vi.mock('fs-extra', () => ({
  outputFile: (...args: any[]) => mocks.outputFile(...args),
}))

vi.mock('mime', () => ({
  getType: vi.fn(() => 'application/pdf'),
}))

vi.mock('../config', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mocks.configGet(...args),
  }
}))

vi.mock('../action', () => ({
  getAction: (...args: any[]) => mocks.getAction(...args),
}))

vi.mock('../url', () => ({
  buildAppUrl: (...args: any[]) => mocks.buildAppUrl(...args),
}))

async function loadMcpExport () {
  vi.resetModules()
  return await import('../mcp-export')
}

describe('main mcp-export module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.onceHandlers = {}
    mocks.buildAppUrl.mockReturnValue('yank-note://localhost:?mcp-export=true')
    mocks.configGet.mockImplementation((_key: string, defaultValue: any) => defaultValue)
    mocks.getAction.mockImplementation((name: string) => ({
      'get-url-mode': () => 'dev',
      'get-backend-port': () => 1234,
      'get-dev-frontend-port': () => 5678,
    } as Record<string, Function>)[name])
    mocks.loadURL.mockImplementation(async () => {
      mocks.onceHandlers['did-finish-load']?.()
    })
    mocks.executeJavaScript
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce({
        fileName: 'out.pdf',
        base64: Buffer.from('pdf body').toString('base64'),
      })
  })

  test('loads an invisible export window and writes output when outputPath is provided', async () => {
    const { exportDocumentForMcp } = await loadMcpExport()

    await expect(exportDocumentForMcp({
      repo: 'main',
      path: '/note.md',
      options: { fromType: 'markdown', toType: 'pdf' },
      outputPath: '/tmp/out.pdf',
      renderTimeout: 500,
      imageTimeout: 600,
      resourceTimeout: 700,
    })).resolves.toMatchObject({
      fileName: 'out.pdf',
      mimeType: 'application/pdf',
      base64: undefined,
      outputPath: '/tmp/out.pdf',
    })

    expect(mocks.buildAppUrl).toHaveBeenCalledWith({
      mode: 'dev',
      backendPort: 1234,
      devFrontendPort: 5678,
      includeArgParams: false,
      extraSearchParams: {
        'mcp-export': 'true',
        'mcp-export-repo': 'main',
        'mcp-export-path': '/note.md',
        'mcp-export-absolute-path': undefined,
      },
    })
    expect(mocks.outputFile).toHaveBeenCalledWith('/tmp/out.pdf', Buffer.from('pdf body'))
    expect(mocks.destroy).toHaveBeenCalled()
  })

  test('rejects missing input path and destroys failed windows', async () => {
    const { exportDocumentForMcp } = await loadMcpExport()

    await expect(exportDocumentForMcp({
      options: { fromType: 'markdown', toType: 'html' },
    } as any)).rejects.toThrow('Either absolutePath or both repo and path are required.')

    mocks.loadURL.mockImplementationOnce(async () => {
      mocks.onceHandlers['did-fail-load']?.(null, -1, 'load failed')
    })
    await expect(exportDocumentForMcp({
      absolutePath: '/note.md',
      options: { fromType: 'markdown', toType: 'html' },
    })).rejects.toThrow('load failed')
    expect(mocks.destroy).toHaveBeenCalled()
  })
})
