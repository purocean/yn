/* eslint-disable @typescript-eslint/no-use-before-define */

// https://github.com/revin/markdown-it-task-lists/blob/master/index.js

// Markdown-it plugin to render GitHub-style task lists; see
//
// https://github.com/blog/1375-task-lists-in-gfm-issues-pulls-comments
// https://github.com/blog/1825-task-lists-in-all-markdown-documents

import Markdown from 'markdown-it'
import { Plugin } from '@fe/useful/plugin'

let disableCheckboxes = true
let useLabelWrapper = false
let useLabelAfter = false

function MarkdownItPlugin (md: Markdown, options: { enabled: any; label: any; labelAfter: any }) {
  if (options) {
    disableCheckboxes = !options.enabled
    useLabelWrapper = !!options.label
    useLabelAfter = !!options.labelAfter
  }

  md.core.ruler.after('inline', 'github-task-lists', function (state: { tokens: any; Token: any }) {
    const tokens = state.tokens
    for (let i = 2; i < tokens.length; i++) {
      if (isTodoItem(tokens, i)) {
        todoify(tokens[i], state.Token)
        attrSet(tokens[i - 2], 'class', 'task-list-item' + (!disableCheckboxes ? ' enabled' : ''))
        attrSet(tokens[parentToken(tokens, i - 2)], 'class', 'contains-task-list')
      }
    }

    return false
  })
}

function attrSet (token: { attrIndex: (arg0: any) => any; attrPush: (arg0: any[]) => void; attrs: { [x: string]: any[] } }, name: string, value: string) {
  const index = token.attrIndex(name)
  const attr = [name, value]

  if (index < 0) {
    token.attrPush(attr)
  } else {
    token.attrs[index] = attr
  }
}

function parentToken (tokens: { level: number }[], index: number) {
  const targetLevel = tokens[index].level - 1
  for (let i = index - 1; i >= 0; i--) {
    if (tokens[i].level === targetLevel) {
      return i
    }
  }
  return -1
}

function isTodoItem (tokens: any[], index: number) {
  return isInline(tokens[index]) &&
         isParagraph(tokens[index - 1]) &&
         isListItem(tokens[index - 2]) &&
         startsWithTodoMarkdown(tokens[index])
}

function todoify (token: { children: any[]; content: string | any[] }, TokenConstructor: any) {
  token.children.unshift(makeCheckbox(token, TokenConstructor))
  token.children[1].content = token.children[1].content.slice(3)
  token.content = token.content.slice(3)

  if (useLabelWrapper) {
    if (useLabelAfter) {
      token.children.pop()

      // Use large random number as id property of the checkbox.
      const id = 'task-item-' + Math.ceil(Math.random() * (10000 * 1000) - 1000)
      token.children[0].content = token.children[0].content.slice(0, -1) + ' id="' + id + '">'
      token.children.push(afterLabel(token.content, id, TokenConstructor))
    } else {
      token.children.unshift(beginLabel(TokenConstructor))
      token.children.push(endLabel(TokenConstructor))
    }
  }
}

function makeCheckbox (token: { content: string | string[] }, TokenConstructor: new (arg0: string, arg1: string, arg2: number) => any) {
  const checkbox = new TokenConstructor('html_inline', '', 0)
  const disabledAttr = disableCheckboxes ? ' disabled="" ' : ' '
  if (token.content.indexOf('[ ] ') === 0) {
    checkbox.content = '<input class="task-list-item-checkbox"' + disabledAttr + 'type="checkbox">'
  } else if (token.content.indexOf('[x] ') === 0 || token.content.indexOf('[X] ') === 0) {
    checkbox.content = '<input class="task-list-item-checkbox" checked=""' + disabledAttr + 'type="checkbox">'
  }
  return checkbox
}

// these next two functions are kind of hacky; probably should really be a
// true block-level token with .tag=='label'
function beginLabel (TokenConstructor: new (arg0: string, arg1: string, arg2: number) => any) {
  const token = new TokenConstructor('html_inline', '', 0)
  token.content = '<label>'
  return token
}

function endLabel (TokenConstructor: new (arg0: string, arg1: string, arg2: number) => any) {
  const token = new TokenConstructor('html_inline', '', 0)
  token.content = '</label>'
  return token
}

function afterLabel (content: any, id: string, TokenConstructor: new (arg0: string, arg1: string, arg2: number) => any) {
  const token = new TokenConstructor('html_inline', '', 0)
  token.content = '<label class="task-list-item-label" for="' + id + '">' + content + '</label>'
  token.attrs = [{ for: id }]
  return token
}

function isInline (token: { type: string }) { return token.type === 'inline' }
function isParagraph (token: { type: string }) { return token.type === 'paragraph_open' }
function isListItem (token: { type: string }) { return token.type === 'list_item_open' }

function startsWithTodoMarkdown (token: { content: string | string[] }) {
  // leading whitespace in a list item is already trimmed off by markdown-it
  return token.content.indexOf('[ ] ') === 0 || token.content.indexOf('[x] ') === 0 || token.content.indexOf('[X] ') === 0
}

export default {
  name: 'markdown-toc',
  register: ctx => {
    ctx.markdown.registerPlugin(MarkdownItPlugin, { enabled: true })
  }
} as Plugin
