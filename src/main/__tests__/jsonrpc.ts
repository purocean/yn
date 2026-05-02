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

import { app } from 'electron'

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
  })
})
