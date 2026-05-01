import { MARKDOWN_FILE_EXT } from '@share/misc'
import type { Ctx, Plugin } from '@fe/context'
import type { ConvertOpts, PrintOpts } from '@fe/types'
import { basename } from '@fe/utils/path'

type WaitOptions = {
  renderTimeout?: number,
  imageTimeout?: number,
  resourceTimeout?: number,
}

type FromHtmlOptions = NonNullable<ConvertOpts['fromHtmlOptions']>

type ExportOptions = Omit<ConvertOpts, 'fromHtmlOptions'> & {
  fromHtmlOptions?: Partial<FromHtmlOptions>,
} | {
  fromType?: 'markdown' | 'html',
  toType: 'pdf',
  fromHtmlOptions?: Partial<FromHtmlOptions>,
  pdfOptions?: PrintOpts,
}

type NormalizedExportOptions = ConvertOpts | {
  fromType: 'markdown' | 'html',
  toType: 'pdf',
  fromHtmlOptions?: FromHtmlOptions,
  pdfOptions: PrintOpts,
}

const exportBridgeName = '__YANK_NOTE_MCP_EXPORT__'
const iframeLoadTimeout = 10000
const defaultFromHtmlOptions = {
  inlineLocalImage: true,
  uploadLocalImage: false,
  inlineStyle: false,
  includeStyle: true,
  highlightCode: true,
  codeLineNumbers: true,
  codeCopyButton: true,
  includeToc: [] as number[],
}
const defaultPdfOptions: PrintOpts = {
  landscape: false,
  pageSize: 'A4',
  scale: 1,
  printBackground: true,
  generateDocumentOutline: true,
}

async function blobToBase64 (ctx: Ctx, blob: Blob) {
  const dataURL = await ctx.utils.fileToBase64URL(blob)
  return dataURL.slice(dataURL.indexOf(',') + 1)
}

async function waitNextRender (ctx: Ctx, timeout: number) {
  await new Promise<void>((resolve) => {
    let finished = false
    const done = () => {
      if (finished) {
        return
      }

      finished = true
      clearTimeout(timer)
      ctx.removeHook('VIEW_RENDERED', done)
      resolve()
    }
    const timer = setTimeout(done, timeout)

    ctx.registerHook('VIEW_RENDERED', done, true)
    ctx.view.renderImmediately()
  })
}

function waitElementLoad (element: HTMLElement, timeout?: number) {
  return new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const done = () => {
      element.removeEventListener('load', done)
      element.removeEventListener('error', done)
      if (timer) {
        clearTimeout(timer)
      }
      resolve()
    }

    element.addEventListener('load', done, { once: true })
    element.addEventListener('error', done, { once: true })

    if (timeout) {
      timer = setTimeout(done, timeout)
    }
  })
}

function isIframeLoaded (iframe: HTMLIFrameElement) {
  try {
    return iframe.contentDocument?.readyState === 'complete'
  } catch (error) {
    return false
  }
}

function canScan (node: Node): node is ParentNode {
  return node instanceof Element || node instanceof DocumentFragment || node instanceof Document
}

function watchPendingResources (document: Document) {
  const pendingResources = new Map<HTMLElement, Promise<void>>()

  const watchElement = (element: HTMLElement) => {
    if (pendingResources.has(element)) {
      return
    }

    if (element instanceof HTMLImageElement) {
      if (!element.complete) {
        pendingResources.set(element, waitElementLoad(element))
      }
      return
    }

    if (element instanceof HTMLIFrameElement && !isIframeLoaded(element)) {
      pendingResources.set(element, waitElementLoad(element, iframeLoadTimeout))
    }
  }

  const scan = (root: ParentNode) => {
    if (root instanceof HTMLElement) {
      watchElement(root)
    }

    root.querySelectorAll<HTMLElement>('img,iframe').forEach(watchElement)
  }

  scan(document.body)

  return {
    scan,
    wait: async () => {
      await Promise.all(Array.from(pendingResources.values()))
    },
  }
}

function waitDocumentSettled (document: Document, timeout: number, onMutation: (root: ParentNode) => void, quietTime = 500) {
  return new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout>
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (canScan(mutation.target)) {
          onMutation(mutation.target)
        }

        mutation.addedNodes.forEach((node) => {
          if (canScan(node)) {
            onMutation(node)
          }
        })
      })

      clearTimeout(timer)
      timer = setTimeout(done, quietTime)
    })
    const done = () => {
      clearTimeout(timer)
      clearTimeout(timeoutTimer)
      observer.disconnect()
      resolve()
    }
    const timeoutTimer = setTimeout(done, timeout)

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href', 'style', 'class'],
    })
    timer = setTimeout(done, quietTime)
  })
}

async function waitPreviewResources (ctx: Ctx, timeout: number) {
  const iframe = await ctx.view.getRenderIframe()
  const document = iframe.contentDocument
  if (!document) {
    return
  }

  const startedAt = Date.now()
  const pendingResources = watchPendingResources(document)
  await waitDocumentSettled(document, Math.min(3000, timeout), pendingResources.scan)
  const remainingTimeout = Math.max(0, timeout - (Date.now() - startedAt))

  await Promise.race([
    pendingResources.wait(),
    ctx.utils.sleep(remainingTimeout),
  ])
}

async function ensureTargetDocument (ctx: Ctx) {
  const absolutePath = ctx.args.$args().get('mcp-export-absolute-path')
  const repo = ctx.args.$args().get('mcp-export-repo')
  const file = ctx.args.$args().get('mcp-export-path')

  if (absolutePath) {
    await ctx.doc.switchDocByPath(absolutePath)
    return
  }

  if (!file) {
    return
  }

  if (!repo) {
    throw new Error('repo is required when mcp-export-path is provided.')
  }

  await ctx.doc.switchDoc({
    type: 'file',
    repo,
    path: file,
    name: basename(file),
  }, { force: true })
}

function normalizeExportOptions (opts: ExportOptions): NormalizedExportOptions {
  const fromHtmlOptions = opts.fromType === 'html'
    ? {
        ...defaultFromHtmlOptions,
        ...opts.fromHtmlOptions,
      }
    : undefined

  if (opts.toType === 'pdf') {
    return {
      ...opts,
      fromType: opts.fromType ?? 'html',
      fromHtmlOptions,
      pdfOptions: {
        ...defaultPdfOptions,
        ...opts.pdfOptions,
      },
    }
  }

  return {
    ...opts,
    fromHtmlOptions,
  }
}

async function exportCurrentDocument (ctx: Ctx, opts: ExportOptions, waitOptions: WaitOptions = {}) {
  const normalizedOpts = normalizeExportOptions(opts)
  await ctx.whenExtensionInitialized()
  await ensureTargetDocument(ctx)
  await waitNextRender(ctx, waitOptions.renderTimeout ?? 20000)
  await waitPreviewResources(ctx, waitOptions.resourceTimeout ?? waitOptions.imageTimeout ?? 60000)

  const currentFile = ctx.store.state.currentFile
  if (!currentFile) {
    throw new Error('No current file.')
  }

  const fileName = `${basename(currentFile.name || 'export.md', MARKDOWN_FILE_EXT)}.${normalizedOpts.toType}`
  const blob = normalizedOpts.toType === 'pdf'
    ? new Blob([await ctx.export.printCurrentDocumentToPDF(normalizedOpts.pdfOptions, { hidden: true })], { type: 'application/pdf' })
    : await ctx.export.convertCurrentDocument(normalizedOpts)

  return {
    fileName,
    mimeType: blob.type || ctx.lib.mime.getType(fileName) || 'application/octet-stream',
    size: blob.size,
    base64: await blobToBase64(ctx, blob),
  }
}

export default {
  name: 'mcp-export',
  register: (ctx) => {
    if (!ctx.env.isElectron || ctx.args.$args().get('mcp-export') !== 'true') {
      return
    }

    Object.defineProperty(window, exportBridgeName, {
      configurable: true,
      value: (opts: ExportOptions, waitOptions?: WaitOptions) => exportCurrentDocument(ctx, opts, waitOptions),
    })
  }
} as Plugin
