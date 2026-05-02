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
  const style = { outerHTML: '<link href="/kity/kityminder.core.css">' }
  const script1 = { outerHTML: '<script src="/kity/kity.min.js"></script>', onload: null as null | Function }
  const script2 = { outerHTML: '<script src="/kity/kityminder.core.min.js"></script>' }
  mocks.addStyleLink.mockResolvedValue(style)
  mocks.addScript.mockResolvedValueOnce(script1).mockResolvedValueOnce(script2)

  const ctx = {
    editor: {
      tapSimpleCompletionItems: vi.fn((fn: Function) => fn([])),
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
  } as any

  return ctx
}

function installFakeMinder (importData = vi.fn(async () => undefined)) {
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
    importData = importData
    exportData = vi.fn(async (type: string) => `export:${type}`)
    setup = vi.fn()
    disable = vi.fn()
    setOption = vi.fn()
    setTemplate = vi.fn((template: string) => { this.template = template })
    disableAnimation = vi.fn()
    enableAnimation = vi.fn()
    execCommand = vi.fn()
    importJson = vi.fn()
    importNode = vi.fn((_node: any, json: any) => json)
    destroy = vi.fn()
    focus = vi.fn()

    constructor () {
      mocks.minderInstances.push(this)
    }

    getTemplate () {
      return this.template
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

describe('markdown-mind-map plugin extra branches', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.addScript.mockReset()
    mocks.addStyleLink.mockReset()
    mocks.registerHook.mockReset()
    mocks.removeHook.mockReset()
    mocks.storageGet.mockReset()
    mocks.storageSet.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('imports convert-error text and cameras when kityminder import fails', async () => {
    const importData = vi.fn()
      .mockRejectedValueOnce(new Error('bad mindmap'))
      .mockResolvedValue(undefined)
    installFakeMinder(importData)
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownMindMap.register(ctx)
    const source = '+ Root{.mindmap}\n    + Child\n'
    const vnode: any = md.renderer.rules.bullet_list_open!([
      { map: [0, 2], meta: { attrs: {} } },
      { attrGet: vi.fn(() => 'mindmap') },
    ] as any, 0, md.options, { bMarks: lineStarts(source), source }, { renderToken: vi.fn() } as any)

    const wrapper = mount(vnode.type, { attachTo: document.body, props: vnode.props })
    await vi.runOnlyPendingTimersAsync()
    await Promise.resolve()
    await Promise.resolve()

    const km = mocks.minderInstances[0]
    expect(importData).toHaveBeenNthCalledWith(1, 'text', 'Root\n    Child')
    expect(importData).toHaveBeenNthCalledWith(2, 'text', 'mind-map.convert-error')
    expect(km.execCommand).toHaveBeenCalledWith('camera')
    wrapper.unmount()
  })

  test('html export hook replaces mind-map nodes with svg data urls by default', async () => {
    installFakeMinder()
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownMindMap.register(ctx)
    const source = '+ Root{.mindmap}\n'
    const vnode: any = md.renderer.rules.bullet_list_open!([
      { map: [0, 1], meta: { attrs: {} } },
      { attrGet: vi.fn(() => 'mindmap') },
    ] as any, 0, md.options, { bMarks: lineStarts(source), source }, { renderToken: vi.fn() } as any)

    const wrapper = mount(vnode.type, { attachTo: document.body, props: vnode.props })
    await vi.runOnlyPendingTimersAsync()
    await Promise.resolve()
    await Promise.resolve()

    const node = wrapper.element.querySelector('.mind-map') as HTMLElement
    const hook = ctx.hooks.get('VIEW_ON_GET_HTML_FILTER_NODE')!
    await hook({ node, options: {} })

    expect(document.body.innerHTML).toContain('src="data:image/svg+xml;base64,base64:export:svg"')
    wrapper.unmount()
  })
})
