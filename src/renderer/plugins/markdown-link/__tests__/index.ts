const mocks = vi.hoisted(() => {
  const defaultToastShow = vi.fn()
  const defaultCtx = {
    doc: {
      switchDoc: vi.fn(),
    },
    routines: {
      changePosition: vi.fn(),
    },
    ui: {
      useToast: vi.fn(() => ({ show: defaultToastShow })),
    },
  }

  return {
    defaultCtx,
    defaultToastShow,
    fetchTree: vi.fn(),
    getAttachmentURL: vi.fn((file: any) => `asset://${file.repo}${file.path}`),
    getAvailableCustomEditors: vi.fn(),
    getRenderEnv: vi.fn(),
    getRepo: vi.fn(),
    openExternal: vi.fn(),
    openPath: vi.fn(),
    toastShow: vi.fn(),
    currentFile: { repo: 'repo-a', path: '/notes/current.md', name: 'current.md' } as any,
    currentRepo: { name: 'repo-a' } as any,
    isElectron: true,
    isWindows: false,
    tree: [] as any[],
  }
})

vi.mock('@fe/context', () => ({
  default: mocks.defaultCtx,
  Plugin: class {},
}))

vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: {
    LOCAL_IMAGE: 'data-local-image',
    ORIGIN_SRC: 'data-origin-src',
    SOURCE_LINE_END: 'data-source-line-end',
    SOURCE_LINE_START: 'data-source-line-start',
    TARGET_PATH: 'data-target-path',
    TARGET_REPO: 'data-target-repo',
    WIKI_LINK: 'data-wiki-link',
  },
  DOM_CLASS_NAME: {
    MARK_OPEN: 'mark-open',
  },
  RESOURCE_TAG_NAMES: ['img', 'audio', 'video', 'source'],
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: {
      get currentFile () {
        return mocks.currentFile
      },
      get currentRepo () {
        return mocks.currentRepo
      },
      get tree () {
        return mocks.tree
      },
    },
  },
}))

vi.mock('@fe/support/env', () => ({
  get isElectron () {
    return mocks.isElectron
  },
  get isWindows () {
    return mocks.isWindows
  },
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: vi.fn(() => ({ show: mocks.toastShow })),
}))

vi.mock('@fe/services/base', () => ({
  getAttachmentURL: mocks.getAttachmentURL,
  openExternal: mocks.openExternal,
  openPath: mocks.openPath,
}))

vi.mock('@fe/services/repo', () => ({
  getRepo: mocks.getRepo,
}))

vi.mock('@fe/services/editor', () => ({
  getAvailableCustomEditors: mocks.getAvailableCustomEditors,
}))

vi.mock('@fe/support/api', () => ({
  fetchTree: mocks.fetchTree,
}))

vi.mock('@fe/services/view', () => ({
  getRenderEnv: mocks.getRenderEnv,
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: vi.fn(),
}))

vi.mock('../worker-indexer?worker&url', () => ({
  default: '/worker-indexer.js',
}))

import MarkdownIt from 'markdown-it'
import { DOM_ATTR_NAME, DOM_CLASS_NAME } from '@fe/support/args'
import markdownLink from '../index'

function createCtx (md = new MarkdownIt({ html: true })) {
  const hooks = new Map<string, Function[]>()
  const ctx = {
    action: {
      getActionHandler: vi.fn(() => vi.fn(async () => 'https://cdn.example.com/uploaded.png')),
    },
    api: {
      fetchHttp: vi.fn(async () => new Response(new Blob(['image'], { type: 'image/png' }))),
      proxyFetch: vi.fn(async () => ({ text: async () => '<html><title>Example Title</title></html>' })),
    },
    editor: {
      getLinesContent: vi.fn(() => 'https://example.com'),
      replaceLines: vi.fn(),
    },
    i18n: {
      t: vi.fn((key: string) => key),
    },
    indexer: {
      importScriptsToWorker: vi.fn(),
    },
    lib: {
      lodash: {
        unescape: vi.fn((value: string) => value),
      },
      mime: {
        getType: vi.fn(() => 'image/png'),
      },
    },
    markdown: {
      registerPlugin: vi.fn((plugin: any) => md.use(plugin)),
    },
    registerHook: vi.fn((name: string, fn: Function) => {
      hooks.set(name, [...(hooks.get(name) || []), fn])
    }),
    routines: {
      changePosition: vi.fn(),
    },
    ui: {
      useToast: vi.fn(() => ({ show: mocks.toastShow, hide: vi.fn() })),
    },
    utils: {
      fileToBase64URL: vi.fn(async () => 'data:image/png;base64,aW1n'),
      path: {
        basename: vi.fn((path: string) => path.split('/').pop()),
      },
    },
    view: {
      getRenderIframe: vi.fn(async () => {
        const doc = document.implementation.createHTMLDocument('')
        return { contentDocument: doc }
      }),
      tapContextMenus: vi.fn(),
    },
    hooks,
    md,
  } as any

  return ctx
}

function eventFor (target: HTMLElement) {
  return {
    target,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  }
}

describe('markdown-link plugin entry', () => {
  beforeEach(() => {
    mocks.defaultCtx.doc.switchDoc.mockReset()
    mocks.defaultCtx.routines.changePosition.mockReset()
    mocks.defaultToastShow.mockReset()
    mocks.fetchTree.mockReset()
    mocks.getAvailableCustomEditors.mockReset()
    mocks.getAvailableCustomEditors.mockResolvedValue([])
    mocks.getRenderEnv.mockReset()
    mocks.getRenderEnv.mockReturnValue({ file: { repo: 'repo-a', path: '/notes/current.md', name: 'current.md' } })
    mocks.getRepo.mockReset()
    mocks.getRepo.mockReturnValue({ path: '/repo-root' })
    mocks.openExternal.mockReset()
    mocks.openPath.mockReset()
    mocks.toastShow.mockReset()
    mocks.currentFile = { repo: 'repo-a', path: '/notes/current.md', name: 'current.md' }
    mocks.currentRepo = { name: 'repo-a' }
    mocks.isElectron = true
    mocks.isWindows = false
    mocks.tree.length = 0
    mocks.tree.push({ type: 'file', name: 'Wiki.md', path: '/notes/Wiki.md' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('registers hooks, markdown conversion rule, link renderer, and indexer worker', () => {
    const md = new MarkdownIt({ html: true })
    const ctx = createCtx(md)

    const exposed = markdownLink.register(ctx)
    const html = md.render('[site](https://example.com)\n\n![img](./a.png)')

    expect(ctx.registerHook.mock.calls.map(([name]: any[]) => name)).toEqual([
      'VIEW_ON_GET_HTML_FILTER_NODE',
      'VIEW_ELEMENT_CLICK',
      'VIEW_AFTER_REFRESH',
      'DOC_SWITCH_SKIPPED',
      'DOC_SWITCHED',
    ])
    expect(ctx.indexer.importScriptsToWorker).toHaveBeenCalledWith(expect.any(URL))
    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
    expect(md.validateLink('javascript:alert(1)')).toBe(true)
    expect(html).toContain('<a href="https://example.com" target="_blank">')
    expect(html).toContain('data-local-image="true"')
    expect(exposed).toEqual({ mdRuleConvertLink: expect.any(Function), htmlHandleLink: expect.any(Function) })
  })

  test('filters local image nodes for remote, inline, uploaded, and fallback export modes', async () => {
    const ctx = createCtx()
    markdownLink.register(ctx)
    const hook = ctx.hooks.get('VIEW_ON_GET_HTML_FILTER_NODE')![0]
    const makeImg = () => {
      const img = document.createElement('img')
      img.setAttribute(DOM_ATTR_NAME.LOCAL_IMAGE, 'true')
      img.setAttribute(DOM_ATTR_NAME.ORIGIN_SRC, 'assets/photo.png?x=1')
      img.setAttribute('src', '/api/file/photo.png')
      return img
    }

    const remote = makeImg()
    await hook({ node: remote, options: { useRemoteSrcOfLocalImage: true } })
    expect(remote.getAttribute('src')).toContain('/api/file/photo.png')

    const inline = makeImg()
    await hook({ node: inline, options: { inlineLocalImage: true } })
    expect(ctx.api.fetchHttp).toHaveBeenCalledWith(expect.stringContaining('/api/file/photo.png'))
    expect(inline.getAttribute('src')).toBe('data:image/png;base64,aW1n')
    expect(inline.getAttribute(DOM_ATTR_NAME.ORIGIN_SRC)).toBe(null)

    const upload = makeImg()
    await hook({ node: upload, options: { uploadLocalImage: true } })
    expect(ctx.action.getActionHandler).toHaveBeenCalledWith('plugin.image-hosting-picgo.upload')
    expect(upload.getAttribute('src')).toBe('https://cdn.example.com/uploaded.png')

    const fallback = makeImg()
    await hook({ node: fallback, options: {} })
    expect(fallback.getAttribute('src')).toBe('assets/photo.png?x=1')
  })

  test('handles external, file, empty, invalid, and internal markdown link clicks', async () => {
    const ctx = createCtx()
    markdownLink.register(ctx)
    const click = ctx.hooks.get('VIEW_ELEMENT_CLICK')![0]

    const external = document.createElement('a')
    external.href = 'https://example.com/page'
    external.setAttribute('href', 'https://example.com/page')
    await click({ e: eventFor(external) })
    expect(mocks.openExternal).toHaveBeenCalledWith('https://example.com/page')

    const file = document.createElement('a')
    file.setAttribute('href', 'file:///tmp/readme.txt')
    await click({ e: eventFor(file) })
    expect(mocks.openPath).toHaveBeenCalledWith('/tmp/readme.txt')

    const empty = document.createElement('a')
    empty.setAttribute('href', ' ')
    await click({ e: eventFor(empty) })
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'Link is empty.')

    const invalid = document.createElement('a')
    invalid.setAttribute('href', '%E0%A4%A')
    await expect(click({ e: eventFor(invalid) })).rejects.toThrow(URIError)

    const markdown = document.createElement('a')
    markdown.setAttribute('href', './target.md#Intro')
    await click({ e: eventFor(markdown) })
    expect(mocks.defaultCtx.doc.switchDoc).toHaveBeenCalledWith({
      path: '/notes/target.md',
      type: 'file',
      name: 'target.md',
      repo: 'repo-a',
    }, { source: 'markdown-link', position: { anchor: 'Intro' } })
  })

  test('covers browser external links, javascript links, nested anchors, and no-current-file clicks', async () => {
    const open = vi.fn()
    vi.stubGlobal('open', open)
    const ctx = createCtx()
    markdownLink.register(ctx)
    const click = ctx.hooks.get('VIEW_ELEMENT_CLICK')![0]

    mocks.isElectron = false
    const external = document.createElement('a')
    external.href = 'https://browser.example/page'
    external.setAttribute('href', 'https://browser.example/page')
    const child = document.createElement('span')
    external.appendChild(child)
    await click({ e: eventFor(child) })
    expect(open).toHaveBeenCalledWith('https://browser.example/page')

    const javascript = document.createElement('a')
    javascript.setAttribute('href', 'javascript:alert(1)')
    const jsEvent = eventFor(javascript)
    expect(await click({ e: jsEvent })).toBe(true)
    expect(jsEvent.preventDefault).not.toHaveBeenCalled()

    const plain = document.createElement('span')
    expect(await click({ e: eventFor(plain) })).toBe(false)

    mocks.getRenderEnv.mockReturnValue(null)
    mocks.currentFile = null
    const noFile = document.createElement('a')
    noFile.setAttribute('href', './target.md')
    const noFileEvent = eventFor(noFile)
    await click({ e: noFileEvent })
    expect(noFileEvent.preventDefault).not.toHaveBeenCalled()
  })

  test('handles external open failures, same-file anchors, and non-markdown files with or without custom editors', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const ctx = createCtx()
    markdownLink.register(ctx)
    const click = ctx.hooks.get('VIEW_ELEMENT_CLICK')![0]

    mocks.openExternal.mockImplementationOnce(() => {
      throw new Error('open failed')
    })
    const external = document.createElement('a')
    external.href = 'https://fail.example'
    external.setAttribute('href', 'https://fail.example')
    await click({ e: eventFor(external) })
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'Failed to open link')

    const anchor = document.createElement('a')
    anchor.setAttribute('href', '#Intro')
    await click({ e: eventFor(anchor) })
    expect(mocks.defaultCtx.doc.switchDoc).toHaveBeenCalledWith(
      { repo: 'repo-a', path: '/notes/current.md', name: 'current.md' },
      { source: 'markdown-link', position: { anchor: 'Intro' } },
    )

    const customEditor = document.createElement('a')
    customEditor.setAttribute('href', './data.csv')
    mocks.getAvailableCustomEditors.mockResolvedValueOnce([{ name: 'csv' }])
    await click({ e: eventFor(customEditor) })
    await Promise.resolve()
    expect(mocks.defaultCtx.doc.switchDoc).toHaveBeenCalledWith(expect.objectContaining({
      path: '/notes/data.csv',
      repo: 'repo-a',
    }), expect.objectContaining({ source: 'markdown-link' }))

    const openFile = document.createElement('a')
    openFile.setAttribute('href', './data.bin')
    mocks.isWindows = true
    mocks.getRepo.mockReturnValueOnce({ path: '/repo-root' })
    await click({ e: eventFor(openFile) })
    await Promise.resolve()
    expect(mocks.openPath).toHaveBeenCalledWith(expect.stringContaining('repo-root'))

    error.mockRestore()
  })

  test('opens marked links on disk and resolves wiki links through current or fetched trees', async () => {
    const ctx = createCtx()
    markdownLink.register(ctx)
    const click = ctx.hooks.get('VIEW_ELEMENT_CLICK')![0]

    const marked = document.createElement('a')
    marked.classList.add(DOM_CLASS_NAME.MARK_OPEN)
    marked.setAttribute('href', './asset.pdf')
    await click({ e: eventFor(marked) })
    expect(mocks.openPath).toHaveBeenCalledWith('/repo-root/notes/asset.pdf')

    const wiki = document.createElement('a')
    wiki.setAttribute(DOM_ATTR_NAME.WIKI_LINK, 'true')
    wiki.setAttribute('href', 'Wiki')
    await click({ e: eventFor(wiki) })
    expect(mocks.defaultCtx.doc.switchDoc).toHaveBeenCalledWith(expect.objectContaining({
      path: '/notes/Wiki.md',
      repo: 'repo-a',
    }), expect.objectContaining({ source: 'markdown-link' }))

    mocks.getRenderEnv.mockReturnValue({ file: { repo: 'repo-b', path: '/notes/current.md', name: 'current.md' } })
    mocks.fetchTree.mockResolvedValueOnce([{ type: 'file', name: 'Fetched.md', path: '/notes/Fetched.md' }])
    const fetchedWiki = document.createElement('a')
    fetchedWiki.setAttribute(DOM_ATTR_NAME.WIKI_LINK, 'true')
    fetchedWiki.setAttribute('href', 'Fetched')
    await click({ e: eventFor(fetchedWiki) })
    await Promise.resolve()
    expect(mocks.fetchTree).toHaveBeenCalledWith('repo-b', { by: 'mtime', order: 'desc' })
    expect(mocks.defaultCtx.doc.switchDoc).toHaveBeenCalledWith(expect.objectContaining({
      path: '/notes/Fetched.md',
      repo: 'repo-b',
    }), expect.any(Object))
  })

  test('warns when fetched wiki links cannot resolve to an internal document', async () => {
    const ctx = createCtx()
    markdownLink.register(ctx)
    const click = ctx.hooks.get('VIEW_ELEMENT_CLICK')![0]

    mocks.getRenderEnv.mockReturnValue({ file: { repo: 'repo-b', path: '/notes/current.md', name: 'current.md' } })
    mocks.fetchTree.mockRejectedValueOnce(new Error('offline'))
    const missingWiki = document.createElement('a')
    missingWiki.setAttribute(DOM_ATTR_NAME.WIKI_LINK, 'true')
    missingWiki.setAttribute('href', 'https://example.com')
    await click({ e: eventFor(missingWiki) })
    await Promise.resolve()

    expect(mocks.defaultToastShow).toHaveBeenCalledWith('warning', 'Invalid File Path.')
  })

  test('refresh hook busts local image cache and doc switch hooks apply positions', async () => {
    const ctx = createCtx()
    markdownLink.register(ctx)
    const refresh = ctx.hooks.get('VIEW_AFTER_REFRESH')![0]
    const skipped = ctx.hooks.get('DOC_SWITCH_SKIPPED')![0]
    const switched = ctx.hooks.get('DOC_SWITCHED')![0]
    const doc = document.implementation.createHTMLDocument('')
    const img = doc.createElement('img')
    img.setAttribute(DOM_ATTR_NAME.LOCAL_IMAGE, 'true')
    img.setAttribute('src', 'https://asset.local/img.png')
    doc.body.appendChild(img)
    ctx.view.getRenderIframe.mockResolvedValueOnce({ contentDocument: doc })

    refresh()
    await Promise.resolve()
    expect(img.src).toMatch(/_t=\d+/)

    skipped({ opts: { position: { line: 3 } } })
    switched({ doc: { path: '/a.md' }, opts: { position: { anchor: 'A' } } })
    expect(ctx.routines.changePosition).toHaveBeenCalledWith({ line: 3 })
    expect(ctx.routines.changePosition).toHaveBeenCalledWith({ anchor: 'A' })

    skipped({ opts: {} })
    switched({ doc: null, opts: { position: { line: 9 } } })
    expect(ctx.routines.changePosition).toHaveBeenCalledTimes(2)
  })

  test('adds a context menu to convert bare urls into titled links', async () => {
    const ctx = createCtx()
    markdownLink.register(ctx)
    const tap = ctx.view.tapContextMenus.mock.calls[0][0]
    const parent = document.createElement('p')
    parent.dataset.sourceLine = '2'
    parent.setAttribute(DOM_ATTR_NAME.SOURCE_LINE_START, '2')
    parent.setAttribute(DOM_ATTR_NAME.SOURCE_LINE_END, '3')
    const link = document.createElement('a')
    link.href = 'https://example.com'
    link.setAttribute('href', 'https://example.com')
    link.innerText = 'https://example.com'
    parent.appendChild(link)
    const menus: any[] = []

    tap(menus, { target: link })
    await menus[0].onClick()

    expect(menus[0]).toMatchObject({ id: 'plugin.markdown-link.transform-link' })
    expect(ctx.api.proxyFetch).toHaveBeenCalledWith('https://example.com/', { timeout: 10000 })
    expect(ctx.editor.getLinesContent).toHaveBeenCalledWith(2, 2)
    expect(ctx.editor.replaceLines).toHaveBeenCalledWith(2, 2, '[Example Title](https://example.com)')
  })

  test('context menu ignores non-bare links and reports title lookup failures', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const ctx = createCtx()
    markdownLink.register(ctx)
    const tap = ctx.view.tapContextMenus.mock.calls[0][0]
    const parent = document.createElement('p')
    parent.dataset.sourceLine = '2'
    parent.setAttribute(DOM_ATTR_NAME.SOURCE_LINE_START, '2')
    parent.setAttribute(DOM_ATTR_NAME.SOURCE_LINE_END, '3')
    const link = document.createElement('a')
    link.href = 'https://example.com'
    link.setAttribute('href', 'https://example.com')
    link.innerText = 'Example'
    parent.appendChild(link)
    const menus: any[] = []

    tap(menus, { target: link })
    expect(menus).toHaveLength(0)

    link.innerText = 'https://example.com'
    ctx.api.proxyFetch.mockResolvedValueOnce({ text: async () => '<html></html>' })
    tap(menus, { target: link })
    await menus[0].onClick()
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'No title')
    error.mockRestore()
  })
})
