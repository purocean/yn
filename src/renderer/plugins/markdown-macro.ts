import frontMatter from 'front-matter'
import type { Plugin } from '@fe/context'
import { render } from '@fe/services/view'
import { readFile } from '@fe/support/api'
import type { Doc } from '@fe/types'
import { getLogger, md5 } from '@fe/utils'
import { dirname, resolve } from '@fe/utils/path'

type Result = { __macroResult: true, vars?: Record<string, any>, toString: () => string }
type Expression = { id: string, match: string, exp: string, vars: Record<string, any> }

const logger = getLogger('plugin-macro')

const AsyncFunction = Object.getPrototypeOf(async () => 0).constructor
let macroCache: Record<string, Record<string, Result>> = {}

function checkMacroResult (result: any) {
  if (
    result === null ||
    typeof result === 'function' ||
    typeof result === 'symbol' ||
    typeof result === 'undefined' ||
    (typeof result === 'object' && (!result.__macroResult))
  ) {
    throw new Error('Macro result type error.')
  }
}

function macro (expression: Expression, cache: Record<string, Result>): Result {
  logger.debug('macro', expression)

  const { id, match, exp, vars } = expression

  // async expression result cache
  if (id in cache) {
    return cache[id]
  }

  const FunctionConstructor = exp.startsWith('await') ? AsyncFunction : Function

  const fun = new FunctionConstructor('vars', `with (vars) { return (${exp}); }`)

  const result = fun(vars)

  if ((result instanceof Promise)) {
    result.then((res) => {
      checkMacroResult(res)
      return res
    }).catch(e => {
      logger.error('macro', id, e)
      return match
    }).then(res => {
      cache[id] = res
      logger.debug('macro', 'async', id, 'rerender')
      render()
    })

    return { __macroResult: true, toString: () => 'macro is running……' }
  }

  checkMacroResult(result)

  return result
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

async function include (belongDoc: Doc | undefined | null, path: string, trim = false): Promise<Result> {
  if (!belongDoc) {
    throw new Error('Current document is null')
  }

  try {
    const absolutePath = resolve(dirname(belongDoc.path), path)
    const { content } = await readFile({ repo: belongDoc.repo, path: absolutePath })
    const fm = frontMatter(content)

    // merge front-matter attributes to current document vars.
    const vars = {}
    if (fm.attributes && typeof fm.attributes === 'object') {
      Object.assign(vars, fm.attributes)
    }

    return { __macroResult: true, vars, toString: () => trim ? fm.body.trim() : fm.body }
  } catch (error: any) {
    return error.message
  }
}

export default {
  name: 'markdown-macro',
  register: ctx => {
    // clear cache after view refresh
    ctx.registerHook('VIEW_BEFORE_REFRESH', () => {
      macroCache = {}
    })

    ctx.markdown.registerPlugin(md => {
      md.core.ruler.after('normalize', 'macro', (state) => {
        const env = state.env || {}
        const file = env.file || {}

        const cacheKey = '' + file.repo + file.path
        // remove other file cache.
        macroCache = { [cacheKey]: macroCache[cacheKey] || {} }

        if (!env.attributes || !env.attributes.enableMacro) {
          return false
        }

        const vars: Record<string, any> = {
          $include: include.bind(null, file),
          $ctx: ctx,
          $doc: {
            basename: file.name ? file.name.substring(0, file.name.lastIndexOf('.')) : '',
            ...ctx.lib.lodash.pick(env.file, 'name', 'repo', 'path', 'content', 'status')
          },
          ...env.attributes,
        }

        if (!env.macroLines) {
          env.macroLines = []
        }

        const reg = /<=.+?=>/gs
        let lineOffset = 0
        let posOffset = 0
        state.src = state.src.replace(reg, (match, matchPos) => {
          try {
            const exp = match
              .substring(2, match.length - 2)
              .trim()
              .replace(/(?:=\\>|<\\=)/g, x => x.replace('\\', ''))

            const id = md5(exp)

            const expression = { id, match, exp, vars }
            const result = macro(expression, macroCache[cacheKey])

            if (result && result.__macroResult && result.vars) {
              Object.assign(vars, result.vars)
            }

            // result maybe string or other type.
            const resultStr = '' + result

            const matchLine = lineCount(match)
            const resultLine = lineCount(resultStr)

            if (resultLine !== matchLine) {
              const currentLineOffset = (matchLine - resultLine)
              const currentPosOffset = (match.length - resultStr.length)
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
                resultLength: resultStr.length,
              })
            }

            return resultStr
          } catch (error) {}

          return match
        })

        return false
      })
    })
  }
} as Plugin
