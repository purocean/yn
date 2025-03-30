import type { Options } from 'markdown-it'
import type { Plugin } from '@fe/context'
import { processFrontMatter, useMarkdownItRule } from './lib'
import workerIndexerUrl from './worker-indexer?worker&url'

export default {
  name: 'markdown-front-matter',
  register: ctx => {
    const logger = ctx.utils.getLogger('markdown-front-matter')
    ctx.markdown.registerPlugin(md => {
      const render = md.render

      md.render = (src: string, env: any) => {
        const { attributes } = processFrontMatter(src, env)
        logger.debug('render', attributes)

        // save origin options
        const originOptions = { ...md.options }

        // set options
        if (attributes.mdOptions && typeof attributes.mdOptions === 'object') {
          Object.assign(md.options, attributes.mdOptions)
        }

        const result = render.call(md, src, env)

        // clear md.options
        Object.keys(md.options).forEach(key => {
          delete md.options[key as keyof Options]
        })

        // restore origin options
        Object.assign(md.options, originOptions)

        return result
      }

      useMarkdownItRule(md)
    })

    ctx.editor.tapSimpleCompletionItems(items => {
      /* eslint-disable no-template-curly-in-string */

      items.push(
        { language: 'markdown', label: '/ --- Front Matter', insertText: '---\nheadingNumber: true\nwrapCode: true\nenableMacro: true\nmdOptions: { linkify: true, breaks: true }\ndefine:\n    APP_NAME: Yank Note\n---\n', block: true },
      )
    })

    ctx.indexer.importScriptsToWorker(new URL(workerIndexerUrl, import.meta.url))
  }
} as Plugin
