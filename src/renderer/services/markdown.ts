import Markdown from 'markdown-it'
import MarkdownItAttrs from 'markdown-it-attrs'
import MarkdownItMultimdTable from 'markdown-it-multimd-table'

export const markdown = Markdown({ linkify: true, breaks: true, html: true })

export function registerPlugin (plugin: (md: Markdown, ...args: any) => void, params?: any) {
  markdown.use(plugin, params)
}

markdown.use(MarkdownItAttrs)
markdown.use(MarkdownItMultimdTable, { multiline: true })
