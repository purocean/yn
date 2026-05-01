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

type HtmlExportOptions = Partial<NonNullable<ConvertOpts['fromHtmlOptions']>>

function getCodeBlockText (code: HTMLElement, lineNumberTable: HTMLElement | null) {
  if (!lineNumberTable) {
    return code.textContent || ''
  }

  return Array.from(lineNumberTable.querySelectorAll<HTMLElement>('.hljs-ln-code .hljs-ln-line'))
    .map(line => line.textContent === ' ' ? '' : line.textContent || '')
    .join('\n')
}

function enhanceCodeBlocks (body: string, options: HtmlExportOptions) {
  if (!options.codeLineNumbers && !options.codeCopyButton) {
    return body
  }

  const container = document.createElement('div')
  container.innerHTML = body

  container.querySelectorAll<HTMLPreElement>('pre').forEach(pre => {
    const code = pre.querySelector('code')
    if (!code) {
      return
    }

    const lineNumberTable = code.querySelector<HTMLElement>('table.hljs-ln')
    const copyText = lineNumberTable?.dataset.code || getCodeBlockText(code, lineNumberTable)
    lineNumberTable?.removeAttribute('data-code')

    if (options.codeLineNumbers && lineNumberTable) {
      pre.classList.add('yn-code-with-lines')
    }

    if (options.codeCopyButton) {
      const wrapper = document.createElement('div')
      wrapper.className = 'yn-code-block'

      const button = document.createElement('button')
      button.className = 'yn-code-copy'
      button.type = 'button'
      button.dataset.code = copyText
      button.dataset.label = t('copy-code')
      button.textContent = t('copy-code')

      pre.parentNode?.insertBefore(wrapper, pre)
      wrapper.appendChild(button)
      wrapper.appendChild(pre)
    }
  })

  return container.innerHTML
}

function buildCodeBlockAssets (options: HtmlExportOptions) {
  if (!options.codeLineNumbers && !options.codeCopyButton) {
    return ''
  }

  const copyButtonAssets = options.codeCopyButton
    ? `
    .yn-code-block {
      position: relative;
      margin: 1em 0;
    }

    .yn-code-block > pre {
      margin: 0;
    }

    .yn-code-copy {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      border: 1px solid rgba(127, 127, 127, 0.35);
      border-radius: 6px;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.88);
      color: #24292f;
      font-size: 12px;
      line-height: 1.4;
      cursor: pointer;
      opacity: 0;
      transition: opacity 160ms ease;
    }

    .yn-code-block:hover .yn-code-copy {
      opacity: 1;
    }

    .yn-code-copy:focus {
      opacity: 1;
      outline: 2px solid #0969da;
      outline-offset: 2px;
    }
    `
    : ''

  const lineNumberAssets = options.codeLineNumbers
    ? `

    pre.yn-code-with-lines table.hljs-ln {
      width: 100%;
      margin: 0;
      border: 0;
      border-collapse: separate;
      border-spacing: 0;
    }

    pre.yn-code-with-lines table.hljs-ln tr,
    pre.yn-code-with-lines table.hljs-ln td {
      border: 0;
      padding: 0;
      background: transparent;
    }

    pre.yn-code-with-lines table.hljs-ln .hljs-ln-line {
      white-space: pre;
    }

    pre.yn-code-with-lines table.hljs-ln .hljs-ln-numbers {
      width: 2em;
      min-width: 2em;
      padding-right: 8px;
      user-select: none;
      text-align: right;
      vertical-align: top;
      color: #6e7781;
      border-right: 1px solid rgba(127, 127, 127, 0.25);
    }

    pre.yn-code-with-lines table.hljs-ln .hljs-ln-code {
      padding-left: 10px;
    }

    pre.yn-code-with-lines table.hljs-ln .hljs-ln-n:before {
      content: attr(data-line-number);
    }
    `
    : ''

  return `<style>
    ${copyButtonAssets}
    ${lineNumberAssets}
  </style>
  ${options.codeCopyButton ? `<script>
    (() => {
      const copiedText = ${JSON.stringify(t('copied'))};

      function fallbackCopy (text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      async function copyCode (button) {
        const text = button.dataset.code || '';
        const label = button.dataset.label || button.textContent;

        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            fallbackCopy(text);
          }

          button.textContent = copiedText;
          setTimeout(() => {
            button.textContent = label;
          }, 1200);
        } catch (error) {
          fallbackCopy(text);
          button.textContent = copiedText;
          setTimeout(() => {
            button.textContent = label;
          }, 1200);
        }
      }

      document.addEventListener('click', event => {
        const button = event.target instanceof Element
          ? event.target.closest('.yn-code-copy')
          : null;
        if (button) {
          copyCode(button);
        }
      });
    })();
  </script>` : ''}`
}

function buildHtml (title: string, body: string, options: HtmlExportOptions) {
  const codeOptions = {
    ...options,
    codeCopyButton: !!options.codeCopyButton && !!(options.includeStyle || options.inlineStyle),
  }
  const includeToc = options.includeToc || []
  const hasToc = includeToc.length > 0
  const headingNumber = !!(getRenderEnv()?.attributes?.headingNumber)
  const bodyHtml = enhanceCodeBlocks(body, codeOptions)
  const codeBlockAssets = buildCodeBlockAssets(codeOptions)

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
    ${codeBlockAssets}
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
    ${bodyHtml}
    ${hasToc ? `
      <nav id="yn-article-toc">
          <div class="toc-title">${t('table-of-contents')}</div>
          <ul class="${headingNumber ? 'heading-number' : ''}">
          ${getHeadings(false).filter(heading => includeToc.includes(heading.level)).map(heading => `<li data-level="${heading.level}" data-id="${heading.sourceLine}-${escape(heading.id)}" style="padding-left: ${heading.level}em">
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
