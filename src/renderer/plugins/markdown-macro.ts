import type { Plugin } from '@fe/context'

export default {
  name: 'markdown-macro',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      const render = md.render
      md.render = (src: string, env?: any) => {
        const keys = Object.keys(env.attributes)
        if (keys.length > 0) {
          const reg = new RegExp(`(\\{${keys.join('\\}|\\{')}\\})`, 'g')
          src = src.replace(reg, (match) => {
            return env.attributes[match.substring(1, match.length - 1)]
          })
        }

        return render.call(md, src, env)
      }
    })
  }
} as Plugin
