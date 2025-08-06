import { Plugin } from '@fe/context'
import { hashTags, RE_MATCH, RULE_NAME } from './lib'
import workerIndexerUrl from './worker-indexer?worker&url'

export default {
  name: 'markdown-hashtags',
  register: (ctx) => {
    ctx.markdown.registerPlugin(md => {
      md.inline.ruler.push(RULE_NAME, hashTags)
      md.renderer.rules.hash_tag = (tokens, idx) => {
        const token = tokens[idx]
        const tag = token.content
        return ctx.lib.vue.h('span', {
          class: ctx.args.DOM_CLASS_NAME.HASH_TAG,
          [ctx.args.DOM_ATTR_NAME.DATA_HASHTAG]: tag,
        }, tag) as any
      }
    })

    ctx.indexer.importScriptsToWorker(new URL(workerIndexerUrl, import.meta.url))

    ctx.registerHook('SETTING_CHANGED', ({ changedKeys }) => {
      if (changedKeys.includes('render.md-hash-tags')) {
        ctx.indexer.rebuildCurrentRepo()
      }
    })

    ctx.view.addStyles(`
      .markdown-body .${ctx.args.DOM_CLASS_NAME.HASH_TAG} {
        background-color: rgb(159 167 214 / 34%);
        border-radius: 0.5em;
        padding: 0.2em 0.5em;
        font-size: 0.9em;
        color: var(--g-color-0-rgb);
        cursor: pointer;
      }
    `)

    ctx.editor.tapMarkdownMonarchLanguage(mdLanguage => {
      mdLanguage.tokenizer.root.unshift(
        [new RegExp(`^${RE_MATCH.source}`), 'metatag'],
        [new RegExp(`\\s${RE_MATCH.source}`), 'metatag']
      )
    })

    ctx.registerHook('VIEW_ELEMENT_CLICK', ({ e }) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'SPAN' && target.classList.contains(ctx.args.DOM_CLASS_NAME.HASH_TAG)) {
        const tag = target.getAttribute(ctx.args.DOM_ATTR_NAME.DATA_HASHTAG)
        if (tag) {
          ctx.action.getActionHandler('workbench.show-quick-open')({
            query: tag + ' ',
            tab: 'file',
          })
        }
      }
    })
  }
} as Plugin
