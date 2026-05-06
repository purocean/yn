const mocks = vi.hoisted(() => ({
  state: {
    showExport: false,
    currentFile: null as any,
  },
  hooks: [] as any[],
  triggerHook: vi.fn(async () => undefined),
  iframe: null as any,
  contentHtml: vi.fn(),
  previewStyles: vi.fn(() => '.markdown-body { color: red; }'),
  headings: vi.fn(() => [] as any[]),
  renderEnv: vi.fn(() => ({ attributes: {} })),
  convertFile: vi.fn(),
  getRepo: vi.fn(),
  isElectron: true,
  isWindows: false,
  openWindow: vi.fn(),
  remote: null as any,
}))

vi.mock('lodash-es', async importOriginal => ({
  ...await importOriginal<typeof import('lodash-es')>(),
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/support/embed', () => ({
  buildSrc: (html: string, title: string, options: any) => `yn://built?title=${encodeURIComponent(title)}&_id=${options.id}&html=${encodeURIComponent(html)}`,
}))

vi.mock('@fe/support/env', () => ({
  getElectronRemote: () => mocks.remote,
  get isElectron () {
    return mocks.isElectron
  },
  get isWindows () {
    return mocks.isWindows
  },
  openWindow: mocks.openWindow,
}))

vi.mock('@fe/support/store', () => ({
  default: { state: mocks.state },
}))

vi.mock('@fe/utils', () => ({
  sleep: vi.fn(() => Promise.resolve()),
}))

vi.mock('@fe/support/api', () => ({
  convertFile: mocks.convertFile,
}))

vi.mock('@fe/services/repo', () => ({
  getRepo: mocks.getRepo,
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string) => key,
}))

vi.mock('@fe/services/view', () => ({
  getContentHtml: mocks.contentHtml,
  getHeadings: mocks.headings,
  getPreviewStyles: mocks.previewStyles,
  getRenderEnv: mocks.renderEnv,
  getRenderIframe: vi.fn(async () => mocks.iframe),
}))

import {
  convertCurrentDocument,
  printCurrentDocument,
  printCurrentDocumentToPDF,
  toggleExportPanel,
} from '@fe/services/export'

async function flushPromises (count = 10) {
  for (let i = 0; i < count; i++) {
    await Promise.resolve()
  }
}

function makeIframe () {
  const iframeDocument = document.implementation.createHTMLDocument('preview')
  iframeDocument.head.innerHTML = '<style>.x { color: red; }</style>'
  iframeDocument.body.innerHTML = '<div id="app"><article>Preview</article></div>'
  mocks.iframe = {
    contentDocument: iframeDocument,
    contentWindow: {
      print: vi.fn(),
    },
  }
  return mocks.iframe
}

beforeEach(() => {
  mocks.state.showExport = false
  mocks.state.currentFile = null
  mocks.hooks = []
  mocks.triggerHook.mockClear()
  mocks.contentHtml.mockReset()
  mocks.previewStyles.mockClear()
  mocks.headings.mockReset()
  mocks.renderEnv.mockReset()
  mocks.renderEnv.mockReturnValue({ attributes: {} })
  mocks.convertFile.mockReset()
  mocks.getRepo.mockReset()
  mocks.isElectron = true
  mocks.isWindows = false
  mocks.openWindow.mockReset()
  mocks.remote = null
  makeIframe()
})

test('toggles export panel visibility', () => {
  toggleExportPanel()
  expect(mocks.state.showExport).toBe(true)

  toggleExportPanel(false)
  expect(mocks.state.showExport).toBe(false)
})

test('prints current document inside export hooks', async () => {
  await printCurrentDocument()
  await vi.waitFor(() => {
    expect(mocks.iframe.contentWindow.print).toHaveBeenCalledTimes(1)
  })
  await flushPromises()

  expect(mocks.triggerHook).toHaveBeenNthCalledWith(1, 'EXPORT_BEFORE_PREPARE', { type: 'print' }, { breakable: true })
  expect(mocks.triggerHook).toHaveBeenCalledWith('EXPORT_AFTER_PREPARE', { type: 'print' })
})

test('exports html directly with title escaping, toc, styles, and iframe replacement', async () => {
  mocks.state.currentFile = {
    repo: 'notes',
    name: 'a<b>.md',
    path: '/a.md',
    absolutePath: '/repo/a.md',
    content: '# A',
  }
  mocks.contentHtml.mockImplementation(async (options: any) => {
    const container = document.createElement('div')
    container.innerHTML = '<article><iframe src="./local.html"></iframe><pre><code>plain</code></pre></article>'
    container.querySelectorAll<HTMLElement>('*').forEach(node => options.nodeProcessor?.(node))
    return container.innerHTML
  })
  mocks.headings.mockReturnValue([{ level: 0, sourceLine: 1, id: 'intro', text: 'Intro' }])
  mocks.renderEnv.mockReturnValue({ attributes: { headingNumber: true } })

  const blob = await convertCurrentDocument({
    fromType: 'html',
    toType: 'html',
    fromHtmlOptions: { includeStyle: true, includeToc: [0], inlineStyle: false, codeCopyButton: true },
  } as any)
  const html = await blob.text()

  expect(blob.type).toBe('text/html')
  expect(html).toContain('<title>a&lt;b&gt;</title>')
  expect(html).toContain('This iframe is not supported in export.')
  expect(html).toContain('#yn-article-toc')
  expect(html).toContain('copy-code')
  expect(html).toContain('.markdown-body { color: red; }')
  expect(mocks.triggerHook).toHaveBeenCalledWith('EXPORT_AFTER_PREPARE', { type: 'html' })
})

test('converts markdown through api with repo and document resource paths', async () => {
  mocks.state.currentFile = {
    repo: 'notes',
    name: 'a.md',
    path: '/dir/a.md',
    absolutePath: '/repo/dir/a.md',
    content: '# Markdown',
  }
  mocks.getRepo.mockReturnValue({ path: '/repo' })
  mocks.convertFile.mockResolvedValue({
    status: 200,
    blob: vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })),
  })

  const blob = await convertCurrentDocument({ fromType: 'markdown', toType: 'pdf' } as any)

  expect(await blob.text()).toBe('pdf')
  expect(mocks.convertFile).toHaveBeenCalledWith('# Markdown', 'markdown', 'pdf', '/repo:/repo/dir')
})

test('normalizes html before non-html conversion and reports failed api status', async () => {
  mocks.state.currentFile = {
    repo: 'notes',
    name: 'a.md',
    path: '/dir/a.md',
    absolutePath: '/repo/dir/a.md',
    content: '# Markdown',
  }
  mocks.contentHtml.mockImplementation(async (options: any) => {
    const container = document.createElement('div')
    container.innerHTML = '<pre data-lang="ts"></pre><span class="katex-html">math</span><iframe src="local.html"></iframe>'
    container.querySelectorAll<HTMLElement>('*').forEach(node => options.nodeProcessor?.(node))
    return container.innerHTML
  })
  mocks.convertFile.mockResolvedValue({ status: 500, statusText: 'pandoc failed' })

  await expect(convertCurrentDocument({ fromType: 'html', toType: 'docx' } as any)).rejects.toThrow('pandoc failed')

  const source = mocks.convertFile.mock.calls[0][0]
  expect(source).toContain('sourceCode')
  expect(source).not.toContain('katex-html')
  expect(source).toContain('This iframe is not supported in export.')
})

test('rejects conversion without a current file and failed pdf window creation', async () => {
  await expect(convertCurrentDocument({ fromType: 'markdown', toType: 'pdf' } as any)).rejects.toThrow('No current file.')
  mocks.openWindow.mockReturnValue(null)
  await expect(printCurrentDocumentToPDF()).rejects.toThrow('Open window failed.')
})

test('prints pdf in electron window and destroys temporary browser window', async () => {
  mocks.isElectron = true
  const browserWin = { setParentWindow: vi.fn(), destroy: vi.fn(), getURL: () => 'yn://built?_id=__export_pdf__123' }
  const webContents = { getURL: () => 'yn://built?_id=__export_pdf__123', printToPDF: vi.fn(async () => Buffer.from('pdf')) }
  mocks.remote = {
    BrowserWindow: { getAllWindows: () => [browserWin] },
    getCurrentWindow: vi.fn(() => ({ id: 1 })),
    webContents: { getAllWebContents: () => [webContents] },
  }

  let loadHandler: any
  const exportWindow = {
    document: document.implementation.createHTMLDocument('export'),
    addEventListener: vi.fn((name: string, handler: any) => {
      if (name === 'load') loadHandler = handler
    }),
  }
  exportWindow.document.body.innerHTML = '<div id="app"></div>'
  mocks.openWindow.mockReturnValue(exportWindow)
  vi.spyOn(Date, 'now').mockReturnValue(123)

  const promise = printCurrentDocumentToPDF({ landscape: true } as any, { hidden: true })
  await vi.waitFor(() => expect(mocks.openWindow).toHaveBeenCalled())
  expect(loadHandler).toEqual(expect.any(Function))
  await loadHandler()

  await expect(promise).resolves.toEqual(Buffer.from('pdf'))
  expect(webContents.printToPDF).toHaveBeenCalledWith({ landscape: true })
  expect(browserWin.destroy).toHaveBeenCalledTimes(1)
})
