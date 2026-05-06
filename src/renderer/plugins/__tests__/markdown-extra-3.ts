import { mount } from '@vue/test-utils'
import MarkdownIt from 'markdown-it'
import { nextTick } from 'vue'

const mindMocks = vi.hoisted(() => {
  const renderDocument = document.implementation.createHTMLDocument('render')
  const renderWindow = {
    CustomEvent: class CustomEvent {},
    addEventListener: vi.fn(),
    document: renderDocument,
    kityM: vi.fn(() => ({ ok: true })),
    kityminderM: vi.fn(),
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
    renderDocument,
    renderWindow,
    storageGet: vi.fn(() => 'default'),
    storageSet: vi.fn(),
    strToBase64: vi.fn((value: string) => `b64:${value}`),
    waitCondition: vi.fn(async () => undefined),
    instances: [] as any[],
  }
})

vi.mock('@fe/context', () => ({ Plugin: class {} }))
vi.mock('@fe/utils', () => ({
  downloadDataURL: mindMocks.downloadDataURL,
  getLogger: vi.fn(() => ({ debug: vi.fn(), error: vi.fn() })),
  strToBase64: mindMocks.strToBase64,
  waitCondition: mindMocks.waitCondition,
}))
vi.mock('@fe/support/env', () => ({ openWindow: mindMocks.openWindow }))
vi.mock('@fe/utils/storage', () => ({ get: mindMocks.storageGet, set: mindMocks.storageSet }))
vi.mock('@fe/support/embed', () => ({ buildSrc: vi.fn((srcdoc: string) => `built:${srcdoc}`) }))
vi.mock('@fe/support/store', () => ({ default: { state: { showView: true } } }))
vi.mock('@fe/core/hook', () => ({
  registerHook: mindMocks.registerHook,
  removeHook: mindMocks.removeHook,
}))
vi.mock('@fe/services/i18n', () => ({ t: vi.fn((key: string) => key) }))
vi.mock('@fe/services/view', () => ({ getRenderIframe: mindMocks.getRenderIframe }))
vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: {
    DISPLAY_NONE: 'data-display-none',
    ONLY_CHILD: 'data-only-child',
    TOKEN_IDX: 'data-token-idx',
  },
  DOM_CLASS_NAME: {
    REDUCE_BRIGHTNESS: 'reduce-brightness',
    SKIP_EXPORT: 'skip-export',
    SKIP_PRINT: 'skip-print',
  },
}))

import markdownMindMap from '../markdown-mind-map'
import markdownPlantuml from '../markdown-plantuml'

function lineStarts (source: string) {
  const starts = [0]
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') starts.push(i + 1)
  }
  starts.push(source.length)
  return starts
}

function createMindCtx (md = new MarkdownIt()) {
  const hooks = new Map<string, Function>()
  return {
    editor: { tapSimpleCompletionItems: vi.fn((fn: Function) => fn([])) },
    markdown: { registerPlugin: vi.fn((plugin: Function) => plugin(md)) },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    utils: { strToBase64: mindMocks.strToBase64 },
    view: {
      addScript: mindMocks.addScript.mockResolvedValue({ outerHTML: '<script></script>' }),
      addStyleLink: mindMocks.addStyleLink.mockResolvedValue({ outerHTML: '<link>' }),
      addStyles: vi.fn(),
    },
    hooks,
    md,
  } as any
}

function createPlantCtx (md = new MarkdownIt()) {
  const hooks = new Map<string, Function>()
  return {
    api: {
      fetchHttp: vi.fn(async () => new Response(new Blob(['image'], { type: 'image/png' }))),
    },
    editor: {
      tapMarkdownMonarchLanguage: vi.fn((fn: Function) => fn({ tokenizer: { root: [] } })),
      tapSimpleCompletionItems: vi.fn((fn: Function) => fn([])),
    },
    markdown: { registerPlugin: vi.fn((plugin: any, options?: any) => md.use(plugin, options)) },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    utils: { fileToBase64URL: vi.fn(async () => 'data:image/png;base64,aW1hZ2U=') },
    hooks,
    md,
  } as any
}

function installPatchedMinder (opts: { importError?: boolean } = {}) {
  let importAttempts = 0
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
    cameraFallback = vi.fn()
    _commands = { camera: { execute: this.cameraFallback } }
    _modules = {
      Select: { init: vi.fn(() => 1) },
      PriorityModule: { renderers: { left: PriorityRenderer } },
      View: { events: { resize: { apply: vi.fn() } } },
    }

    _viewDragger = { moveTo: vi.fn() }
    viewer = { close: vi.fn(), hotkeyHandler: vi.fn(), dispose: vi.fn() }
    paperContainer = mindMocks.renderDocument.createElement('div')
    shapeNode = mindMocks.renderDocument.createElement('g')
    template = 'default'
    theme = 'fresh-green'
    importData = vi.fn(async () => {
      importAttempts++
      if (opts.importError && importAttempts === 1) throw new Error('bad mindmap')
    })

    exportData = vi.fn(async (type: string) => `<${type}>`)
    exportJson = vi.fn(() => ({ root: true }))
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
    importJsonBase = vi.fn()
    importJson = this.importJsonBase
    importNodeBase = vi.fn((_node: any, json: any) => json)
    importNode = this.importNodeBase
    destroyBase = vi.fn()
    destroy = this.destroyBase
    focus = vi.fn()

    constructor () {
      this.shapeNode.getBoundingClientRect = vi.fn(() => ({ height: 100 } as DOMRect))
      mindMocks.instances.push(this)
    }

    getTemplate () { return this.template }
    getTheme () { return this.theme }
    getOption () { return 25 }
    getPaper () {
      return {
        container: this.paperContainer,
        shapeNode: this.shapeNode,
        getViewPort: () => ({ center: { x: 100, y: 80 }, zoom: 2 }),
      }
    }

    getRoot () {
      return { getVertexIn: () => new (Point as any)(0, 0) }
    }
  }

  mindMocks.instances.length = 0
  mindMocks.renderWindow.kityminderM = vi.fn(() => ({ Minder: FakeMinder }))
  return FakeMinder
}

describe('markdown mind map extra branches', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mindMocks.storageGet.mockReturnValue('default')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  test('patches minder camera, imports priorities, cleans listeners, and ignores null json imports', async () => {
    installPatchedMinder()
    const md = new MarkdownIt()
    const ctx = createMindCtx(md)
    markdownMindMap.register(ctx)
    const source = '+ [3] Root{.mindmap}\n    + Child\n'
    const vnode: any = md.renderer.rules.bullet_list_open!([
      { map: [0, 2], meta: { attrs: {} } },
      { attrGet: vi.fn(() => 'mindmap') },
    ] as any, 0, md.options, { bMarks: lineStarts(source), source }, { renderToken: vi.fn() } as any)

    const wrapper = mount(vnode.type, { attachTo: document.body, props: vnode.props })
    await vi.runOnlyPendingTimersAsync()
    await Promise.resolve()

    const km = mindMocks.instances[0]
    km._bindEvents()
    expect(km._paper.on).toHaveBeenCalled()
    expect(km._modules.Select.init()).toBe(0)

    km._status = 'normal'
    expect(km._commands.camera.execute(km)).toBeUndefined()
    km._status = 'busy'
    km._commands.camera.execute(km, { id: 'focus' })
    expect(km.cameraFallback).toHaveBeenCalledWith(km, { id: 'focus' })
    km.cameraFallback.mockClear()

    km.template = 'right'
    km._commands.camera.execute(km)
    expect(km._viewDragger.moveTo).toHaveBeenLastCalledWith(expect.objectContaining({ x: 60, y: 85 }), 25)
    km.template = 'filetree'
    km._commands.camera.execute(km)
    expect(km._viewDragger.moveTo).toHaveBeenLastCalledWith(expect.objectContaining({ x: 100, y: 60 }), 25)
    km.template = 'tianpan'
    km._commands.camera.execute(km)
    expect(km.cameraFallback).toHaveBeenCalledWith(km)

    const json = { data: { text: '[3] Important' } }
    km.importNode({}, json)
    expect(json.data).toEqual({ text: 'Important', priority: 3 })
    const zero = { data: { text: '[0] Keep' } }
    km.importNode({}, zero)
    expect(zero.data).toEqual({ text: '[0] Keep' })
    km.importJson(null)
    expect(km.importJsonBase).not.toHaveBeenCalled()

    const icon = new km._modules.PriorityModule.renderers.left().create()
    icon.setValue(2)
    expect(icon.mask.fill).toHaveBeenCalledWith('#A3A3A3')
    expect(icon.back.fill).toHaveBeenCalledWith('#515151')

    km.clearSelect()
    expect(km._paper.off).toHaveBeenCalled()
    expect(mindMocks.renderWindow.removeEventListener).toHaveBeenCalled()
    km.destroy()
    expect(km.destroyBase).toHaveBeenCalled()

    wrapper.unmount()
  })

  test('renders convert error text and toggles wheel handling around focus state', async () => {
    installPatchedMinder({ importError: true })
    const md = new MarkdownIt()
    const ctx = createMindCtx(md)
    markdownMindMap.register(ctx)
    const source = '+ Root{.mindmap}\n'
    const vnode: any = md.renderer.rules.bullet_list_open!([
      { map: [0, 1], meta: { attrs: {} } },
      { attrGet: vi.fn(() => 'mindmap') },
    ] as any, 0, md.options, { bMarks: lineStarts(source), source }, { renderToken: vi.fn() } as any)

    const wrapper = mount(vnode.type, { attachTo: document.body, props: vnode.props })
    await vi.runOnlyPendingTimersAsync()
    await Promise.resolve()

    const km = mindMocks.instances[0]
    expect(km.importData).toHaveBeenLastCalledWith('text', 'mind-map.convert-error')

    const div = wrapper.element.querySelector('.mind-map') as HTMLElement
    const stopPropagation = vi.fn()
    div.dispatchEvent(new WheelEvent('mousewheel') as any)
    await nextTick()
    div.dispatchEvent(new FocusEvent('focus'))
    div.dispatchEvent(Object.assign(new WheelEvent('mousewheel'), { stopPropagation }))
    expect(stopPropagation).not.toHaveBeenCalled()
    div.dispatchEvent(new FocusEvent('blur'))
    div.dispatchEvent(Object.assign(new WheelEvent('mousewheel'), { stopPropagation }))
    expect(stopPropagation).toHaveBeenCalled()
  })
})

describe('markdown plantuml extra component and export branches', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('plantuml image component uses placeholder, applies loaded style, and debounces source changes', async () => {
    const md = new MarkdownIt()
    markdownPlantuml.register(createPlantCtx(md))
    const fence = md.renderer.rules.fence!
    const vnode: any = fence([
      { info: 'plantuml', content: '@startuml\nA -> B\n@enduml', meta: { attrs: { class: 'diagram', alt: 'drop' } } },
    ] as any, 0, md.options, {}, md.renderer as any)
    const renderDirect = vnode.type.setup(vnode.props)
    let directTree: any = renderDirect()
    directTree.children[0].props.onload()
    directTree = renderDirect()
    expect(directTree.children[0].props.style.backgroundImage).toBe('none')
    expect(directTree.children[0].props.style.width).toBe('auto')

    const wrapper = mount(vnode.type, {
      props: vnode.props,
      attachTo: document.body,
    })
    await nextTick()

    let img = wrapper.find('img')
    expect(wrapper.find('p').attributes('class')).toBe('diagram')
    expect(wrapper.find('p').attributes('alt')).toBeUndefined()
    expect(img.attributes('src')).toContain('R0lGODlhAQABAAD')
    await nextTick()
    await nextTick()
    img = wrapper.find('img')
    expect(img.attributes('src')).toContain('/api/plantuml?data=')

    Object.defineProperty(img.element, 'clientWidth', { configurable: true, value: 77 })
    Object.defineProperty(img.element, 'clientHeight', { configurable: true, value: 44 })
    await wrapper.setProps({ src: 'data:image/svg+xml;base64,next' })
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()
    img = wrapper.find('img')
    expect(img.attributes('src')).toContain('R0lGODlhAQABAAD')
    expect((img.element as HTMLImageElement).style.width).toBe('77px')
    expect((img.element as HTMLImageElement).style.height).toBe('44px')

    await vi.runOnlyPendingTimersAsync()
    await nextTick()
    expect(wrapper.find('img').attributes('src')).toBe('data:image/svg+xml;base64,next')
  })

  test('handles empty uml source and export nodes without src attributes', async () => {
    const md = new MarkdownIt()
    const ctx = createPlantCtx(md)
    markdownPlantuml.register(ctx)
    const fence = md.renderer.rules.fence!
    const vnode: any = fence([{ info: 'plantuml', content: '', meta: {} }] as any, 0, md.options, {}, md.renderer as any)
    expect(vnode.props.src).toContain('data:image/svg+xml;base64')

    const node = document.createElement('img')
    node.setAttribute('style', 'width: 10px')
    const hook = ctx.hooks.get('VIEW_ON_GET_HTML_FILTER_NODE')!
    await hook({ node, options: { preferPng: true, inlineLocalImage: true } })
    expect(node.getAttribute('style')).toBe('width: 10px')
    expect(ctx.api.fetchHttp).not.toHaveBeenCalled()
  })
})
