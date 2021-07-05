/* eslint-disable @typescript-eslint/no-use-before-define */

// https://github.com/revin/markdown-it-task-lists/blob/master/index.js

// Markdown-it plugin to render GitHub-style task lists; see
//
// https://github.com/blog/1375-task-lists-in-gfm-issues-pulls-comments
// https://github.com/blog/1825-task-lists-in-all-markdown-documents

import Markdown from 'markdown-it'
import { Plugin } from '@fe/context/plugin'

let disableCheckboxes = true

function MarkdownItPlugin (md: Markdown, options: { enabled: any; label: any; labelAfter: any }) {
  if (options) {
    disableCheckboxes = !options.enabled
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
