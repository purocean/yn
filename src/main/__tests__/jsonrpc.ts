import { app } from 'electron'

import { initJSONRPCClient } from '../jsonrpc'

jest.mock('electron', () => ({
  app: {
    isPackaged: false
  },
  ipcMain: {
    on: jest.fn()
  }
}))

const MockJSONRPCClient = jest.fn().mockImplementation((channel, options) => {
  return {
    channel,
    options,
    call: jest.fn()
  }
})

jest.mock('jsonrpc-bridge', () => {
  return {
    JSONRPCClient: MockJSONRPCClient,
    JSONRPCClientChannel: jest.fn(),
    JSONRPCError: class JSONRPCError extends Error {},
    JSONRPCRequest: jest.fn(),
    JSONRPCResult: jest.fn()
  }
})

describe('jsonrpc module', () => {
  let mockWebContent: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockWebContent = {
      send: jest.fn()
    }
  })

  describe('initJSONRPCClient', () => {
    test('should initialize JSONRPC client with web content', () => {
      initJSONRPCClient(mockWebContent)

      expect(MockJSONRPCClient).toHaveBeenCalled()
    })

    test('should create client with debug mode when app is not packaged', () => {
      (app as any).isPackaged = false
      initJSONRPCClient(mockWebContent)

      expect(MockJSONRPCClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ debug: true })
      )
    })

    test('should create client without debug mode when app is packaged', () => {
      (app as any).isPackaged = true
      initJSONRPCClient(mockWebContent)

      expect(MockJSONRPCClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ debug: false })
      )
    })
  })
})
