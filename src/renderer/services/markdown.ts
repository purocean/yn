import Markdown from 'markdown-it'
import MarkdownItSub from 'markdown-it-sub'
import MarkdownItSup from 'markdown-it-sup'
import MarkdownItMark from 'markdown-it-mark'
import MarkdownItAbbr from 'markdown-it-abbr'
import MarkdownItAttributes from 'markdown-it-attributes'
import MarkdownItMultimdTable from 'markdown-it-multimd-table'
import { triggerHook } from '@fe/core/hook'
import { HELP_REPO_NAME } from '@fe/support/args'
import type { RenderEnv } from '@fe/types'
import { getSetting } from './setting'

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

const render = markdown.render
markdown.render = (src: string, env: RenderEnv) => {
  triggerHook('MARKDOWN_BEFORE_RENDER', { src, env, md: markdown })

  markdown.options.html = env.file?.repo === HELP_REPO_NAME ? true : getSetting('render.md-html', true)
  markdown.options.breaks = getSetting('render.md-breaks', true)
  markdown.options.linkify = getSetting('render.md-linkify', true)
  markdown.options.typographer = getSetting('render.md-typographer', false)

  const enabledRules: string[] = []
  const disabledRules: string[] = []

  ;(getSetting('render.md-sup', true) ? enabledRules : disabledRules).push('sup')
  ;(getSetting('render.md-sub', true) ? enabledRules : disabledRules).push('sub')
  ;(getSetting('render.md-wiki-links', true) ? enabledRules : disabledRules).push('wiki-links')

  markdown.enable(enabledRules, true)
  markdown.disable(disabledRules, true)

  return render.call(markdown, src, env)
}

markdown.use(MarkdownItSub)
markdown.use(MarkdownItSup)
markdown.use(MarkdownItMark)
markdown.use(MarkdownItAbbr)
markdown.use(MarkdownItAttributes)
markdown.use(MarkdownItMultimdTable, {
  multiline: getSetting('render.multimd-multiline', true),
  rowspan: getSetting('render.multimd-rowspan', false),
  headerless: getSetting('render.multimd-headerless', false),
  multibody: getSetting('render.multimd-multibody', false),
})

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

markdown.core.ruler.after('normalize', 'after_normalize', state => {
  state.env.source = state.src
  state.env.tokens = state.tokens
  return true
})
