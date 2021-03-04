import { getKeyLabel } from '@/useful/shortcut'
import { Plugin, Ctx } from '@/useful/plugin'

export default {
  name: 'markdown-code',
  register: (ctx: Ctx) => {
    ctx.registerMarkdownItPlugin(md => {
      const Fun = (fn: Function) => (tokens: any, idx: any, options: any, env: any, slf: any) => {
        if (tokens[idx].attrIndex('title') < 0) {
          tokens[idx].attrJoin('class', 'copy-inner-text')
          tokens[idx].attrPush(['title', getKeyLabel('CtrlCmd') + ' + 单击复制'])
        }

        return (fn)(tokens, idx, options, env, slf)
      }

      md.renderer.rules.code_inline = Fun(md.renderer.rules.code_inline!!.bind(md.renderer.rules))
    })
  }
} as Plugin
