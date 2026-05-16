const mocks = vi.hoisted(() => {
  const renderWindow = {
    CustomEvent: class CustomEvent {},
    addEventListener: vi.fn(),
    document,
    kityM: vi.fn(() => ({})),
    kityminderM: vi.fn(() => ({ Minder: vi.fn() })),
    removeEventListener: vi.fn(),
  } as any

  return {
    addScript: vi.fn(),
    addStyleLink: vi.fn(),
    downloadDataURL: vi.fn(),
    getRenderIframe: vi.fn(async () => ({ contentWindow: renderWindow })),
    openWindow: vi.fn(),
    registerHook: vi.fn(),
    removeHook: vi.fn(),
    renderWindow,
    minderInstances: [] as any[],
    storageGet: vi.fn(),
    storageSet: vi.fn(),
    strToBase64: vi.fn((value: string) => `base64:${value}`),
    waitCondition: vi.fn(async () => undefined),
  }
})

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/utils', () => ({
  downloadDataURL: mocks.downloadDataURL,
  getLogger: vi.fn(() => ({ debug: vi.fn() })),
  strToBase64: mocks.strToBase64,
  waitCondition: mocks.waitCondition,
}))

vi.mock('@fe/support/env', () => ({
  openWindow: mocks.openWindow,
}))

vi.mock('@fe/utils/storage', () => ({
  get: mocks.storageGet,
  set: mocks.storageSet,
}))

vi.mock('@fe/support/embed', () => ({
  buildSrc: vi.fn((srcdoc: string, title: string) => `embed:${title}:${srcdoc.length}`),
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: {
      showView: true,
    },
  },
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: mocks.registerHook,
  removeHook: mocks.removeHook,
}))

vi.mock('@fe/services/i18n', () => ({
  t: vi.fn((key: string) => key),
}))

vi.mock('@fe/services/view', () => ({
  getRenderIframe: mocks.getRenderIframe,
}))

vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: {
    DISPLAY_NONE: 'data-display-none',
    ONLY_CHILD: 'data-only-child',
  },
  DOM_CLASS_NAME: {
    REDUCE_BRIGHTNESS: 'reduce-brightness',
    SKIP_EXPORT: 'skip-export',
    SKIP_PRINT: 'skip-print',
  },
}))

import MarkdownIt from 'markdown-it'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import markdownMindMap from '../markdown-mind-map'

function lineStarts (source: string) {
  const starts = [0]
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') {
      starts.push(i + 1)
    }
  }
  starts.push(source.length)
  return starts
}

function createCtx (md = new MarkdownIt()) {
  const hooks = new Map<string, Function>()
  const simpleItems: any[] = []
  const style = { outerHTML: '<link href="/kity/kityminder.core.css">' }
  const script1 = { outerHTML: '<script src="/kity/kity.min.js"></script>', onload: null as null | Function }
  const script2 = { outerHTML: '<script src="/kity/kityminder.core.min.js"></script>' }
  mocks.addStyleLink.mockResolvedValue(style)
  mocks.addScript.mockResolvedValueOnce(script1).mockResolvedValueOnce(script2)

  const ctx = {
    editor: {
      tapSimpleCompletionItems: vi.fn((fn: Function) => fn(simpleItems)),
    },
    markdown: {
      registerPlugin: vi.fn((plugin: any) => plugin(md)),
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    utils: {
      strToBase64: mocks.strToBase64,
    },
    view: {
      addScript: mocks.addScript,
      addStyleLink: mocks.addStyleLink,
      addStyles: vi.fn(),
    },
    hooks,
    md,
    script1,
    simpleItems,
  } as any

  return ctx
}

describe('markdown-mind-map plugin', () => {
  beforeEach(() => {
    mocks.addScript.mockReset()
    mocks.addStyleLink.mockReset()
    mocks.downloadDataURL.mockReset()
    mocks.openWindow.mockReset()
    mocks.registerHook.mockReset()
    mocks.removeHook.mockReset()
    mocks.storageGet.mockReset()
    mocks.storageSet.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  function installFakeMinder () {
    function Point (this: any, x: number, y: number) {
      this.x = x
      this.y = y
    }

    class PriorityRenderer {
      create () {
        return {
          back: { fill: vi.fn() },
          mask: { fill: vi.fn() },
          setValue: vi.fn(),
        }
      }
    }

    class FakeMinder {
      _status = 'idle'
      _firePharse = vi.fn()
      _paper = { on: vi.fn(), off: vi.fn() }
      _commands = { camera: { execute: vi.fn() } }
      _modules = {
        Select: { init: vi.fn() },
        PriorityModule: { renderers: { left: PriorityRenderer } },
        View: { events: { resize: { apply: vi.fn() } } },
      }

      _viewDragger = { moveTo: vi.fn() }
      viewer = { close: vi.fn(), dispose: vi.fn(), hotkeyHandler: vi.fn() }
      paperContainer = document.createElement('div')
      shapeNode = document.createElement('g')
      template = 'default'
      theme = 'fresh-green-compat'
      importData = vi.fn(async () => undefined)
      exportData = vi.fn(async (type: string) => `export:${type}`)
      exportJson = vi.fn(() => ({ root: 'json' }))
      setup = vi.fn()
      disable = vi.fn()
      setOption = vi.fn()
      setTemplate = vi.fn((template: string) => { this.template = template })
      disableAnimation = vi.fn()
      enableAnimation = vi.fn()
      useTemplate = vi.fn((template: string) => { this.template = template })
      execCommand = vi.fn()
      useTheme = vi.fn((theme: string) => { this.theme = theme })
      zoom = vi.fn()
      getZoomValue = vi.fn(() => 1)
      importJson = vi.fn()
      importNode = vi.fn((_node: any, json: any) => json)
      destroyCalled = false
      destroy = vi.fn(() => { this.destroyCalled = true })
      focus = vi.fn()

      constructor () {
        this.shapeNode.getBoundingClientRect = vi.fn(() => ({ height: 240 } as DOMRect))
        mocks.minderInstances.push(this)
      }

      getTemplate () {
        return this.template
      }

      getTheme () {
        return this.theme
      }

      getOption () {
        return 120
      }

      getPaper () {
        return {
          container: this.paperContainer,
          shapeNode: this.shapeNode,
          getViewPort: () => ({ center: { x: 120, y: 80 }, zoom: 2 }),
        }
      }

      getRoot () {
        return {
          getVertexIn: () => new (Point as any)(0, 0),
        }
      }
    }

    mocks.minderInstances.length = 0
    mocks.renderWindow.kityminderM = vi.fn(() => ({ Minder: FakeMinder }))
  }

  test('initializes the render iframe shim on import', async () => {
    await Promise.resolve()

    expect(mocks.getRenderIframe).toHaveBeenCalled()
    expect(mocks.renderWindow.CustomEvent).toBeDefined()
    expect(mocks.renderWindow.kity).toEqual({})
    expect(mocks.renderWindow.kityminder.Minder).toEqual(expect.any(Function))
  })

  test('registers styles, async kity resources, html hook, markdown rule, and completion item', async () => {
    const ctx = createCtx()

    markdownMindMap.register(ctx)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(ctx.script1.onload).toEqual(expect.any(Function))
    await ctx.script1.onload()

    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('.mind-map-action'))
    expect(ctx.view.addStyleLink).toHaveBeenCalledWith('/kity/kityminder.core.css')
    expect(ctx.view.addScript).toHaveBeenCalledWith('/kity/kity.min.js')
    expect(ctx.view.addScript).toHaveBeenCalledWith('/kity/kityminder.core.min.js')
    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx.registerHook).toHaveBeenCalledWith('VIEW_ON_GET_HTML_FILTER_NODE', expect.any(Function))
    expect(ctx.simpleItems).toEqual([
      { language: 'markdown', label: '/ + MindMap', insertText: '+ ${1:Subject}{.mindmap}\n    + ${2:Topic}', block: true },
    ])
  })

  test('renders list tokens followed by mindmap class as MindMap vnode content', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownMindMap.register(ctx)
    const source = '+ Root{.mindmap}\n    + Child\n    + Next\n'
    const bMarks = lineStarts(source)
    const tokens = [
      { map: [0, 3], meta: { attrs: { id: 'src' } } },
      { attrGet: vi.fn(() => 'block mindmap extra') },
    ] as any[]
    const slf = { renderToken: vi.fn(() => '<ul>') }

    const vnode: any = md.renderer.rules.bullet_list_open!(tokens, 0, md.options, { bMarks, source }, slf as any)

    expect(vnode.type.name).toBe('mind-map')
    expect(vnode.props.attrs).toEqual({ id: 'src' })
    expect(vnode.props.content).toBe('Root\n    Child\n    Next\n')
    expect(slf.renderToken).not.toHaveBeenCalled()
  })

  test('falls back to normal list rendering without mindmap class', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownMindMap.register(ctx)
    const tokens = [
      { map: [0, 1], meta: {} },
      { attrGet: vi.fn(() => 'plain') },
    ] as any[]
    const slf = { renderToken: vi.fn(() => '<ul>') }

    const html = md.renderer.rules.bullet_list_open!(tokens, 0, md.options, { bMarks: [0, 7], source: '+ Root\n' }, slf as any)

    expect(html).toBe('<ul>')
    expect(slf.renderToken).toHaveBeenCalledWith(tokens, 0, md.options)
  })

  test('html export hook leaves mind-map nodes unchanged when no rendered instance exists', async () => {
    const ctx = createCtx()
    markdownMindMap.register(ctx)
    const hook = ctx.hooks.get('VIEW_ON_GET_HTML_FILTER_NODE')
    const node = document.createElement('div')
    node.id = 'mind-map-missing'
    node.className = 'mind-map'
    node.innerHTML = '<button>tools</button>'

    await hook({ node, options: { preferPng: true } })

    expect(node.outerHTML).toContain('mind-map-missing')
    expect(mocks.downloadDataURL).not.toHaveBeenCalled()
  })

  test('mind-map component initializes kityminder, handles toolbar actions, print image, and html export', async () => {
    vi.useFakeTimers()
    installFakeMinder()
    mocks.storageGet.mockReturnValue('right')
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownMindMap.register(ctx)
    const source = '+ Root{.mindmap}\n  + Child\n'
    const vnode: any = md.renderer.rules.bullet_list_open!([
      { map: [0, 2], meta: { attrs: { 'data-source': 'mind' } } },
      { attrGet: vi.fn(() => 'mindmap') },
    ] as any, 0, md.options, { bMarks: lineStarts(source), source }, { renderToken: vi.fn() } as any)

    const wrapper = mount(vnode.type, {
      attachTo: document.body,
      props: vnode.props,
    })

    await vi.runOnlyPendingTimersAsync()
    await Promise.resolve()
    await Promise.resolve()

    const km = mocks.minderInstances[0]
    expect(km.setup).toHaveBeenCalled()
    expect(km.disable).toHaveBeenCalled()
    expect(km.setTemplate).toHaveBeenCalledWith('right')
    expect(km.importData).toHaveBeenCalledWith('text', 'Root\n    Child')
    expect(km.execCommand).toHaveBeenCalledWith('hand')
    expect(km.execCommand).toHaveBeenCalledWith('camera')

    const buttons = wrapper.element.querySelectorAll('button')
    buttons[0].click()
    expect(km.paperContainer.style.height).toBe('280px')
    expect(km.zoom).toHaveBeenCalledWith(1)

    buttons[1].click()
    buttons[2].click()
    expect(km.execCommand).toHaveBeenCalledWith('zoomIn')
    expect(km.execCommand).toHaveBeenCalledWith('zoomOut')

    buttons[3].click()
    expect(mocks.storageSet).toHaveBeenCalledWith('mind-map-layout', 'structure')
    expect(km.useTemplate).toHaveBeenCalledWith('structure')

    buttons[4].click()
    expect(km.useTheme).toHaveBeenCalledWith('fresh-green')

    buttons[5].click()
    expect(mocks.openWindow).toHaveBeenCalledWith(expect.stringContaining('embed:view-figure:'), '_blank', { backgroundColor: '#fff' })

    buttons[6].click()
    await Promise.resolve()
    expect(mocks.downloadDataURL).toHaveBeenCalledWith(expect.stringMatching(/^mindmap-.*\.png$/), 'export:png')

    buttons[7].click()
    await Promise.resolve()
    expect(mocks.downloadDataURL).toHaveBeenCalledWith(expect.stringMatching(/^mindmap-.*\.svg$/), 'data:image/svg+xml;base64,base64:export:svg')

    buttons[8].click()
    await Promise.resolve()
    expect(mocks.downloadDataURL).toHaveBeenCalledWith(expect.stringMatching(/^mindmap-.*\.km$/), 'data:application/octet-stream;base64,base64:export:json')

    const beforePrint = mocks.registerHook.mock.calls.find(([name]: any[]) => name === 'EXPORT_BEFORE_PREPARE')[1]
    const afterPrint = mocks.registerHook.mock.calls.find(([name]: any[]) => name === 'EXPORT_AFTER_PREPARE')[1]
    await beforePrint({ type: 'pdf' })
    await nextTick()
    expect(wrapper.element.querySelector('img')?.getAttribute('src')).toBe('data:image/svg+xml;base64,base64:export:svg')
    afterPrint()
    await nextTick()
    expect(wrapper.element.querySelector('img')).toBeNull()

    const node = wrapper.element.querySelector('.mind-map') as HTMLElement
    node.dataset.keep = 'yes'
    const hook = ctx.hooks.get('VIEW_ON_GET_HTML_FILTER_NODE')
    await hook({ node, options: { preferPng: true } })
    expect(document.body.innerHTML).toContain('src="export:png"')
    expect(document.body.innerHTML).toContain('data-keep="yes"')

    wrapper.unmount()
    expect(km.destroyCalled).toBe(true)
  })
})
