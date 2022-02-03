import frontMatter from 'front-matter'
import type { Plugin } from '@fe/context'

export default {
  name: 'markdown-front-matter',
  register: ctx => {
    const logger = ctx.utils.getLogger('markdown-front-matter')
    ctx.markdown.registerPlugin(md => {
      const render = md.render

      const originOptions = ctx.lib.lodash.cloneDeep(md.options)

      md.render = (src: string, env?: any) => {
        let bodyBegin = 0
        let attributes: Record<string, any> = {}
        try {
          const fm = frontMatter(src)

          bodyBegin = fm.bodyBegin - 1
          if (fm.attributes && typeof fm.attributes === 'object') {
            attributes = fm.attributes
          }
        } catch (error) {
          console.error(error)
        }

        logger.debug('render', bodyBegin, attributes)

        let count = 0
        let bodyBeginPos = 0
        while (count < bodyBegin) {
          count++
          bodyBeginPos = src.indexOf('\n', bodyBeginPos + 1)
        }

        if (attributes.mdOptions && typeof attributes.mdOptions === 'object') {
          (md as any).options = {
            ...ctx.lib.lodash.cloneDeep(originOptions),
            ...attributes.mdOptions
          }
        } else {
          (md as any).options = ctx.lib.lodash.cloneDeep(originOptions)
        }

        Object.assign(env, { bodyBegin, bodyBeginPos, attributes, _front_matter_exec_flag: false })
        return render.call(md, src, env)
      }

      const firstRule = (md.block.ruler as any).__rules__[0]
      md.block.ruler.before(firstRule.name, 'front-matter', (state, startLine) => {
        if (state.env?._front_matter_exec_flag) {
          return false
        }

        const bodyBegin = state.env?.bodyBegin || 0
        if (startLine >= bodyBegin) {
          return false
        }

        state.line = bodyBegin
        state.env._front_matter_exec_flag = true
        return true
      })
    })
  }
} as Plugin
