import frontMatter from 'front-matter'
import type { Plugin } from '@fe/context'

export default {
  name: 'markdown-front-matter',
  register: ctx => {
    const logger = ctx.utils.getLogger('markdown-front-matter')
    ctx.markdown.registerPlugin(md => {
      const render = md.render
      md.render = (src: string, env?: any) => {
        const fm = frontMatter(src)
        const bodyBegin = fm.bodyBegin - 1
        const attributes = typeof fm.attributes === 'object' ? fm.attributes : {}

        logger.debug('render', bodyBegin, attributes)

        return render.call(md, src, { ...env, bodyBegin, attributes })
      }

      const firstRule = (md.block.ruler as any).__rules__[0]
      md.block.ruler.before(firstRule.name, 'front-matter', (state, startLine) => {
        const bodyBegin = state.env?.bodyBegin || 0
        if (startLine >= bodyBegin) {
          return false
        }

        state.line = bodyBegin
        return true
      })
    })
  }
} as Plugin
