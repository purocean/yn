import { app, ipcMain } from 'electron'
import { JSONRPCClient, JSONRPCClientChannel, JSONRPCError, JSONRPCRequest, JSONRPCResult } from 'jsonrpc-bridge'

type Ctx = {
  setting: {
    showSettingPanel: (key?: string) => void
  },
  doc: {
    switchDocByPath: (path: string) => Promise<void>
  },
  base: {
    triggerDeepLinkOpen: (url: string) => Promise<void>
  }
}

class ElectronMainClientChannel implements JSONRPCClientChannel {
  webContent: Electron.WebContents

  constructor (webContent: Electron.WebContents) {
    this.webContent = webContent
  }

  send (message: JSONRPCRequest<any[]>): void {
    this.webContent.send('jsonrpc', message)
  }

  setMessageHandler (callback: (message: Partial<JSONRPCResult<any> & JSONRPCError>) => void): void {
    ipcMain.on('jsonrpc', (_event, message) => {
      callback(message)
    })
  }
}

export let jsonRPCClient: JSONRPCClient<{ ctx: Ctx }>

export function initJSONRPCClient (webContent: Electron.WebContents) {
  const clientChannel: JSONRPCClientChannel = new ElectronMainClientChannel(webContent)
  jsonRPCClient = new JSONRPCClient(clientChannel, { debug: !app.isPackaged })
}
