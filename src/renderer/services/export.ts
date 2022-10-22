import { MARKDOWN_FILE_EXT } from '@share/misc'
import { triggerHook } from '@fe/core/hook'
import { buildSrc } from '@fe/support/embed'
import { getElectronRemote, isElectron, isWindows, openWindow } from '@fe/support/env'
import store from '@fe/support/store'
import type { ConvertOpts, ExportType, PrintOpts } from '@fe/types'
import { sleep } from '@fe/utils'
import * as api from '@fe/support/api'
import { basename, dirname } from '@fe/utils/path'
import { getRepo } from './base'
import { getContentHtml, getPreviewStyles, getRenderIframe } from './view'

async function wrapExportProcess<T extends () => any> (type: ExportType, fn: T): Promise<ReturnType<T>> {
  try {
    await triggerHook('EXPORT_BEFORE_PREPARE', { type }, { breakable: true })
    return await fn()
  } finally {
    triggerHook('EXPORT_AFTER_PREPARE', { type })
  }
}

function buildHtml (title: string, body: string, options: { includeStyle: boolean }) {
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang xml:lang>
  <head>
    <meta charset="utf-8" />
    <meta name="generator" content="Yank Note" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
    <title>${title}</title>
    ${
      options.includeStyle
      ? `<style>
          ${getPreviewStyles()}
        </style>`
      : ''
    }
  </head>
  <body>
    ${body}
    <link href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.15.3/katex.min.css" rel="stylesheet" />
  </body>
</html>`
}

/**
 * Toggle export panel visible.
 * @param visible
 */
export function toggleExportPanel (visible?: boolean) {
  store.commit('setShowExport', typeof visible === 'boolean' ? visible : !store.state.showExport)
}

/**
 * Print current document.
 */
export async function printCurrentDocument () {
  wrapExportProcess('print', async () => {
    const iframe = await getRenderIframe()
    iframe.contentWindow!.print()
  })
}

/**
 * Print current document to PDF.
 * @param opts
 * @returns
 */
export async function printCurrentDocumentToPDF (opts?: PrintOpts): Promise<Buffer> {
  if (!isElectron) {
    throw new Error('Not support export pdf in browser.')
  }

  const [styles, appHTML] = await wrapExportProcess('pdf', async () => {
    const iframe = await getRenderIframe()
    const appHTML = iframe.contentDocument!.getElementById('app')!.innerHTML
    let styles = ''
    iframe.contentDocument!.querySelectorAll('link,style').forEach(node => {
      styles += node.outerHTML
    })

    return [styles, appHTML]
  })

  const id = '__export_pdf__' + Date.now()
  const url = buildSrc(`
    <style> @media screen { html { overflow: hidden; min-width: 16cm; } } </style>
    <div class="skip-print" style="position: fixed; left: 0; top: 0; width: 100vw; height: 100%; z-index: 99999; background: #fff; color: #24292f; display: flex; align-items: center; justify-content: center;">Exporting……</div>
    <div id="app"></div>
  `, 'Export PDF', { id, globalStyle: true })

  const win = openWindow(url, 'export-pdf', {
    width: 300,
    height: 100,
    title: '',
    x: undefined,
    y: undefined,
    center: true,
    resizable: false,
    minimizable: false,
    closable: false,
    modal: true,
    alwaysOnTop: false,
  })

  if (!win) {
    return Promise.reject(new Error('Open window failed.'))
  }

  let browserWin: any

  return new Promise((resolve, reject) => {
    win.addEventListener('load', async () => {
      try {
        const remote = getElectronRemote()
        browserWin = remote.BrowserWindow.getAllWindows()
          .find((item: any) => item.getURL().includes(`_id=${id}`))
        browserWin.setParentWindow(remote.getCurrentWindow())

        win.document.head.innerHTML += styles
        win.document.getElementById('app')!.innerHTML = appHTML

        await sleep(1500)

        const webContents = remote.webContents.getAllWebContents()
          .find((item: any) => item.getURL().includes(`_id=${id}`))

        const data = await webContents!.printToPDF(opts || {})
        resolve(data)
      } catch (error) {
        reject(error)
      } finally {
        browserWin && browserWin.destroy()
      }
    })
  })
}

/**
 * Convert current document.
 * @returns
 */
export async function convertCurrentDocument (opts: ConvertOpts): Promise<Blob> {
  const currentFile = store.state.currentFile

  if (!currentFile) {
    throw new Error('No current file.')
  }

  const fileName = basename(currentFile.name || 'export.md', MARKDOWN_FILE_EXT)

  // export html directly
  if (opts.fromType === 'html' && opts.toType === 'html') {
    const html = await wrapExportProcess('html', () => getContentHtml(opts.fromHtmlOptions))
    return new Blob([
      buildHtml(fileName, html, opts.fromHtmlOptions || { includeStyle: false })
    ], { type: 'text/html' })
  }

  const source = opts.fromType === 'markdown'
    ? (currentFile?.content || '')
    : await wrapExportProcess(opts.toType, () => getContentHtml({
      preferPng: true,
      nodeProcessor: node => {
        // for pandoc highlight code
        if (node.tagName === 'PRE' && node.dataset.lang) {
          node.classList.add('sourceCode', node.dataset.lang)
        }

        // remove katex-html
        if (node.classList.contains('katex-html')) {
          node.remove()
        }
      }
    }))

  // use for pandoc
  const resourcePath = [
    getRepo(currentFile.repo)?.path || '.',
    dirname(currentFile.absolutePath || '')
  ].join(isWindows ? ';' : ':')

  const res = await api.convertFile(source, opts.fromType, opts.toType, resourcePath)

  if (res.status !== 200) {
    throw new Error(res.statusText)
  }

  return res.blob()
}
