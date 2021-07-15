import Highlight from 'highlight.js'
import { getKeyLabel } from '@fe/context/shortcut'
import { Plugin, Ctx } from '@fe/context/plugin'
import { getLogger } from '@fe/utils'

const logger = getLogger('markdown-code')

Highlight.registerAliases('node', { languageName: 'javascript' })

/* eslint-disable */

// https://github.com/wcoder/highlightjs-line-numbers.js

const TABLE_NAME = 'hljs-ln'
const LINE_NAME = 'hljs-ln-line'
const CODE_BLOCK_NAME = 'hljs-ln-code'
const NUMBERS_BLOCK_NAME = 'hljs-ln-numbers'
const NUMBER_LINE_NAME = 'hljs-ln-n'
const DATA_ATTR_NAME = 'data-line-number'
const BREAK_LINE_REGEXP = /\r\n|\r|\n/g

function addCustomStyles (ctx: Ctx) {
  ctx.theme.addStyles(
    `
      .markdown-view .markdown-body table.${TABLE_NAME} {
        margin: 0;
      }

      .markdown-view .markdown-body table.${TABLE_NAME},
      .markdown-view .markdown-body table.${TABLE_NAME} tr,
      .markdown-view .markdown-body table.${TABLE_NAME} td {
        border: 0;
      }

      .markdown-view .markdown-body table.${TABLE_NAME} {
        padding-bottom: 10px;
        border-collapse: collaps;
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
        border-right: 1px solid #777;
        vertical-align: top;
        padding-right: 5px;
        max-width: 45px; width: 35px;
      }

      .markdown-view .markdown-body table.${TABLE_NAME} td.${CODE_BLOCK_NAME} {
        padding-left: 10px;
      }

      .markdown-view .markdown-body table.${TABLE_NAME} .${NUMBER_LINE_NAME}:before{
        content: attr(${DATA_ATTR_NAME})
      }

      @media print {
        .markdown-view .markdown-body table.${TABLE_NAME} td {
          white-space: pre-wrap;
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

function lineNumbersInternal (element: any, options?: any) {
  // define options or set default
  options = options || {
    singleLine: false
  }

  // convert options
  var firstLineIndex = options.singleLine ? 0 : 1

  duplicateMultilineNodes(element)

  return addLineNumbersBlockFor(element.innerHTML, firstLineIndex)
}

function addLineNumbersBlockFor (inputHtml: any, firstLineIndex: any) {
  var lines = getLines(inputHtml)

  // if last line contains only carriage return remove it
  if (lines[lines.length - 1].trim() === '') {
    lines.pop()
  }

  if (lines.length > firstLineIndex) {
    var html = ''

    for (var i = 0, l = lines.length; i < l; i++) {
      html += format(
        '<tr>' +
          '<td class="{0}">' +
          '<div class="{1} {2}" {3}="{5}"></div>' +
          '</td>' +
          '<td class="{4}">' +
          '<div class="{1}">{6}</div>' +
          '</td>' +
          '</tr>',
        [
          NUMBERS_BLOCK_NAME,
          LINE_NAME,
          NUMBER_LINE_NAME,
          DATA_ATTR_NAME,
          CODE_BLOCK_NAME,
          i + 1,
          lines[i].length > 0 ? lines[i] : ' '
        ])
    }

    return format('<table class="{0}">{1}</table>', [ TABLE_NAME, html ])
  }

  return inputHtml
}

/**
  * Recursive method for fix multi-line elements implementation in highlight.js
  * Doing deep passage on child nodes.
  * @param {HTMLElement} element
  */
function duplicateMultilineNodes (element: any) {
  var nodes = element.childNodes
  for (var node in nodes) {
    if (nodes.hasOwnProperty(node)) {
      var child = nodes[node]
      if (getLinesCount(child.textContent) > 0) {
        if (child.childNodes.length > 0) {
          duplicateMultilineNodes(child)
        } else {
          duplicateMultilineNode(child.parentNode)
        }
      }
    }
  }
}

/**
  * Method for fix multi-line elements implementation in highlight.js
  * @param {HTMLElement} element
  */
function duplicateMultilineNode (element: any) {
  var className = element.className

  if (!/hljs-/.test(className)) return

  var lines = getLines(element.innerHTML)

  for (var i = 0, result = ''; i < lines.length; i++) {
    var lineText = lines[i].length > 0 ? lines[i] : ' '
    result += format('<span class="{0}">{1}</span>\n', [ className, lineText ])
  }

  element.innerHTML = result.trim()
}

function getLines (text: string) {
  if (text.length === 0) return []
  return text.split(BREAK_LINE_REGEXP)
}

function getLinesCount (text: string) {
  return (text.trim().match(BREAK_LINE_REGEXP) || []).length
}

/**
  * {@link https://wcoder.github.io/notes/string-format-for-string-formating-in-javascript}
  * @param {string} format
  * @param {array} args
  */
function format (format: string, args: any) {
  return format.replace(/\{(\d+)\}/g, function (m, n) {
    return args[n] ? args[n] : m
  })
}

function highlight (str: string, lang: string) {
  if (lang && Highlight.getLanguage(lang)) {
    try {
      const element = document.createElement('code')
      element.innerHTML = Highlight.highlight(lang, str).value
      return lineNumbersInternal(element)
    } catch (error) {
      logger.error(error)
    }
  }

  return ''
}

export default {
  name: 'markdown-code',
  register: (ctx: Ctx) => {
    addCustomStyles(ctx)
    ctx.markdown.registerPlugin(md => {
      const Fun = (fn: Function) => (tokens: any, idx: any, options: any, env: any, slf: any) => {
        if (tokens[idx].attrIndex('title') < 0) {
          tokens[idx].attrJoin('class', 'copy-inner-text')
          tokens[idx].attrPush(['title', getKeyLabel('CtrlCmd') + ' + 单击复制'])
        }

        return (fn)(tokens, idx, options, env, slf)
      }

      md.renderer.rules.code_inline = Fun(md.renderer.rules.code_inline!.bind(md.renderer.rules))
      md.options.highlight = highlight as any
    })
  }
} as Plugin
