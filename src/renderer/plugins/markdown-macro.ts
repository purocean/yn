import type { Plugin } from '@fe/context'
import { render } from '@fe/services/view'
import { getLogger, md5 } from '@fe/utils'

const logger = getLogger('macro')

const AsyncFunction = Object.getPrototypeOf(async () => 0).constructor
let macroCache: Record<string, Record<string, string>> = {}

function checkMacroResult (result: any) {
  if (typeof result === 'object' ||
    typeof result === 'function' ||
    typeof result === 'symbol' ||
    typeof result === 'undefined'
  ) {
    throw new Error('Macro result type error.')
  }
}

function macro (match: string, vars: Record<string, any>, cache: Record<string, string>) {
  const expression = match
    .substring(2, match.length - 2)
    .trim()
    .replace(/(?:=\\>|<\\=)/g, x => x.replace('\\', ''))

  const id = md5(expression)

  logger.debug(id, expression, vars)

  // async expression result cache
  if (id in cache) {
    return cache[id]
  }

  const FunctionConstructor = expression.startsWith('await') ? AsyncFunction : Function

  const fun = new FunctionConstructor('vars', `with (vars) { return ${expression}; }`)

  const result = fun(vars)

  if ((result instanceof Promise)) {
    result.then((res) => {
      checkMacroResult(res)
      return res
    }).catch(e => {
      logger.error(id, e)
      return match
    }).then(res => {
      cache[id] = res
      logger.debug('async', id, 'rerender')
      render()
    })

    return 'macro is running……'
  }

  checkMacroResult(result)

  return '' + result
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

        const cacheKey = '' + file.repo + file.path
        // remove other file cache.
        macroCache = { [cacheKey]: macroCache[cacheKey] || {} }

        const reg = /<=.+?=>/gs
        let lineOffset = 0
        let posOffset = 0
        state.src = state.src.replace(reg, (match, matchPos) => {
          try {
            const result = macro(match, vars, macroCache[cacheKey])

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
