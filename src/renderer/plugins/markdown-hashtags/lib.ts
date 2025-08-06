import { Token } from 'markdown-it'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline'

export const RE_MATCH = /(#[a-zA-Z\u4e00-\u9fff][\da-zA-Z\u4e00-\u9fff_/-]*)/

export const RULE_NAME = 'hash-tags'

const reMatch = new RegExp('^' + RE_MATCH.source)

export function hashTags (state: StateInline, silent?: boolean) {
  const start = state.pos

  if (state.src.charCodeAt(start) !== 0x23/* # */) {
    return false
  }

  // check prev character
  if (start > 0) {
    const prevChar = state.src.charCodeAt(start - 1)
    if (prevChar !== 0x20/* space */ && prevChar !== 0x0a/* newline */ && prevChar !== 0x09/* tab */) {
      return false
    }
  }

  const match = state.src.slice(start).match(reMatch)
  if (!match) {
    return false
  }

  const tag = match[1]
  const end = start + tag.length

  if (!silent) {
    const token = state.push('hash_tag', 'span', 0)
    token.markup = '#'
    token.content = tag
  }

  state.pos = end
  return true
}

export function isTagToken (token: Token) {
  return token.type === 'hash_tag'
}
