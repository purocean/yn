const mocks = vi.hoisted(() => ({
  state: {
    presentation: false,
    autoPreview: true,
    syncScroll: true,
    previewer: 'default',
    currentFile: { repo: 'notes', path: '/a.md' },
  },
  hooks: new Map<string, any[]>(),
  actions: [] as any[],
  actionHandlers: new Map<string, any>(),
  ioc: new Map<string, any[]>(),
  triggerHook: vi.fn(async () => false),
  toastShow: vi.fn(),
  emitResize: vi.fn(),
  sameFile: true,
  juice: vi.fn((html: string) => `juiced:${html}`),
}))

vi.mock('juice', () => ({
  default: mocks.juice,
}))

vi.mock('@fe/core/keybinding', () => ({
  Escape: 'Escape',
}))

vi.mock('@fe/core/action', () => ({
  registerAction: vi.fn((action: any) => {
    mocks.actions.push(action)
    return action
  }),
  getActionHandler: vi.fn((name: string) => {
    const handler = mocks.actionHandlers.get(name)
    if (!handler) {
      throw new Error(`Unexpected action: ${name}`)
    }
    return handler
  }),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: vi.fn((name: string, handler: any) => {
    const items = mocks.hooks.get(name) || []
    items.push(handler)
    mocks.hooks.set(name, items)
  }),
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/core/ioc', () => ({
  register: vi.fn((key: string, value: any) => {
    const items = mocks.ioc.get(key) || []
    items.push(value)
    mocks.ioc.set(key, items)
  }),
  get: vi.fn((key: string) => [...(mocks.ioc.get(key) || [])]),
  removeWhen: vi.fn((key: string, when: (item: any) => boolean) => {
    mocks.ioc.set(key, (mocks.ioc.get(key) || []).filter(item => !when(item)))
  }),
}))

vi.mock('@fe/support/store', () => ({
  default: { state: mocks.state },
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow }),
}))

vi.mock('@fe/utils', () => ({
  sleep: vi.fn(() => Promise.resolve()),
}))

vi.mock('@fe/services/layout', () => ({
  emitResize: mocks.emitResize,
}))

vi.mock('@fe/services/document', () => ({
  isSameFile: () => mocks.sameFile,
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string) => key,
}))

import {
  addScript,
  addStyleLink,
  addStyles,
  disableSyncScrollAwhile,
  getAllPreviewers,
  getContentHtml,
  getContextMenuItems,
  getEnableSyncScroll,
  getHeadings,
  getPreviewStyles,
  getScrollTop,
  getViewDom,
  highlightAnchor,
  highlightLine,
  refresh,
  registerPreviewer,
  removePreviewer,
  render,
  renderImmediately,
  revealLine,
  scrollTopTo,
  switchPreviewer,
  tapContextMenus,
  toggleAutoPreview,
  toggleSyncScroll,
} from '@fe/services/view'

function fireHook (name: string, payload: any) {
  for (const handler of mocks.hooks.get(name) || []) {
    handler(payload)
  }
}

function makeIframe () {
  const iframeDocument = document.implementation.createHTMLDocument('preview')
  iframeDocument.body.innerHTML = '<article class="markdown-body"><h1 id="intro" data-source-line="2">Intro</h1><p data-source-line="3">body</p></article>'
  Object.defineProperty(iframeDocument.documentElement, 'clientHeight', { value: 300, configurable: true })
  const iframe = {
    contentDocument: iframeDocument,
    contentWindow: {
      scrollY: 12,
      scrollTo: vi.fn(),
      scrollBy: vi.fn(),
    },
  } as any as HTMLIFrameElement
  fireHook('VIEW_RENDER_IFRAME_READY', { iframe })
  return iframe
}

beforeEach(() => {
  mocks.state.presentation = false
  mocks.state.autoPreview = true
  mocks.state.syncScroll = true
  mocks.state.previewer = 'default'
  mocks.state.currentFile = { repo: 'notes', path: '/a.md' }
  mocks.actionHandlers.clear()
  mocks.ioc.clear()
  mocks.triggerHook.mockClear()
  mocks.toastShow.mockClear()
  mocks.emitResize.mockClear()
  mocks.sameFile = true
  mocks.juice.mockClear()
})

test('delegates render actions and toggles preview state', () => {
  const renderHandler = vi.fn()
  const immediateHandler = vi.fn()
  mocks.actionHandlers.set('view.render', renderHandler)
  mocks.actionHandlers.set('view.render-immediately', immediateHandler)

  render()
  renderImmediately()
  toggleAutoPreview()
  toggleSyncScroll(false)

  expect(renderHandler).toHaveBeenCalledTimes(1)
  expect(immediateHandler).toHaveBeenCalledTimes(1)
  expect(mocks.state.autoPreview).toBe(false)
  expect(mocks.state.syncScroll).toBe(false)

  toggleAutoPreview(true)
  toggleSyncScroll()
  expect(mocks.state.autoPreview).toBe(true)
  expect(mocks.state.syncScroll).toBe(true)
})

test('delegates refresh/reveal actions and toggles presentation through registered commands', async () => {
  vi.useFakeTimers()
  const refreshHandler = vi.fn()
  const revealHandler = vi.fn(() => 'line-el')
  mocks.actionHandlers.set('view.refresh', refreshHandler)
  mocks.actionHandlers.set('view.reveal-line', revealHandler)

  await refresh()
  await expect(revealLine(8)).resolves.toBe('line-el')

  const enter = mocks.actions.find(action => action.name === 'view.enter-presentation')
  const exit = mocks.actions.find(action => action.name === 'view.exit-presentation')

  enter.handler()
  expect(mocks.toastShow).toHaveBeenCalledWith('info', 'exit-presentation-msg')
  expect(mocks.state.presentation).toBe(true)
  vi.runOnlyPendingTimers()
  expect(mocks.emitResize).toHaveBeenCalled()

  expect(exit.when()).toBe(true)
  exit.handler()
  expect(mocks.state.presentation).toBe(false)

  vi.useRealTimers()
})

test('exit presentation command ignores text inputs and visible masks', () => {
  const iframe = makeIframe()
  const input = iframe.contentDocument!.createElement('input')
  iframe.contentDocument!.body.appendChild(input)
  input.focus()
  mocks.state.presentation = true

  const exit = mocks.actions.find(action => action.name === 'view.exit-presentation')
  expect(exit.when()).toBe(false)

  input.blur()
})

test('registers previewers, switches valid names, and falls back to default', () => {
  const previewer = { name: 'custom', component: {} }

  registerPreviewer(previewer as any)
  switchPreviewer('custom')
  switchPreviewer('missing')

  expect(getAllPreviewers()).toStrictEqual([previewer])
  expect(mocks.state.previewer).toBe('default')
  expect(mocks.triggerHook).toHaveBeenCalledWith('VIEW_PREVIEWER_CHANGE', { type: 'register' })
  expect(mocks.triggerHook).toHaveBeenCalledWith('VIEW_PREVIEWER_CHANGE', { type: 'switch' })

  removePreviewer('custom')
  expect(getAllPreviewers()).toStrictEqual([])
  expect(mocks.triggerHook).toHaveBeenCalledWith('VIEW_PREVIEWER_CHANGE', { type: 'remove' })
})

test('builds context menus through registered processors', () => {
  tapContextMenus((items, e) => {
    items.push({ id: (e as any).id, label: 'Open' } as any)
  })

  expect(getContextMenuItems({ id: 'ctx' } as any)).toStrictEqual([{ id: 'ctx', label: 'Open' }])
})

test('adds preview assets and exposes scroll state', async () => {
  const iframe = makeIframe()

  const style = await addStyles('.x { color: red; }', true)
  const link = await addStyleLink('data:text/css,body{}')
  const script = await addScript('')
  await scrollTopTo(42)

  expect(style.getAttribute('skip-export')).toBe('true')
  expect(style.textContent).toContain('color: red')
  expect(link.getAttribute('rel')).toBe('stylesheet')
  expect(link.getAttribute('href')).toBe('data:text/css,body{}')
  expect(script.getAttribute('src')).toBe('')
  expect(iframe.contentWindow!.scrollTo).toHaveBeenCalledWith(0, 42)
  expect(getScrollTop()).toBe(12)
})

test('highlights source lines and anchors with optional reveal', async () => {
  const iframe = makeIframe()
  const viewDom = iframe.contentDocument!.querySelector('article')!
  const revealLineHandler = vi.fn(async () => viewDom.querySelector('p'))
  mocks.actionHandlers.set('view.reveal-line', revealLineHandler)
  mocks.actionHandlers.set('view.get-view-dom', () => viewDom)

  const line = await highlightLine(3, false, 0)
  const revealedLine = await highlightLine(3, true, 0)
  const anchor = await highlightAnchor('intro', true, 0)

  expect(line?.classList.contains('preview-highlight')).toBe(true)
  expect(revealedLine?.classList.contains('preview-highlight')).toBe(true)
  expect(anchor?.classList.contains('preview-highlight')).toBe(true)
  expect(iframe.contentWindow!.scrollBy).toHaveBeenCalledWith(0, -120)
  expect(iframe.contentWindow!.scrollBy).toHaveBeenCalledWith(0, -60)
})

test('finds anchors through decoded and h-prefixed ids', async () => {
  const iframe = makeIframe()
  const special = iframe.contentDocument!.createElement('h2')
  special.id = 'Title(One)'
  iframe.contentDocument!.body.appendChild(special)
  const prefixed = iframe.contentDocument!.createElement('h2')
  prefixed.id = 'Plain'
  iframe.contentDocument!.body.appendChild(prefixed)

  await expect(highlightAnchor('Title%28One%29', false, 0)).resolves.toBe(special)
  await expect(highlightAnchor('h-Plain', false, 0)).resolves.toBe(prefixed)
})

test('returns null for missing anchors and tolerates duration-based highlight cleanup', async () => {
  const iframe = makeIframe()
  const viewDom = iframe.contentDocument!.querySelector('article')!
  mocks.actionHandlers.set('view.get-view-dom', () => viewDom)

  await expect(highlightAnchor('missing', false, 0)).resolves.toBeNull()
  const line = await highlightLine(3, false, 50)
  await Promise.resolve()
  expect(line?.classList.contains('preview-highlight')).toBe(false)
})

test('filters content html and inlines styles when requested', async () => {
  makeIframe()
  mocks.actionHandlers.set('view.get-content-html', () => `
    <article class="markdown-body">
      <a href="#intro" target="_blank" title="anchor">Intro</a>
      <audio preload="metadata"></audio>
      <span class="skip-export">hidden</span>
      <abbr title="Keep">YN</abbr>
    </article>
  `)

  const html = await getContentHtml({ inlineStyle: true })

  expect(mocks.juice).toHaveBeenCalled()
  expect(html).toContain('powered-by="Yank Note"')
  expect(html).not.toContain('skip-export')
  expect(html).not.toContain('target="_blank"')
  expect(html).not.toContain('preload=')
  expect(html).toContain('title="Keep"')
  expect(html).not.toContain('loading="lazy"')
})

test('content html filtering supports breakable hooks, node processors, and title cleanup', async () => {
  makeIframe()
  mocks.actionHandlers.set('view.get-content-html', () => `
    <article class="markdown-body">
      <a href="https://example.com" target="_blank" title="external">External</a>
      <span class="">empty class</span>
      <span class="skip-print">print hidden</span>
      <strong data-break="true" title="keep">break</strong>
    </article>
  `)
  mocks.triggerHook.mockImplementation(async (_name: string, { node }: any) => node.getAttribute?.('data-break') === 'true')
  const processed: string[] = []

  const html = await getContentHtml({
    nodeProcessor: node => processed.push(node.tagName),
  } as any)

  expect(processed).toContain('ARTICLE')
  expect(html).toContain('target="_blank"')
  expect(html).not.toContain('title="external"')
  expect(html).not.toContain('class=""')
  expect(html).not.toContain('skip-print')
  expect(html).toContain('title="keep"')
})

test('collects headings and marks the visible heading as activated', () => {
  const iframe = makeIframe()
  const article = iframe.contentDocument!.querySelector('article')!
  const h1 = article.querySelector('h1')!
  h1.getBoundingClientRect = vi.fn(() => ({ top: 20 } as DOMRect))
  mocks.actionHandlers.set('view.get-view-dom', () => article)

  expect(getViewDom()).toBe(article)
  expect(getHeadings(true)).toStrictEqual([
    expect.objectContaining({ tag: 'h1', text: 'Intro', sourceLine: 2, activated: true }),
  ])
  expect(getHeadings(false)[0].activated).toBeUndefined()
})

test('collects heading activation for before-view and after-view positions', () => {
  const iframe = makeIframe()
  const article = iframe.contentDocument!.querySelector('article')!
  article.innerHTML = `
    <h1 id="before" data-source-line="1">Before</h1>
    <h2 id="after" data-source-line="2">After</h2>
  `
  const [before, after] = Array.from(article.querySelectorAll('h1,h2')) as HTMLElement[]
  before.getBoundingClientRect = vi.fn(() => ({ top: -10 } as DOMRect))
  after.getBoundingClientRect = vi.fn(() => ({ top: 500 } as DOMRect))
  mocks.actionHandlers.set('view.get-view-dom', () => article)

  expect(getHeadings(true)).toStrictEqual([
    expect.objectContaining({ id: 'before', activated: true }),
    expect.objectContaining({ id: 'after', activated: false }),
  ])

  mocks.actionHandlers.set('view.get-view-dom', () => null)
  expect(getHeadings(true)).toEqual([])
})

test('returns preview styles from eligible stylesheets and skips contain rules', () => {
  const iframe = makeIframe()
  const style = iframe.contentDocument!.createElement('style')
  style.textContent = '.markdown-view .markdown-body p { color: red; } .x { --skip-contain: true; color: blue; }'
  iframe.contentDocument!.head.appendChild(style)

  const styles = getPreviewStyles()

  expect(styles).toContain('article.markdown-body')
  expect(styles).toContain('.markdown-body p')
})

test('temporarily disables sync scroll and restores it after timeout', async () => {
  vi.useFakeTimers()
  makeIframe()
  mocks.actionHandlers.set('view.get-render-env', () => ({ file: { repo: 'notes', path: '/a.md' } }))

  expect(getEnableSyncScroll()).toBe(true)
  await disableSyncScrollAwhile(vi.fn(async () => {
    expect(getEnableSyncScroll()).toBe(false)
  }), 100)
  vi.advanceTimersByTime(100)

  expect(getEnableSyncScroll()).toBe(true)
  mocks.state.syncScroll = false
  expect(getEnableSyncScroll()).toBe(false)
  mocks.state.syncScroll = true
  mocks.sameFile = false
  expect(getEnableSyncScroll()).toBe(false)
  mocks.sameFile = true
  vi.useRealTimers()
})
