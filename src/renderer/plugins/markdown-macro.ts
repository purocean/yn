import type { Plugin } from '@fe/context'

function macro (expression: string, vars: Record<string, any>) {
  console.log('macro >', expression, vars)
  // eslint-disable-next-line no-new-func
  const fun = new Function('vars', `with (vars) { return ${expression}; }`)

  const res = fun(vars)

  if (typeof res === 'object' || typeof res === 'function' || typeof res === 'symbol' || typeof res === 'undefined') {
    throw new Error('返回数据类型错误')
  }

  return '' + res
}

export default {
  name: 'markdown-macro',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      const render = md.render
      md.render = (src: string, env?: any) => {
        let vars: Record<string, any> | undefined
        function getVars () {
          if (!vars) {
            const file = env.file || {}
            vars = {
              $ctx: ctx,
              $doc: {
                basename: file.name ? file.name.substring(0, file.name.lastIndexOf('.')) : '',
                ...ctx.lib.lodash.pick(env.file, 'name', 'repo', 'path', 'content', 'status')
              },
              ...env.attributes
            }
          }

          return vars || {}
        }

        const keys = Object.keys(env.attributes)
        if (keys.length > 0) {
          const reg = /<=((?:.|\s)+?)=>/g
          src = src.replace(reg, (match, $1) => {
            try {
              return macro($1.trim(), getVars())
            } catch {}

            return match
          })
        }

        return render.call(md, src, env)
      }
    })
  }
} as Plugin
