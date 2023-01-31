import prism from 'prismjs'
import defaultStyle from 'prismjs/themes/prism.css'
import { escape } from 'lodash-es'
import type { Plugin, Ctx } from '@fe/context'
import { getLogger } from '@fe/utils'
import styles from '@fe/others/prism-style.scss'
import '@fe/others/prism-languages-all'

const logger = getLogger('markdown-code-highlight')

const TABLE_NAME = 'hljs-ln'
const LINE_NAME = 'hljs-ln-line'
const CODE_BLOCK_NAME = 'hljs-ln-code'
const NUMBERS_BLOCK_NAME = 'hljs-ln-numbers'
const NUMBER_LINE_NAME = 'hljs-ln-n'
const DATA_ATTR_NAME = 'data-line-number'
const BREAK_LINE_REGEXP = /\r\n|\r|\n/g

function addCustomStyles (ctx: Ctx) {
  ctx.view.addStyles(styles)
  ctx.view.addStyles(
    `
      .markdown-view .markdown-body table.${TABLE_NAME} {
        margin: 0;
        border-collapse: separate;
      }

      .markdown-view .markdown-body table.${TABLE_NAME},
      .markdown-view .markdown-body table.${TABLE_NAME} tr,
      .markdown-view .markdown-body table.${TABLE_NAME} td {
        border: 0;
      }

      .markdown-view .markdown-body table.${TABLE_NAME} td {
        padding: 0;
      }

      .markdown-view .markdown-body table.${TABLE_NAME} tbody {
        display: table;
        min-width: 100%;
      }

      .markdown-view .markdown-body table.${TABLE_NAME} td.${NUMBERS_BLOCK_NAME} {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        text-align: center;
        vertical-align: top;
        text-align: right;
        min-width: 2em;
        width: 2em;
        position: sticky;
        left: 0;
        background-color: var(--g-color-96);
        box-shadow: -20px 0px 0px var(--g-color-96);
        border-right: 1px solid var(--g-color-86);
      }

      .markdown-view .markdown-body table.${TABLE_NAME} td.${CODE_BLOCK_NAME} {
        padding-left: 10px;
      }

      .markdown-view .markdown-body table.${TABLE_NAME} .${NUMBER_LINE_NAME}{
        padding-right: 8px;
        color: var(--g-color-40);
      }

      .markdown-view .markdown-body table.${TABLE_NAME} .${NUMBER_LINE_NAME}:before{
        content: attr(${DATA_ATTR_NAME})
      }

      .markdown-view .markdown-body .${ctx.args.DOM_CLASS_NAME.WRAP_CODE} table.${TABLE_NAME} td {
        white-space: pre-wrap;
        box-shadow: none !important;
      }

      @media print {
        .markdown-view .markdown-body table.${TABLE_NAME} tr {
          background-color: inherit;
        }

        .markdown-view .markdown-body table.${TABLE_NAME} td {
          white-space: pre-wrap;
          box-shadow: none !important;
        }
      }

      @media screen {
        .markdown-view .markdown-body table.${TABLE_NAME} {
          max-height: 400px;
        }
      }
    `
  )
}

function getLinesCount (text: string) {
  return (text.trim().match(BREAK_LINE_REGEXP) || []).length
}

function getLines (text: string) {
  if (text.length === 0) return []
  return text.split(BREAK_LINE_REGEXP)
}

function addLineNumbersBlockFor (inputHtml: string, firstLineIndex: number, lang: string) {
  const lines = getLines(inputHtml)

  if (lines.length === 0) {
    return inputHtml
  }

  // if last line contains only carriage return remove it
  if (lines[lines.length - 1].trim() === '') {
    lines.pop()
  }

  if (lines.length > firstLineIndex) {
    let html = ''

    for (let i = 0, l = lines.length; i < l; i++) {
      html += '<tr>' +
        `<td class="${NUMBERS_BLOCK_NAME}">` +
          `<div class="${LINE_NAME} ${NUMBER_LINE_NAME}" ${DATA_ATTR_NAME}="${i + 1}"></div>` +
        '</td>' +
        `<td class="${CODE_BLOCK_NAME}">` +
          `<div class="${LINE_NAME}">${lines[i].length > 0 ? lines[i] : ' '}</div>` +
        '</td>' +
      '</tr>'
    }

    return `<table class="${TABLE_NAME}" data-lang="${lang}">${html}</table>`
  }

  return inputHtml
}

function duplicateMultilineNode (element: HTMLElement) {
  const className = element.className

  if (!/^token/.test(className)) return

  const lines = getLines(element.innerHTML)

  let result = ''
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i].length > 0 ? lines[i] : ' '
    result += `<span class="${className}">${lineText}</span>\n`
  }

  element.innerHTML = result.trim()
}

/**
  * Recursive method for fix multi-line elements implementation
  * Doing deep passage on child nodes.
  */
function duplicateMultilineNodes (element: HTMLElement) {
  element.childNodes.forEach(child => {
    if (child.textContent && getLinesCount(child.textContent) > 0) {
      if (child.childNodes.length > 0) {
        duplicateMultilineNodes(child as HTMLElement)
      } else {
        duplicateMultilineNode(child.parentNode! as HTMLElement)
      }
    }
  })
}

function wrap (code: string, lang: string, lineNumber: boolean) {
  let html = code

  if (lang === 'text') {
    html = escape(code)
  }

  if (lineNumber) {
    const element = document.createElement('code')
    element.innerHTML = html
    duplicateMultilineNodes(element)
    html = addLineNumbersBlockFor(element.innerHTML, 1, lang)
  }

  return html
}

function getLangCodeFromExtension (extension: string) {
  const extensionMap: Record<string, string> = {
    vue: 'markup',
    html: 'markup',
    md: 'markdown',
    rb: 'ruby',
    ts: 'typescript',
    py: 'python',
    sh: 'bash',
    yml: 'yaml',
    styl: 'stylus',
    kt: 'kotlin',
    rs: 'rust',
    node: 'js'
  }

  return extensionMap[extension] || extension
}

function highlight (str: string, lang: string, lineNumber: boolean) {
  if (!lang) {
    return escape(str)
  }

  lang = lang.toLowerCase()
  const rawLang = lang

  lang = getLangCodeFromExtension(lang)

  if (prism.languages[lang]) {
    const code = prism.highlight(str, prism.languages[lang], lang)
    return wrap(code, rawLang, lineNumber)
  } else {
    logger.warn(`Syntax highlight for language "${lang}" is not supported.`)
  }

  return wrap(str, 'text', lineNumber)
}

export default {
  name: 'markdown-code-highlight',
  register: (ctx: Ctx) => {
    addCustomStyles(ctx)
    ctx.markdown.registerPlugin(md => {
      md.options.highlight = (str, lang) => highlight(str, lang, true)
    })

    const exportStyles = `
      ${defaultStyle}
      code[class*="language-"], pre[class*="language-"] {
        text-shadow: none;
      }
    `

    ctx.registerHook('VIEW_ON_GET_HTML_FILTER_NODE', ({ node, options }) => {
      if (node.tagName === 'TABLE' && node.dataset.lang) {
        const code = node.parentElement
          ?.parentElement
          ?.querySelector<HTMLElement>('.p-mcc-copy-btn.copy-text')
          ?.dataset
          ?.text

        if (code) {
          if (options.highlightCode) {
            if (options.inlineStyle || options.includeStyle) {
              node.outerHTML = ctx.lib.juice(
                highlight(code, node.dataset.lang, false),
                { extraCss: exportStyles }
              )
            } else {
              node.outerHTML = highlight(code, node.dataset.lang, false)
            }
          } else {
            node.outerHTML = ctx.lib.lodash.escape(code)
          }
        }
      }
    })
  }
} as Plugin
