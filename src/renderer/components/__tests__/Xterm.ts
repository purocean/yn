import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  flagDisableXterm: false,
  flagDemo: false,
  isWindows: false,
  colorScheme: 'light',
  openWindow: vi.fn(),
  t: vi.fn((key: string) => key),
  registerHook: vi.fn(),
  removeHook: vi.fn(),
  themeHandler: undefined as any,
  io: vi.fn(),
  sockets: [] as any[],
  terminals: [] as any[],
  fitAddons: [] as any[],
  webLinksAddons: [] as any[],
  webglAddons: [] as any[],
  resizeObservers: [] as any[],
  loggerWarn: vi.fn(),
  TerminalMock: class {
    cols = 80
    rows = 24
    options: any
    resizeHandler?: Function
    dataHandler?: Function
    loadAddon = vi.fn()
    open = vi.fn()
    onResize = vi.fn((handler: Function) => { this.resizeHandler = handler })
    onData = vi.fn((handler: Function) => { this.dataHandler = handler })
    write = vi.fn()
    resize = vi.fn()
    focus = vi.fn()
    dispose = vi.fn()

    constructor (options: any) {
      this.options = options
      mocks.terminals.push(this)
    }
  },
  FitAddonMock: class {
    fit = vi.fn()
    constructor () {
      mocks.fitAddons.push(this)
    }
  },
  WebLinksAddonMock: class {
    constructor (public handler: Function) {
      mocks.webLinksAddons.push(this)
    }
  },
  WebglAddonMock: class {
    constructor () {
      mocks.webglAddons.push(this)
    }
  },
  ResizeObserverMock: class {
    observe = vi.fn()
    disconnect = vi.fn()
    constructor (public callback: Function) {
      mocks.resizeObservers.push(this)
    }
  },
}))

vi.mock('socket.io-client', () => ({
  default: mocks.io,
}))

vi.mock('@xterm/xterm', () => ({
  Terminal: mocks.TerminalMock,
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: mocks.FitAddonMock,
}))

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: mocks.WebLinksAddonMock,
}))

vi.mock('@xterm/addon-webgl', () => ({
  WebglAddon: mocks.WebglAddonMock,
}))

vi.mock('xterm-theme', () => ({
  OneHalfLight: {},
  OneHalfDark: {},
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => ({ warn: mocks.loggerWarn }),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => {
    mocks.registerHook(name, handler)
    if (name === 'THEME_CHANGE') {
      mocks.themeHandler = handler
    }
  },
  removeHook: mocks.removeHook,
}))

vi.mock('@fe/support/args', () => ({
  $args: () => new Map([['port', '9876']]),
  get FLAG_DEMO () { return mocks.flagDemo },
  get FLAG_DISABLE_XTERM () { return mocks.flagDisableXterm },
}))

vi.mock('@fe/services/theme', () => ({
  getColorScheme: () => mocks.colorScheme,
}))

vi.mock('@fe/support/env', () => ({
  get isWindows () { return mocks.isWindows },
  openWindow: mocks.openWindow,
}))

vi.mock('@fe/services/i18n', () => ({
  t: mocks.t,
}))

import Xterm from '../Xterm.vue'

const createSocket = () => {
  const handlers = new Map<string, Function>()
  const socket = {
    connected: false,
    io: { opts: { query: undefined as any } },
    emit: vi.fn(),
    on: vi.fn((name: string, handler: Function) => handlers.set(name, handler)),
    connect: vi.fn(() => { socket.connected = true }),
    disconnect: vi.fn(() => { socket.connected = false }),
    handlers,
  }
  mocks.sockets.push(socket)
  return socket
}

beforeEach(() => {
  mocks.flagDisableXterm = false
  mocks.flagDemo = false
  mocks.isWindows = false
  mocks.colorScheme = 'light'
  mocks.openWindow.mockClear()
  mocks.t.mockClear()
  mocks.registerHook.mockClear()
  mocks.removeHook.mockClear()
  mocks.themeHandler = undefined
  mocks.io.mockReset()
  mocks.io.mockImplementation(createSocket)
  mocks.sockets.length = 0
  mocks.terminals.length = 0
  mocks.fitAddons.length = 0
  mocks.webLinksAddons.length = 0
  mocks.webglAddons.length = 0
  mocks.resizeObservers.length = 0
  mocks.loggerWarn.mockClear()
  ;(globalThis as any).ResizeObserver = mocks.ResizeObserverMock
})

describe('Xterm', () => {
  test('initializes terminal, socket, addons, resize handling and disposal', async () => {
    const onDisconnect = vi.fn()
    const wrapper = mount(Xterm)

    ;(wrapper.vm as any).init({ cwd: '/repo', env: { A: '1' }, onDisconnect })

    expect(mocks.terminals).toHaveLength(1)
    expect(mocks.fitAddons[0].fit).toHaveBeenCalledTimes(1)
    expect(mocks.registerHook).toHaveBeenCalledWith('THEME_CHANGE', expect.any(Function))
    expect(mocks.io).toHaveBeenCalledWith(expect.any(String), {
      path: '/ws',
      query: { cwd: '/repo', env: '{"A":"1"}' },
    })

    const term = mocks.terminals[0]
    const socket = mocks.sockets[0]
    expect(term.open).toHaveBeenCalled()
    expect(term.resize).toHaveBeenCalledWith(80, 80)
    expect(term.focus).toHaveBeenCalled()
    expect(socket.connect).toHaveBeenCalled()

    term.resizeHandler({ cols: 100, rows: 40 })
    term.dataHandler('abc')
    expect(socket.emit).toHaveBeenCalledWith('resize', [100, 40])
    expect(socket.emit).toHaveBeenCalledWith('input', 'abc')

    ;(wrapper.vm as any).input('ls', true)
    expect(socket.emit).toHaveBeenCalledWith('input', 'ls')
    expect(socket.emit).toHaveBeenCalledWith('input', '\n')

    socket.handlers.get('output')?.('chunk')
    expect(term.write).toHaveBeenCalledWith('chunk')

    mocks.resizeObservers[0].callback([{ contentRect: { width: 1, height: 100 } }])
    expect(wrapper.emitted('fit')).toBeUndefined()
    mocks.resizeObservers[0].callback([{ contentRect: { width: 100, height: 100 } }])
    expect(wrapper.emitted('fit')).toHaveLength(1)

    mocks.webLinksAddons[0].handler(new MouseEvent('click'), 'https://example.com')
    expect(mocks.openWindow).toHaveBeenCalledWith('https://example.com')

    socket.handlers.get('disconnect')?.()
    expect(onDisconnect).toHaveBeenCalled()
    expect(term.dispose).toHaveBeenCalled()
    expect(mocks.removeHook).toHaveBeenCalledWith('THEME_CHANGE', mocks.themeHandler)
  })

  test('supports demo and disabled modes without opening a socket', () => {
    mocks.flagDemo = true
    const demoWrapper = mount(Xterm)

    ;(demoWrapper.vm as any).init()
    expect(mocks.terminals[0].write).toHaveBeenCalledWith('demo-tips')
    expect(mocks.io).not.toHaveBeenCalled()

    demoWrapper.unmount()
    mocks.terminals.length = 0
    mocks.flagDemo = false
    mocks.flagDisableXterm = true

    const disabledWrapper = mount(Xterm)
    ;(disabledWrapper.vm as any).init()
    expect(mocks.terminals).toHaveLength(0)
    expect(mocks.loggerWarn).toHaveBeenCalledWith('xterm disabled')
  })
})
