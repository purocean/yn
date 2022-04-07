import type { Plugin } from '@fe/context'
import type { FrontMatterAttrs, RenderEnv } from '@fe/types'

export default {
  name: 'markdown-code-wrap',
  register: ctx => {
    ctx.theme.addStyles(`
      .markdown-view .markdown-body .${ctx.constant.DOM_CLASS_NAME.WRAP_CODE} {
        white-space: pre-wrap;
      }

      @media print {
        .markdown-view .markdown-body pre > code,
        .markdown-view .markdown-body .p-mcr-run-code-result {
          white-space: pre-wrap;
        }
      }
    `)

    ctx.markdown.registerPlugin(md => {
      const temp = md.renderer.rules.fence!.bind(md.renderer.rules)
      md.renderer.rules.fence = (tokens, idx, options, env: RenderEnv, slf) => {
        const attrs: FrontMatterAttrs = env.attributes!
        if (attrs.wrapCode) {
          const token = tokens[idx]
          token.attrJoin('class', ctx.constant.DOM_CLASS_NAME.WRAP_CODE)
        }

        return temp(tokens, idx, options, env, slf)
      }
    })
  }
} as Plugin
