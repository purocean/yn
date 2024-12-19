import { DOM_ATTR_NAME } from '@fe/support/args'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline'

const reMatch = /^([^[#|]*)?(?:#([^#|]*))?(?:\|([^\]]*))?$/
const reExternalLink = /^[a-zA-Z]{1,8}:\/\/.*/
const rePos = /(:\d{1,6},?\d{0,6})$/

export const RULE_NAME = 'wiki-links'

export function wikiLinks (state: StateInline, silent?: boolean) {
  const isImage = state.src.charCodeAt(state.pos) === 0x21/* ! */

  const offset = isImage ? 3 : 2

  // check [[
  if (state.src.charCodeAt(state.pos + offset - 2) !== 0x5B/* [ */ || state.src.charCodeAt(state.pos + offset - 1) !== 0x5B/* [ */) {
    return false
  }

  const endPos = state.src.indexOf(']]', state.pos + offset)
  if (endPos === -1 || endPos === state.pos + offset) {
    return false
  }

  const content = state.src.slice(state.pos + offset, endPos)
  const parts = content.match(reMatch)
  if (!parts) {
    return false
  }

  let link = (parts[1] || '').trim()
  const hash = parts[2] || ''
  const label = parts[3] || ''

  const hashStr = hash ? `#${hash}` : ''

  let url = link + hashStr
  let text = label || url
  let isAnchor = false

  // internal link
  if (!reExternalLink.test(link)) {
    let posStr = ''
    const posMatch = link.match(rePos)
    if (posMatch) {
      link = link.replace(rePos, '')
      posStr = posMatch[1]
    }

    const fileName = link.split('/').pop()
    text = label || (fileName ? (fileName + posStr + hashStr) : url)

    if (!link) {
      url = posStr + hashStr
      text = label || hash || url
      isAnchor = true
    }
  }

  if (!silent) {
    if (isImage) {
      const attrs: [string, string][] = [
        ['src', url],
        [DOM_ATTR_NAME.WIKI_RESOURCE, 'true'],
        ['alt', text],
      ]

      state.push('image', 'img', 0).attrs = attrs
    } else {
      const attrs: [string, string][] = [
        ['href', url],
        [DOM_ATTR_NAME.WIKI_LINK, 'true'],
      ]

      if (isAnchor) {
        attrs.push([DOM_ATTR_NAME.IS_ANCHOR, 'true'])
      }

      state.push('link_open', 'a', 1).attrs = attrs
      state.push('text', '', 0).content = text
      state.push('link_close', 'a', -1)
    }
  }

  state.pos = endPos + offset

  return true
}
