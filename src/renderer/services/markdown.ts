import Markdown from 'markdown-it'
import MarkdownItSub from 'markdown-it-sub'
import MarkdownItSup from 'markdown-it-sup'
import MarkdownItMark from 'markdown-it-mark'
import MarkdownItAbbr from 'markdown-it-abbr'
import MarkdownItAttributes from 'markdown-it-attributes'
import MarkdownItMultimdTable from 'markdown-it-multimd-table'
import { registerHook, triggerHook } from '@fe/core/hook'
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

const renderCache: Map<string, Map<string, any>> = new Map()

/**
 * Get render cache
 * @param domain
 * @param key
 * @returns
 */
export function getRenderCache (domain: string): Map<string, any>
export function getRenderCache<T> (domain: string, key: string, fallback?: T | (() => T)): T
export function getRenderCache (domain: string, key?: string, fallback?: any) {
  if (!domain) {
    throw new Error('Domain is required')
  }

  if (!renderCache.has(domain)) {
    renderCache.set(domain, new Map())
  }

  const cache = renderCache.get(domain)!

  if (!key) {
    return cache
  }

  const value = cache.get(key)
  if (value) {
    return value
  }

  const newValue = typeof fallback === 'function' ? fallback() : fallback
  cache.set(key, newValue)
  return newValue
}

registerHook('VIEW_BEFORE_REFRESH', () => {
  renderCache.clear()
})

const render = markdown.render
markdown.render = (src: string, env?: any) => {
  triggerHook('MARKDOWN_BEFORE_RENDER', { src, env })

  // build render cache
  if (env.file) {
    const cacheKey = `__file_${env.file.repo}:${env.file.path}`
    if (!renderCache.has(cacheKey)) {
      renderCache.clear()
      renderCache.set(cacheKey, new Map())
    }
  } else {
    renderCache.clear()
  }

  markdown.options.html = getSetting('render.md-html', true)
  markdown.options.breaks = getSetting('render.md-breaks', true)
  markdown.options.linkify = getSetting('render.md-linkify', true)
  markdown.options.typographer = getSetting('render.md-typographer', false)

  return render.call(markdown, src, env)
}

markdown.use(MarkdownItSub)
markdown.use(MarkdownItSup)
markdown.use(MarkdownItMark)
markdown.use(MarkdownItAbbr)
markdown.use(MarkdownItAttributes)
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

markdown.core.ruler.after('normalize', 'after_normalize', state => {
  state.env.source = state.src
  state.env.tokens = state.tokens
  return true
})
