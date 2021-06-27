import Markdown from 'markdown-it'
import MarkdownItAttrs from 'markdown-it-attrs'
import MultimdTable from 'markdown-it-multimd-table'
import { getPlugins as getMarkdownItPlugins } from '@fe/useful/plugin/markdown'

const markdown = Markdown({ linkify: true, breaks: true, html: true })

getMarkdownItPlugins().forEach(({ plugin, params }) => {
  markdown.use(plugin, params)
})

markdown.use(MarkdownItAttrs)
markdown.use(MultimdTable, { multiline: true })

export default markdown
