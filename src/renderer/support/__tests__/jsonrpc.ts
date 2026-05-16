import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

function mockJsonrpcBridge () {
  const servers: any[] = []
  const JSONRPCServer = vi.fn(function (this: any, channel, opts) {
    this.channel = channel
    this.opts = opts
    this.addModule = vi.fn()
    servers.push(this)
  })

  vi.doMock('jsonrpc-bridge', () => ({
    JSONRPCError: class JSONRPCError {},
    JSONRPCRequest: class JSONRPCRequest {},
    JSONRPCResult: class JSONRPCResult {},
    JSONRPCServer,
    JSONRPCServerChannel: class JSONRPCServerChannel {},
  }))

  return { JSONRPCServer, servers }
}

describe('renderer jsonrpc support', () => {
  it('does not initialize a server outside electron', async () => {
    const { JSONRPCServer } = mockJsonrpcBridge()
    vi.doMock('../env', () => ({ isElectron: false, nodeRequire: vi.fn() }))
    vi.doMock('../args', () => ({ FLAG_DEBUG: false }))

    const jsonrpc = await import('../jsonrpc')
    jsonrpc.init({ doc: {} }, Promise.resolve())

    expect(JSONRPCServer).not.toHaveBeenCalled()
  })

  it('registers modules and serializes outgoing electron messages', async () => {
    const { JSONRPCServer, servers } = mockJsonrpcBridge()
    const ipcRenderer = { send: vi.fn(), on: vi.fn() }
    vi.doMock('../env', () => ({
      isElectron: true,
      nodeRequire: vi.fn(() => ({ ipcRenderer })),
    }))
    vi.doMock('../args', () => ({ FLAG_DEBUG: true }))

    const jsonrpc = await import('../jsonrpc')
    jsonrpc.init({ doc: { open: vi.fn() }, repo: { get: vi.fn() } }, Promise.resolve())

    expect(JSONRPCServer).toHaveBeenCalledTimes(1)
    expect(servers[0].opts).toEqual({ debug: true })
    expect(servers[0].addModule).toHaveBeenCalledWith('doc', expect.any(Object))
    expect(servers[0].addModule).toHaveBeenCalledWith('repo', expect.any(Object))

    servers[0].channel.send({ id: 1, result: { ok: true }, transient: undefined, fn: vi.fn() })
    expect(ipcRenderer.send).toHaveBeenCalledWith('jsonrpc', { id: 1, result: { ok: true } })
  })

  it('delays incoming electron messages until app ready resolves', async () => {
    const { servers } = mockJsonrpcBridge()
    let messageHandler: any
    const ipcRenderer = {
      send: vi.fn(),
      on: vi.fn((_channel, callback) => {
        messageHandler = callback
      }),
    }
    vi.doMock('../env', () => ({
      isElectron: true,
      nodeRequire: vi.fn(() => ({ ipcRenderer })),
    }))
    vi.doMock('../args', () => ({ FLAG_DEBUG: false }))

    const jsonrpc = await import('../jsonrpc')
    let resolveReady!: () => void
    const ready = new Promise<void>(resolve => {
      resolveReady = resolve
    })

    jsonrpc.init({}, ready)

    const callback = vi.fn()
    servers[0].channel.setMessageHandler(callback)
    messageHandler({}, { id: 'before-ready' })

    expect(callback).not.toHaveBeenCalled()

    resolveReady()
    await ready
    await Promise.resolve()

    expect(callback).toHaveBeenCalledWith({ id: 'before-ready' })

    messageHandler({}, { id: 'after-ready' })
    expect(callback).toHaveBeenCalledWith({ id: 'after-ready' })
  })
})
