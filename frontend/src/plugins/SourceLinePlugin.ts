import Markdown from 'markdown-it'
import Renderer from 'markdown-it/lib/renderer'

export const injectLineNumbers: Renderer.RenderRule = (tokens, idx, options, _, slf) => {
  if (tokens[idx].map) {
    const line = tokens[idx].map!![0]
    tokens[idx].attrJoin('class', 'source-line')
    tokens[idx].attrSet('data-source-line', String(line + 1))
  }
  return slf.renderToken(tokens, idx, options)
}

const SourceLinePlugin = (md: Markdown) => {
  md.renderer.rules.paragraph_open = injectLineNumbers
  md.renderer.rules.heading_open = injectLineNumbers
  md.renderer.rules.list_item_open = injectLineNumbers
  md.renderer.rules.table_open = injectLineNumbers
}

export default SourceLinePlugin
