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

function lineCount (str: string) {
  let s = 1
  const len = str.length

  for (let i = 0; i < len; i++) {
    if (str.charCodeAt(i) === 0x0A) {
      s++
    }
  }

  return s
}

export default {
  name: 'markdown-macro',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      md.core.ruler.after('normalize', 'macro', (state) => {
        const env = state.env || {}

        if (!env.attributes || !env.attributes.enableMacro) {
          return false
        }

        const file = env.file || {}
        const vars = {
          $ctx: ctx,
          $doc: {
            basename: file.name ? file.name.substring(0, file.name.lastIndexOf('.')) : '',
            ...ctx.lib.lodash.pick(env.file, 'name', 'repo', 'path', 'content', 'status')
          },
          ...env.attributes
        }

        if (!env.macroLines) {
          env.macroLines = []
        }

        const reg = /<=.+?=>/gs
        let lineOffset = 0
        let posOffset = 0
        state.src = state.src.replace(reg, (match, matchPos) => {
          try {
            const expression = match
              .substring(2, match.length - 2)
              .trim()
              .replace(/(?:=\\>|<\\=)/g, x => x.replace('\\', ''))

            const result = macro(expression, vars)

            const matchLine = lineCount(match)
            const resultLine = lineCount(result)

            if (resultLine !== matchLine) {
              const currentLineOffset = (matchLine - resultLine)
              const currentPosOffset = (match.length - result.length)
              lineOffset += currentLineOffset
              posOffset += currentPosOffset
              env.macroLines.push({
                matchPos,
                matchLine,
                resultLine,
                lineOffset,
                posOffset,
                currentPosOffset,
                currentLineOffset,
                matchLength: match.length,
                resultLength: result.length,
              })
            }

            return result
          } catch (error) {}

          return match
        })

        return false
      })
    })
  }
} as Plugin
