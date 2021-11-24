import { omit } from 'lodash-es'
import frontMatter from 'front-matter'
import type { Plugin } from '@fe/context'
import { render } from '@fe/services/view'
import { t } from '@fe/services/i18n'
import { readFile } from '@fe/support/api'
import type { Doc } from '@fe/types'
import { getLogger, md5 } from '@fe/utils'
import { basename, dirname, resolve } from '@fe/utils/path'
import { getPurchased } from '@fe/others/premium'
import ctx from '@fe/context'

type Result = { __macroResult: true, vars?: Record<string, any>, value: string }

const logger = getLogger('plugin-macro')

const AsyncFunction = Object.getPrototypeOf(async () => 0).constructor
let macroCache: Record<string, Record<string, Result | Promise<Result>>> = {}

const globalVars = {
  $export: exportVar,
  $ctx: ctx,
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

function wrapResult (result: any) {
  let value = result
  let res = result
  if (result.__macroResult) {
    value = result.value
  } else {
    res = { __macroResult: true, value: '' + value }
  }

  if (
    value === null ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'undefined' ||
    (typeof value === 'object')
  ) {
    throw new Error('Macro result type error.')
  }

  return res
}

function macro (exp: string, vars: Record<string, any>): Result | Promise<Result> {
  logger.debug('macro', exp)

  const FunctionConstructor = exp.startsWith('await') ? AsyncFunction : Function
  const fun = new FunctionConstructor('vars', `with (vars) { return (${exp}); }`)

  let result = fun(vars)

  if (!(result instanceof Promise)) {
    return wrapResult(result)
  }

  result = result.then(wrapResult)

  return result
}

function transform (
  src: string,
  vars: Record<string, any>,
  options: {
    autoRerender: boolean,
    purchased: boolean,
    cache: Record<string, Result | Promise<Result>>,
    callback?: (result: Result | Promise<Result>, match: string, matchPos: number) => void
  },
) {
  return src.replace(/\[=.+?=\]/gs, (match, matchPos) => {
    try {
      const exp = match
        .substring(2, match.length - 2)
        .trim()
        .replace(/(?:=\\\]|\[\\=)/g, x => x.replace('\\', ''))

      const id = md5(exp)

      let result: Result | Promise<Result>
      if (options.purchased) {
        if (options.cache[id]) {
          result = options.cache[id]
        } else {
          result = macro(exp, vars)
          if (result instanceof Promise) {
            options.cache[id] = result.then(res => {
              options.cache[id] = res
              options.autoRerender && render()
              return res
            })
          }
        }
      } else {
        result = { __macroResult: true, value: t('premium.need-purchase', 'Macro') + `, <a href="javascript: ctx.showPremium()">${t('premium.buy-license')}</a> ` }
      }

      options.callback?.(result, match, matchPos)

      if (result instanceof Promise) {
        return 'macro is running……'
      }

      if (result.vars) {
        Object.assign(vars, result.vars)
      }

      return result.value
    } catch {}

    return match
  })
}

function exportVar (key: string, val: any): Result {
  return { __macroResult: true, vars: { [key]: val }, value: '' }
}

async function include (
  options: {
    belongDoc: Doc | undefined | null
    purchased: boolean,
    cache: Record<string, Result | Promise<Result>>,
    count: number,
  },
  path: string,
  trim = false
): Promise<Result> {
  const { belongDoc } = options

  if (!belongDoc) {
    throw new Error('Current document is null')
  }

  if (options.count >= 3) {
    return { __macroResult: true, value: 'Error: $include maximum call stack size exceeded [3]' }
  }

  if (!path.endsWith('.md')) {
    return { __macroResult: true, value: 'Error: $include markdown file only' }
  }

  try {
    const absolutePath = resolve(dirname(belongDoc.path), path)
    const file: Doc = { type: 'file', name: basename(absolutePath), repo: belongDoc.repo, path: absolutePath }
    const { content } = await readFile(file)
    const fm = frontMatter(content)

    // merge front-matter attributes to current document vars.
    const vars = {
      ...globalVars,
      $include: include.bind(null, { ...options, belongDoc: file, count: options.count + 1 }),
      $doc: {
        basename: file.name ? file.name.substring(0, file.name.lastIndexOf('.')) : '',
        ...ctx.lib.lodash.pick(file, 'name', 'repo', 'path', 'content', 'status')
      },
    }

    if (fm.attributes && typeof fm.attributes === 'object') {
      Object.assign(vars, fm.attributes)
    }

    const cache: any = options.cache
    if (options.count === 0 && !options.cache.$include) {
      cache.$include = {}
    }

    const cacheKey = '' + options.count + file.repo + file.path
    if (!cache.$include[cacheKey]) {
      cache.$include[cacheKey] = {}
    }

    const body = trim ? fm.body.trim() : fm.body

    const tasks: Promise<Result>[] = []
    let value = transform(
      body,
      vars,
      {
        ...options,
        cache: cache.$include[cacheKey],
        autoRerender: false,
        callback: res => {
          if (res instanceof Promise) {
            tasks.push(res)
          }
        }
      }
    )

    if (tasks.length > 0) {
      await Promise.allSettled(tasks)

      // get final result
      value = transform(
        body,
        vars,
        {
          ...options,
          cache: cache.$include[cacheKey],
          autoRerender: false,
        }
      )
    }

    return { __macroResult: true, vars: omit(vars, '$include', '$doc'), value }
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

        const options = {
          purchased: getPurchased() || file.repo === '__help__',
          cache: macroCache[cacheKey],
          autoRerender: true,
        }

        const vars: Record<string, any> = {
          ...globalVars,
          $include: include.bind(null, { ...options, belongDoc: file, count: 0 }),
          $doc: {
            basename: file.name ? file.name.substring(0, file.name.lastIndexOf('.')) : '',
            ...ctx.lib.lodash.pick(env.file, 'name', 'repo', 'path', 'content', 'status')
          },
          ...env.attributes,
        }

        if (!env.macroLines) {
          env.macroLines = []
        }

        let lineOffset = 0
        let posOffset = 0

        state.src = transform(state.src, vars, {
          ...options,
          callback: (result, match, matchPos) => {
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
          }
        })

        state.env.originSource = state.env.source
        state.env.source = state.src

        return false
      })
    })
  }
} as Plugin
