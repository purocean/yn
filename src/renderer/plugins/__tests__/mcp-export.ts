vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

const bridgeName = '__YANK_NOTE_MCP_EXPORT__'

import mcpExport from '../mcp-export'

function createCtx (args: Record<string, string | undefined> = { 'mcp-export': 'true' }) {
  const argMap = new Map(Object.entries(args).filter(([, value]) => value !== undefined) as [string, string][])
  const hooks = new Map<string, Function>()
  const ctx = {
    args: {
      $args: vi.fn(() => argMap),
    },
    doc: {
      switchDoc: vi.fn(async () => undefined),
      switchDocByPath: vi.fn(async () => undefined),
    },
    env: {
      isElectron: true,
    },
    export: {
      convertCurrentDocument: vi.fn(async (opts: any) => new Blob([JSON.stringify(opts)], { type: 'text/html' })),
      printCurrentDocumentToPDF: vi.fn(async (opts: any) => new Uint8Array([1, 2, opts.landscape ? 3 : 4])),
    },
    lib: {
      mime: {
        getType: vi.fn(() => 'application/octet-stream'),
      },
    },
    registerHook: vi.fn((name: string, fn: Function) => {
      hooks.set(name, fn)
      fn()
    }),
    removeHook: vi.fn((name: string, fn: Function) => {
      if (hooks.get(name) === fn) {
        hooks.delete(name)
      }
    }),
    store: {
      state: {
        currentFile: { repo: 'repo-a', path: '/notes/current.md', name: 'current.md' },
      },
    },
    utils: {
      fileToBase64URL: vi.fn(async (blob: Blob) => `data:${blob.type};base64,ZXhwb3J0`),
      sleep: vi.fn(() => Promise.resolve()),
    },
    view: {
      getRenderIframe: vi.fn(async () => ({ contentDocument: undefined })),
      renderImmediately: vi.fn(),
    },
    whenExtensionInitialized: vi.fn(async () => undefined),
  } as any

  return ctx
}

describe('mcp-export plugin', () => {
  beforeEach(() => {
    delete (window as any)[bridgeName]
  })

  afterEach(() => {
    delete (window as any)[bridgeName]
    vi.restoreAllMocks()
  })

  test('does not expose the bridge outside electron mcp-export mode', () => {
    const ctx = createCtx({ 'mcp-export': 'false' })
    mcpExport.register(ctx)
    expect((window as any)[bridgeName]).toBeUndefined()

    ctx.env.isElectron = false
    ctx.args.$args.mockReturnValue(new Map([['mcp-export', 'true']]))
    mcpExport.register(ctx)
    expect((window as any)[bridgeName]).toBeUndefined()
  })

  test('exports the current document as html after switching by absolute path', async () => {
    const ctx = createCtx({
      'mcp-export': 'true',
      'mcp-export-absolute-path': '/abs/doc.md',
    })
    mcpExport.register(ctx)

    const result = await (window as any)[bridgeName]({
      fromType: 'html',
      toType: 'html',
      fromHtmlOptions: { inlineStyle: true, codeCopyButton: false },
    }, { renderTimeout: 5, resourceTimeout: 10 })

    expect(ctx.whenExtensionInitialized).toHaveBeenCalled()
    expect(ctx.doc.switchDocByPath).toHaveBeenCalledWith('/abs/doc.md')
    expect(ctx.registerHook).toHaveBeenCalledWith('VIEW_RENDERED', expect.any(Function), true)
    expect(ctx.view.renderImmediately).toHaveBeenCalled()
    expect(ctx.export.convertCurrentDocument).toHaveBeenCalledWith(expect.objectContaining({
      fromType: 'html',
      toType: 'html',
      fromHtmlOptions: expect.objectContaining({
        inlineLocalImage: true,
        inlineStyle: true,
        codeCopyButton: false,
      }),
    }))
    expect(result).toEqual({
      fileName: 'current.html',
      mimeType: 'text/html',
      size: expect.any(Number),
      base64: 'ZXhwb3J0',
    })
  })

  test('waits for preview resources and falls back when exported blob has no mime type', async () => {
    const ctx = createCtx()
    const previewDocument = document.implementation.createHTMLDocument('preview')
    const image = previewDocument.createElement('img')
    Object.defineProperty(image, 'complete', { value: false })
    const iframe = previewDocument.createElement('iframe')
    Object.defineProperty(iframe, 'contentDocument', {
      get () {
        throw new Error('cross origin')
      },
    })
    previewDocument.body.append(image, iframe)
    ctx.view.getRenderIframe.mockResolvedValue({ contentDocument: previewDocument })
    ctx.export.convertCurrentDocument.mockResolvedValue(new Blob(['plain']))
    ctx.lib.mime.getType.mockReturnValue(undefined)
    mcpExport.register(ctx)

    const result = await (window as any)[bridgeName]({
      fromType: 'markdown',
      toType: 'md',
    }, { renderTimeout: 1, resourceTimeout: 0 })

    expect(ctx.view.getRenderIframe).toHaveBeenCalled()
    expect(ctx.export.convertCurrentDocument).toHaveBeenCalledWith(expect.objectContaining({
      fromType: 'markdown',
      toType: 'md',
      fromHtmlOptions: undefined,
    }))
    expect(ctx.lib.mime.getType).toHaveBeenCalledWith('current.md')
    expect(result.mimeType).toBe('application/octet-stream')
  })

  test('switches by repo path and merges default pdf options', async () => {
    const ctx = createCtx({
      'mcp-export': 'true',
      'mcp-export-repo': 'repo-a',
      'mcp-export-path': '/notes/report.md',
    })
    mcpExport.register(ctx)

    const result = await (window as any)[bridgeName]({
      toType: 'pdf',
      pdfOptions: { landscape: true, scale: 0.8 },
    }, { imageTimeout: 1 })

    expect(ctx.doc.switchDoc).toHaveBeenCalledWith({
      type: 'file',
      repo: 'repo-a',
      path: '/notes/report.md',
      name: 'report.md',
    }, { force: true })
    expect(ctx.export.printCurrentDocumentToPDF).toHaveBeenCalledWith(expect.objectContaining({
      landscape: true,
      pageSize: 'A4',
      scale: 0.8,
      printBackground: true,
    }), { hidden: true })
    expect(ctx.export.convertCurrentDocument).not.toHaveBeenCalled()
    expect(result.fileName).toBe('current.pdf')
    expect(result.mimeType).toBe('application/pdf')
    expect(result.base64).toBe('ZXhwb3J0')
  })

  test('throws for invalid target args and missing current file', async () => {
    const missingRepo = createCtx({
      'mcp-export': 'true',
      'mcp-export-path': '/notes/report.md',
    })
    mcpExport.register(missingRepo)
    await expect((window as any)[bridgeName]({ toType: 'html' })).rejects.toThrow('repo is required')

    const noFile = createCtx()
    noFile.store.state.currentFile = null
    mcpExport.register(noFile)
    await expect((window as any)[bridgeName]({ toType: 'html' })).rejects.toThrow('No current file.')
  })
})
