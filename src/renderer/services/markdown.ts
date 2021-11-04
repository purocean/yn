import Markdown from 'markdown-it'
import MarkdownItAttrs from 'markdown-it-attrs'
import MarkdownItMultimdTable from 'markdown-it-multimd-table'

/**
 * Markdown-it 实例
 */
export const markdown = Markdown({ linkify: true, breaks: true, html: true })

/**
 * 注册一个 Markdown-it 插件
 * @param plugin Markdown-it 插件
 * @param params 插件参数
 */
export function registerPlugin (plugin: (md: Markdown, ...args: any) => void, params?: any) {
  markdown.use(plugin, params)
}

markdown.use(MarkdownItAttrs)
markdown.use(MarkdownItMultimdTable, { multiline: true })

const tokenize = markdown.block.tokenize
markdown.block.tokenize = function (state, startLine, endLine) {
  tokenize.call(this, state, startLine, endLine)

  if (!state.env) {
    state.env = {}
  }

  // 将 bMarks eMarks 挂载到 env 上，方便渲染插件调用
  state.env.bMarks = state.bMarks
  state.env.eMarks = state.eMarks
}
