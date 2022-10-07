import frontMatter from 'front-matter'
import type { Options } from 'markdown-it'
import type { Plugin } from '@fe/context'

export default {
  name: 'markdown-front-matter',
  register: ctx => {
    const logger = ctx.utils.getLogger('markdown-front-matter')
    ctx.markdown.registerPlugin(md => {
      const render = md.render

      let originOptions: typeof md.options

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

        if (!originOptions) {
          originOptions = { ...md.options }
        }

        // clear md.options
        Object.keys(md.options).forEach(key => {
          delete md.options[key as keyof Options]
        })

        Object.assign(md.options, originOptions)
        if (attributes.mdOptions && typeof attributes.mdOptions === 'object') {
          Object.assign(md.options, attributes.mdOptions)
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

    ctx.editor.tapSimpleCompletionItems(items => {
      /* eslint-disable no-template-curly-in-string */

      items.push(
        { label: '/ --- Front Matter', insertText: '---\nheadingNumber: true\nwrapCode: true\nenableMacro: true\nmdOptions: { linkify: true, breaks: true }\ndefine:\n    APP_NAME: Yank Note\n---\n' },
      )
    })
  }
} as Plugin
