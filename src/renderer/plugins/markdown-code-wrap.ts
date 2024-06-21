import type { Plugin } from '@fe/context'
import type { FrontMatterAttrs, RenderEnv } from '@fe/types'

export default {
  name: 'markdown-code-wrap',
  register: ctx => {
    ctx.view.addStyles(`
      .markdown-view .markdown-body .${ctx.args.DOM_CLASS_NAME.WRAP_CODE},
      .markdown-view .markdown-body .${ctx.args.DOM_CLASS_NAME.WRAP_CODE} ~ .p-mcr-run-code-result {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .markdown-view .markdown-body pre > code.${ctx.args.DOM_CLASS_NAME.AVOID_PAGE_BREAK} {
        page-break-inside: avoid;
        display: block;
      }

      @media print {
        .markdown-view .markdown-body pre > code,
        .markdown-view .markdown-body .p-mcr-run-code-result {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
      }
    `)

    ctx.markdown.registerPlugin(md => {
      const temp = md.renderer.rules.fence!.bind(md.renderer.rules)
      md.renderer.rules.fence = (tokens, idx, options, env: RenderEnv, slf) => {
        const attrs: FrontMatterAttrs = env.attributes!
        if (attrs.wrapCode) {
          const token = tokens[idx]
          token.attrJoin('class', ctx.args.DOM_CLASS_NAME.WRAP_CODE)
        }

        return temp(tokens, idx, options, env, slf)
      }
    })
  }
} as Plugin
