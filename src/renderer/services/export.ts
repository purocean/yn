/* eslint-disable no-irregular-whitespace */
import { escape } from 'lodash-es'
import { MARKDOWN_FILE_EXT } from '@share/misc'
import { triggerHook } from '@fe/core/hook'
import { buildSrc } from '@fe/support/embed'
import { getElectronRemote, isElectron, isWindows, openWindow } from '@fe/support/env'
import store from '@fe/support/store'
import type { ConvertOpts, ExportType, PrintOpts } from '@fe/types'
import { sleep } from '@fe/utils'
import * as api from '@fe/support/api'
import { basename, dirname } from '@fe/utils/path'
import { getRepo } from './repo'
import { t } from './i18n'
import { getContentHtml, getHeadings, getPreviewStyles, getRenderEnv, getRenderIframe } from './view'

function buildHtml (title: string, body: string, options: { includeStyle: boolean, includeToc: number[] }) {
  const hasToc = options.includeToc.length > 0
  const headingNumber = !!(getRenderEnv()?.attributes?.headingNumber)

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang xml:lang>
  <head>
    <meta charset="utf-8" />
    <meta name="generator" content="Yank Note" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
    <title>${escape(title)}</title>
    ${
      options.includeStyle
      ? `<style>
          ${getPreviewStyles()}
        </style>`
      : ''
    }
    ${hasToc ? `<style>
      body {
        padding-left: 240px;
      }

      #yn-article-toc ul.heading-number { counter-reset: l2counter 0 l3counter 0 l4counter 0 l5counter 0 l6counter 0; }

      #yn-article-toc ul.heading-number li[data-level="0"] { counter-set: l2counter 0; }
      #yn-article-toc ul.heading-number li[data-level="1"] { counter-set: l3counter 0; }
      #yn-article-toc ul.heading-number li[data-level="2"] { counter-set: l4counter 0; }
      #yn-article-toc ul.heading-number li[data-level="3"] { counter-set: l5counter 0; }
      #yn-article-toc ul.heading-number li[data-level="4"] { counter-set: l6counter 0; }
      #yn-article-toc ul.heading-number li[data-level="1"]::before { counter-increment: l2counter 1; content: counter(l2counter) ".  "; }
      #yn-article-toc ul.heading-number li[data-level="2"]::before { counter-increment: l3counter 1; content: counter(l2counter) "." counter(l3counter) ".  "; }
      #yn-article-toc ul.heading-number li[data-level="3"]::before { counter-increment: l4counter 1; content: counter(l2counter) "." counter(l3counter) "." counter(l4counter) ".  "; }
      #yn-article-toc ul.heading-number li[data-level="4"]::before { counter-increment: l5counter 1; content: counter(l2counter) "." counter(l3counter) "." counter(l4counter) "." counter(l5counter) ".  "; }
      #yn-article-toc ul.heading-number li[data-level="5"]::before { counter-increment: l6counter 1; content: counter(l2counter) "." counter(l3counter) "." counter(l4counter) "." counter(l5counter) "." counter(l6counter) ".  "; }

      #yn-article-toc {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 220px;
        box-sizing: border-box;
        overflow-y: auto;
        padding: 1em;
        background: #f8f9fa;
        border-left: 1px solid #e9ecef;
        z-index: 1000;
      }

      #yn-article-toc > .toc-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 1em;
      }

      #yn-article-toc ul {
        list-style: none;
        padding-left: 0;
      }

      #yn-article-toc li {
        margin-bottom: 0.5em;
        font-size: 14px;
      }

      #yn-article-toc li.current a {
        font-weight: bold;
        color: #007bff;
      }

      #yn-article-toc a {
        color: #333;
        text-decoration: none;
      }

      #yn-article-toc a:hover {
        text-decoration: underline;
      }
    </style>` : ''}
  </head>
  <body>
    ${body}
    ${hasToc ? `
      <nav id="yn-article-toc">
          <div class="toc-title">${t('table-of-contents')}</div>
          <ul class="${headingNumber ? 'heading-number' : ''}">
          ${getHeadings(false).filter(heading => options.includeToc.includes(heading.level)).map(heading => `<li data-level="${heading.level}" data-id="${heading.sourceLine}-${escape(heading.id)}" style="padding-left: ${heading.level}em">
            <a href="#${heading.sourceLine}-${escape(heading.id)}">
              ${escape(heading.text)}
            </a>
          </li>`).join('\n')}
        </ul>
      </nav>
      <script>
        function listenToc () {
          const records = {};

          const toc = document.querySelector('#yn-article-toc')
          const article = document.querySelector('body > article')

          function updateCurrent (id) {
            console.log('update toc highlight', id)

            const items = [...toc.querySelectorAll('li')]

            if (!items.find(item => item.dataset.id === id)) {
              return
            }

            items.forEach((element) => {
              if (element.dataset.id === id) {
                element.classList.add('current')
              } else {
                element.classList.remove('current')
              }
            })
          }

          const tocObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              records[entry.target.id] = entry.intersectionRatio;
            })

            const ids = Object.keys(records)
            let current = ids[0]

            for (let i = 1; i < ids.length; i++) {
              if (records[ids[i]] > records[current]) {
                current = ids[i]
              }
            }

            updateCurrent(current)
          },{
            root: document,
            threshold: new Array(101).fill().map((x, i) => i / 100),
          })

          article.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((element) => {
            element.id = element.dataset.sourceLine + '-' + element.id
            tocObserver.observe(element)
          });

          toc.addEventListener('click', (event) => {
            const target = event.target
            if (target.tagName === 'A' && target.parentElement.dataset.id) {
              setTimeout(() => {
                updateCurrent(target.parentElement.dataset.id)
              }, 50)
            }
          })
        }

        setTimeout(listenToc, 0);
      </script>
    ` : ''}
    <link href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.15.3/katex.min.css" rel="stylesheet" />
  </body>
</html>`
}

/**
 * Toggle export panel visible.
 * @param visible
 */
export function toggleExportPanel (visible?: boolean) {
  store.state.showExport = typeof visible === 'boolean' ? visible : !store.state.showExport
}

/**
 * Wrap export process.
 * @param type
 * @param fn
 * @returns
 */
async function wrapExportProcess<T extends () => any> (type: ExportType, fn: T): Promise<ReturnType<T>> {
  try {
    await triggerHook('EXPORT_BEFORE_PREPARE', { type }, { breakable: true })
    return await fn()
  } finally {
    triggerHook('EXPORT_AFTER_PREPARE', { type })
  }
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
    <div class="skip-print" style="position: fixed; left: 0; top: 0; width: 100vw; height: 100%; z-index: 210000000; background: #fff; color: #24292f; display: flex; align-items: center; justify-content: center;">Exporting……</div>
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
    const html = await wrapExportProcess('html', () => getContentHtml({
      ...opts.fromHtmlOptions,
      nodeProcessor: node => {
        if (node.tagName === 'IFRAME' && !/https?:\/\//.test(node.getAttribute('src') || '')) {
          node.outerHTML = '<i style="border: 1px solid lightgray">This iframe is not supported in export.</i>'
        }
      }
    }))
    return new Blob([
      buildHtml(fileName, html, opts.fromHtmlOptions || { includeStyle: false, includeToc: [] })
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

        // remove unsupported iframe
        if (node.tagName === 'IFRAME' && !/https?:\/\//.test(node.getAttribute('src') || '')) {
          node.outerHTML = '<i style="border: 1px solid lightgray">This iframe is not supported in export.</i>'
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
