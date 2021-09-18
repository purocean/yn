import { Plugin } from '@fe/context/plugin'
import StateBlock from 'markdown-it/lib/rules_block/state_block'
import StateInline from 'markdown-it/lib/rules_inline/state_inline'
import Token from 'markdown-it/lib/token'
import ParserInline from 'markdown-it/lib/parser_inline'
import MarkdownIt from 'markdown-it'

const unquoted = '[^"\'=<>`\\x00-\\x20]+'
const singleQuoted = "'[^']*'"
const doubleQuoted = '"[^"]*"'

const attrName = '[a-zA-Z_:][a-zA-Z0-9:._-]*'
const attrValue = '(?:' + unquoted + '|' + singleQuoted + '|' + doubleQuoted + ')'
const attribute = '(?:\\s+' + attrName + '(?:\\s*=\\s*' + attrValue + ')?)'

const selfCloseTag = '<(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)\\b'
const openTag = '<([A-Za-z][A-Za-z0-9\\-]*)' + attribute + '*\\s*\\/?>'
const closeTag = '<\\/([A-Za-z][A-Za-z0-9\\-]*)\\s*>'
const comment = '(?:<!(--)|(--)>)'

const HTML_TAG_RE = new RegExp('^(?:' + comment + '|' + openTag + '|' + closeTag + ')')
const HTML_SELF_CLOSE_TAG_RE = new RegExp('^' + selfCloseTag, 'i')

function isLetter (ch: number) {
  const lc = ch | 0x20 // to lower case
  return (lc >= 0x61/* a */) && (lc <= 0x7a/* z */)
}

function htmlInline (state: StateInline): boolean {
  const pos = state.pos

  if (!state.md.options.html) { return false }

  const max = state.posMax

  // Check start
  let ch = state.src.charCodeAt(pos)
  if (pos + 2 >= max || (ch !== 0x3C/* < */ && ch !== 0x2D/* - */)) {
    return false
  }

  // Quick fail on second char
  ch = state.src.charCodeAt(pos + 1)
  if (ch !== 0x2D/* - */ && ch !== 0x21/* ! */ && ch !== 0x3F/* ? */ && ch !== 0x2F/* / */ && !isLetter(ch)) {
    return false
  }

  const match = state.src.slice(pos).match(HTML_TAG_RE)
  if (!match) { return false }

  const content = state.src.slice(pos, pos + match[0].length)

  const tag = (match[1] || match[2] || match[3] || match[4] || '').toLowerCase()
  if (!tag) { return false }

  const setAttrs = (token: Token) => {
    const div = document.createElement('div')
    div.innerHTML = content

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

  const prevHtmlTags = (state.md as any)._prev_inline_html_tags

  let token: Token
  if (content.startsWith('</') || content.startsWith('-->')) {
    const prevHtmlTag = prevHtmlTags.pop()
    if (prevHtmlTags && prevHtmlTag === tag) {
      token = state.push('html_close', tag, -1)
    } else {
      console.warn('html tag not match', prevHtmlTag, tag)
      return false
    }
  } else if (content.endsWith('/>') || HTML_SELF_CLOSE_TAG_RE.test(content)) {
    token = state.push('html_self', tag, 0)
  } else {
    token = state.push('html_open', tag, 1)
    prevHtmlTags.push(tag)
  }

  token.content = content
  setAttrs(token)

  state.pos += match[0].length
  return true
}

function htmlBlock (state: StateBlock, startLine: number, endLine: number) {
  let nextLine; let lineText
  let pos = state.bMarks[startLine] + state.tShift[startLine]
  let max = state.eMarks[startLine]

  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[startLine] - state.blkIndent >= 4) { return false }
  if (!state.md.options.html) { return false }
  if (state.src.charCodeAt(pos) !== 0x3C/* < */) { return false }

  const inlineParse: any = state.md.inline.parse.bind(state.md.inline)
  const pushState = state.push
  const prevHtmlTags = (state.md as any)._prev_block_html_tags

  lineText = state.src.slice(pos, max)
  // 调用行内解析规则
  inlineParse(lineText, state.md, state.env, state.tokens, prevHtmlTags, pushState)

  // If we are here - we detected HTML block.
  for (nextLine = startLine + 1; nextLine < endLine; nextLine++) {
    if (state.sCount[nextLine] < state.blkIndent) { break }

    pos = state.bMarks[nextLine] + state.tShift[nextLine]
    max = state.eMarks[nextLine]
    lineText = state.src.slice(pos, max)

    if (lineText.length === 0) {
      break
    }

    inlineParse(lineText, state.md, state.env, state.tokens, prevHtmlTags, pushState)
  }

  const token = state.push('html_end', '', 0)
  token.hidden = true
  token.map = [startLine, nextLine]
  token.content = state.getLines(startLine, nextLine, state.blkIndent, true)

  state.line = nextLine

  return true
}

function inlineParse (this: ParserInline, src: string, md: any, env: any, outTokens: Token[], prevHtmlTags: string[], htmlBlock: boolean) {
  // 每次解析 inline 时候，重置或者使用外部的 html 标签堆栈
  md._prev_inline_html_tags = prevHtmlTags || []

  const state = new this.State(src, md, env, outTokens)

  // 如果是 html block 规则调用的，这里 hack 一下，避免 delimiters 为 undefined
  if (htmlBlock) {
    Object.defineProperty(state, 'delimiters', {
      get () {
        return this._delimiters || []
      },
      set (val) {
        this._delimiters = val
      },
    })
  }

  this.tokenize(state)

  this.ruler2.getRules('').forEach(rule => {
    rule(state)
  })
}

function parse (this: any, src: string, env: any) {
  // 每次运行解析程序，设定一个 block html 标签栈，便于后续处理程序匹配标签
  this._prev_block_html_tags = []
  return MarkdownIt.prototype.parse.call(this, src, env)
}

export default {
  name: 'markdown-html',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      md.parse = parse
      md.inline.parse = inlineParse as any
      md.inline.ruler.at('html_inline', htmlInline)
      md.block.ruler.at('html_block', htmlBlock)
    })
  }
} as Plugin
