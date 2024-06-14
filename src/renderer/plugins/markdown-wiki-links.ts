import { Plugin } from '@fe/context'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline'

const reMatch = /^\s*([^[#|]*)?(?:#([^|]*))?(?:\|([^\]]*))?\s*$/
const reExternalLink = /^[a-zA-Z]{1,8}:\/\/.*/
const reExtName = /\.[^/]+$/

function wikiLinks (state: StateInline, silent?: boolean) {
  // check [[
  if (state.src.charCodeAt(state.pos) !== 0x5B/* [ */ || state.src.charCodeAt(state.pos + 1) !== 0x5B/* [ */) {
    return false
  }

  const endPos = state.src.indexOf(']]', state.pos + 2)
  if (endPos === -1 || endPos === state.pos + 2) {
    return false
  }

  const content = state.src.slice(state.pos + 2, endPos)
  const parts = content.match(reMatch)
  if (!parts) {
    return false
  }

  const link = (parts[1] || '').trim()
  const hash = parts[2] || ''
  const label = parts[3] || ''

  const hashStr = hash ? `#${hash}` : ''

  let url = link + hashStr
  let text = label || url

  // internal link
  if (!reExternalLink.test(link)) {
    const fileName = link.split('/').pop()
    text = label || (fileName ? fileName + hashStr : url)

    // no extension name
    if (link && !reExtName.test(link)) {
      url = `${link}.md${hashStr}`
    } else if (!link) {
      url = hashStr
      text = label || hash || url
    }
  }

  if (!silent) {
    state.push('link_open', 'a', 1).attrs = [['href', url]]
    state.push('text', '', 0).content = text
    state.push('link_close', 'a', -1)
  }

  state.pos = endPos + 2

  return true
}

export default {
  name: 'markdown-wiki-links',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      md.inline.ruler.after('link', 'wiki-links', wikiLinks)
    })
  }
} satisfies Plugin
