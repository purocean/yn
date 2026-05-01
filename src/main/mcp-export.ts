import { BrowserWindow } from 'electron'
import * as fs from 'fs-extra'
import * as mime from 'mime'
import config from './config'
import { getAction } from './action'
import { buildAppUrl } from './url'

type ConvertOpts = {
  fromType: 'markdown' | 'html',
  toType: 'docx' | 'html' | 'rst' | 'adoc' | 'pdf',
  fromHtmlOptions?: Record<string, any>,
  pdfOptions?: Record<string, any>,
}

export type McpExportDocumentArgs = {
  repo?: string,
  path?: string,
  absolutePath?: string,
  options: ConvertOpts,
  outputPath?: string,
  renderTimeout?: number,
  imageTimeout?: number,
  resourceTimeout?: number,
}

let exporting = false

function validateInputPath (args: McpExportDocumentArgs) {
  if (args.absolutePath) {
    return
  }

  if (args.repo && args.path) {
    return
  }

  throw new Error('Either absolutePath or both repo and path are required.')
}

function getExportWindowUrl (args: McpExportDocumentArgs) {
  const mode = getAction('get-url-mode')?.() || 'scheme'
  const backendPort = getAction('get-backend-port')?.() || config.get('server.port', 3044)
  const devFrontendPort = getAction('get-dev-frontend-port')?.() || 8066
  validateInputPath(args)

  return buildAppUrl({
    mode,
    backendPort,
    devFrontendPort,
    includeArgParams: false,
    extraSearchParams: {
      'mcp-export': 'true',
      'mcp-export-repo': args.repo,
      'mcp-export-path': args.path,
      'mcp-export-absolute-path': args.absolutePath,
    },
  })
}

function waitForWindowLoaded (win: BrowserWindow) {
  return new Promise<void>((resolve, reject) => {
    win.webContents.once('did-finish-load', () => resolve())
    win.webContents.once('did-fail-load', (_event, _code, description) => reject(new Error(description)))
  })
}

function sleep (ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForExportBridge (win: BrowserWindow, timeout: number) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeout) {
    const ready = await win.webContents.executeJavaScript('typeof window.__YANK_NOTE_MCP_EXPORT__ === "function"', true)

    if (ready) {
      return
    }

    await sleep(100)
  }

  throw new Error('MCP export bridge is not ready.')
}

export async function exportDocumentForMcp (args: McpExportDocumentArgs) {
  if (exporting) {
    throw new Error('Another MCP document export is already in progress.')
  }

  exporting = true
  let win: BrowserWindow | undefined

  try {
    win = new BrowserWindow({
      width: 1200,
      height: 900,
      show: false,
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        contextIsolation: false,
      },
    })

    const loaded = waitForWindowLoaded(win)
    await win.loadURL(getExportWindowUrl(args))
    await loaded
    await waitForExportBridge(win, args.renderTimeout || 20000)

    const result = await win.webContents.executeJavaScript(
      `window.__YANK_NOTE_MCP_EXPORT__.apply(null, ${JSON.stringify([args.options, {
        renderTimeout: args.renderTimeout,
        imageTimeout: args.imageTimeout,
        resourceTimeout: args.resourceTimeout,
      }])})`,
      true
    )
    result.mimeType = result.mimeType || mime.getType(result.fileName) || 'application/octet-stream'

    if (args.outputPath) {
      await fs.outputFile(args.outputPath, Buffer.from(result.base64, 'base64'))
      return {
        ...result,
        base64: undefined,
        outputPath: args.outputPath,
      }
    }

    return result
  } finally {
    exporting = false
    win?.destroy()
  }
}
