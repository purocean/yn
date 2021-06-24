import { Plugin } from '@fe/useful/plugin'
import MarkdownIt from 'markdown-it'
import StateInline from 'markdown-it/lib/rules_inline/state_inline'
import Token from 'markdown-it/lib/token'

const unquoted = '[^"\'=<>`\\x00-\\x20]+'
const singleQuoted = "'[^']*'"
const doubleQuoted = '"[^"]*"'

const attrName = '[a-zA-Z_:][a-zA-Z0-9:._-]*'
const attrValue = '(?:' + unquoted + '|' + singleQuoted + '|' + doubleQuoted + ')'
const attribute = '(?:\\s+' + attrName + '(?:\\s*=\\s*' + attrValue + ')?)'

const selfCloseTag = '<(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)\\b'
const openTag = '<([A-Za-z][A-Za-z0-9\\-]*)' + attribute + '*\\s*\\/?>'
const closeTag = '<\\/([A-Za-z][A-Za-z0-9\\-]*)\\s*>'
const comment = '<!---->|<!--(?:-?[^>-])(?:-?[^-])*-->'

const HTML_TAG_RE = new RegExp('^(?:' + openTag + '|' + closeTag + '|' + comment + ')')
const HTML_SELF_CLOSE_TAG_RE = new RegExp('^' + selfCloseTag, 'i')

function isLetter (ch: number) {
  const lc = ch | 0x20 // to lower case
  return (lc >= 0x61/* a */) && (lc <= 0x7a/* z */)
}

function htmlInline (state: StateInline): boolean {
  console.log('www', state)
  const pos = state.pos

  if (!state.md.options.html) { return false }

  // Check start
  const max = state.posMax
  if (state.src.charCodeAt(pos) !== 0x3C/* < */ || pos + 2 >= max) {
    return false
  }

  // Quick fail on second char
  const ch = state.src.charCodeAt(pos + 1)
  if (ch !== 0x21/* ! */ && ch !== 0x3F/* ? */ && ch !== 0x2F/* / */ && !isLetter(ch)) {
    return false
  }

  const match = state.src.slice(pos).match(HTML_TAG_RE)
  if (!match) { return false }

  console.log('mmm', match)

  const content = state.src.slice(pos, pos + match[0].length)

  // ignore comment
  if (content.startsWith('<!--')) { return false }

  const tag = (match[1] || match[2] || '').toLowerCase()
  if (!tag) { return false }

  const setAttrs = (token: Token) => {
    const div = document.createElement('div')
    div.innerHTML = content

    console.log(div.children, 'www')

    const element = div.children[0]
    if (!element) {
      return
    }

    const attrs: [string, any][] = []
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i]
      attrs.push([attr.name, attr.value])
      token.attrs = attrs
    }
  }

  const prevHtmlTags = (state.md as any)._prev_html_tags

  let token: Token
  if (content.startsWith('</')) {
    const prevHtmlTag = prevHtmlTags.pop()
    if (prevHtmlTags && prevHtmlTag === tag) {
      token = state.push('html_inline_close', tag, -1)
    } else {
      console.warn('html tag not match', prevHtmlTag, tag)
      return false
    }
  } else if (content.endsWith('/>') || HTML_SELF_CLOSE_TAG_RE.test(content)) {
    token = state.push('html_inline_self', tag, 0)
  } else {
    token = state.push('html_inline_open', tag, 1)
    prevHtmlTags.push(tag)
  }

  token.content = content
  setAttrs(token)

  state.pos += match[0].length
  return true
}

export default {
  name: 'markdown-html',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      md.parse = function (src: string, env: any) {
        (this as any)._prev_html_tags = []
        return MarkdownIt.prototype.parse.call(this, src, env)
      }
      md.inline.ruler.at('html_inline', htmlInline)
    })
  }
} as Plugin
