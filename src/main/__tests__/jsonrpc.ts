/* eslint-disable import/first */
jest.mock('electron', () => ({
  app: {
    isPackaged: false
  },
  ipcMain: {
    on: jest.fn()
  }
}))

jest.mock('jsonrpc-bridge', () => {
  return {
    JSONRPCClient: jest.fn().mockImplementation((channel, options) => {
      return {
        channel,
        options,
        call: jest.fn()
      }
    }),
    JSONRPCClientChannel: jest.fn(),
    JSONRPCError: class JSONRPCError extends Error {},
    JSONRPCRequest: jest.fn(),
    JSONRPCResult: jest.fn()
  }
})

import { app } from 'electron'

import { initJSONRPCClient } from '../jsonrpc'
import { JSONRPCClient } from 'jsonrpc-bridge'
/* eslint-enable import/first */

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
