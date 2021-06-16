import { Plugin } from '@/useful/plugin'
import Renderer from 'markdown-it/lib/renderer'

const buildFunction = (className: string): Renderer.RenderRule => {
  return (tokens, idx, options, _, slf) => {
    if (tokens[idx].map) {
      const lineStart = tokens[idx].map!![0]
      const lineEnd = tokens[idx].map!![1]
      tokens[idx].attrJoin('class', className)
      tokens[idx].attrSet('data-source-line', String(lineStart + 1))
      tokens[idx].attrSet('data-source-line-end', String(lineEnd + 1))
    }
    return slf.renderToken(tokens, idx, options)
  }
}

export const injectLineNumbers = buildFunction('source-line')

export default {
  name: 'markdown-source-line',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      md.renderer.rules.paragraph_open = injectLineNumbers
      md.renderer.rules.heading_open = injectLineNumbers
      md.renderer.rules.list_item_open = injectLineNumbers
      md.renderer.rules.table_open = injectLineNumbers
      md.renderer.rules.td_open = buildFunction('yank-table-cell')
      md.renderer.rules.th_open = buildFunction('yank-table-cell')
    })
  }
} as Plugin
