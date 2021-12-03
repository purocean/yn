import Markdown from 'markdown-it'
import MarkdownItSub from 'markdown-it-sub'
import MarkdownItSup from 'markdown-it-sup'
import MarkdownItMark from 'markdown-it-mark'
import MarkdownItAttrs from 'markdown-it-attrs'
import MarkdownItMultimdTable from 'markdown-it-multimd-table'

/**
 * Markdown-it instance
 */
export const markdown = Markdown({ linkify: true, breaks: true, html: true })

/**
 * Register a Markdown-it plugin.
 * @param plugin Markdown-it plugin
 * @param params plugin params
 */
export function registerPlugin (plugin: (md: Markdown, ...args: any) => void, params?: any) {
  markdown.use(plugin, params)
}

markdown.use(MarkdownItSub)
markdown.use(MarkdownItSup)
markdown.use(MarkdownItMark)
markdown.use(MarkdownItAttrs)
markdown.use(MarkdownItMultimdTable, { multiline: true })

const tokenize = markdown.block.tokenize
markdown.block.tokenize = function (state, startLine, endLine) {
  tokenize.call(this, state, startLine, endLine)

  if (!state.env) {
    state.env = {}
  }

  // attach bMarks eMarks to env
  state.env.bMarks = state.bMarks
  state.env.eMarks = state.eMarks
}
