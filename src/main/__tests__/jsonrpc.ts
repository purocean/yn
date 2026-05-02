/* eslint-disable import/first */
vi.mock('electron', () => ({
  app: {
    isPackaged: false
  },
  ipcMain: {
    on: vi.fn()
  }
}))

vi.mock('jsonrpc-bridge', () => {
  return {
    JSONRPCClient: vi.fn().mockImplementation(function (this: any, channel, options) {
      this.channel = channel
      this.options = options
      this.call = vi.fn()
    }),
    JSONRPCClientChannel: vi.fn(),
    JSONRPCError: class JSONRPCError extends Error {},
    JSONRPCRequest: vi.fn(),
    JSONRPCResult: vi.fn()
  }
})

import { app, ipcMain } from 'electron'

import { initJSONRPCClient } from '../jsonrpc'
import { JSONRPCClient } from 'jsonrpc-bridge'
/* eslint-enable import/first */

describe('jsonrpc module', () => {
  let mockWebContent: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockWebContent = {
      send: vi.fn()
    }
  })

  describe('initJSONRPCClient', () => {
    test('should initialize JSONRPC client with web content', () => {
      initJSONRPCClient(mockWebContent)

      expect(JSONRPCClient).toHaveBeenCalled()
    })

    test('should create client with debug mode when app is not packaged', () => {
      (app as any).isPackaged = false
      initJSONRPCClient(mockWebContent)

      expect(JSONRPCClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ debug: true })
      )
    })

    test('should create client without debug mode when app is packaged', () => {
      (app as any).isPackaged = true
      initJSONRPCClient(mockWebContent)

      expect(JSONRPCClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ debug: false })
      )
    })

    test('should send messages through webContents and subscribe to ipcMain replies', () => {
      initJSONRPCClient(mockWebContent)

      const client = vi.mocked(JSONRPCClient).mock.instances[0] as any
      client.channel.send({ id: 1, method: 'ping', params: [] })
      expect(mockWebContent.send).toHaveBeenCalledWith('jsonrpc', { id: 1, method: 'ping', params: [] })

      const callback = vi.fn()
      client.channel.setMessageHandler(callback)
      expect(ipcMain.on).toHaveBeenCalledWith('jsonrpc', expect.any(Function))

      const handler = vi.mocked(ipcMain.on).mock.calls[0][1]
      handler({}, { id: 1, result: 'pong' })
      expect(callback).toHaveBeenCalledWith({ id: 1, result: 'pong' })
    })
  })
})
