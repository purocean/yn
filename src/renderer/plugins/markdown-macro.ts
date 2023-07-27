import { escapeRegExp, merge, omit } from 'lodash-es'
import frontMatter from 'front-matter'
import type { Plugin } from '@fe/context'
import type { BuildInSettings, Doc } from '@fe/types'
import type { MenuItem } from '@fe/services/status-bar'
import { render } from '@fe/services/view'
import { t } from '@fe/services/i18n'
import { readFile } from '@fe/support/api'
import { getLogger, md5 } from '@fe/utils'
import { basename, dirname, resolve } from '@fe/utils/path'
import { getPurchased } from '@fe/others/premium'
import ctx from '@fe/context'

type Result = { __macroResult: true, vars?: Record<string, any>, value: string }
type CacheItem = {
  $include?: Record<string, CacheItem>
  $define: Record<string, string>
} & Record<string, Result | Promise<Result>>

const logger = getLogger('plugin-macro')
const debounceToast = ctx.lib.lodash.debounce((...args: [any, any]) => ctx.ui.useToast().show(...args), 300)
const magicNewline = '--yn-macro-new-line--'

const AsyncFunction = Object.getPrototypeOf(async () => 0).constructor
let globalMacroReplacement: Record<string, string> = {}

const globalVars = {
  $export: exportVar,
  $afterMacro: afterMacro,
  $ctx: ctx,
  $noop: noop,
}

function createSeq () {
  const counters: Record<string, number> = {}
  return function (str = '') {
    if (!counters[str]) {
      counters[str] = 0
    }
    counters[str]++
    return `${str}${counters[str]}`
  }
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

  exp = exp.replaceAll(magicNewline, '\n')

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
    cache: CacheItem,
    callback?: (result: Result | Promise<Result>, match: string, matchPos: number) => void
  },
): { value: string, vars: Record<string, any> } {
  let _vars: Record<string, any> = merge({ define: { ...globalMacroReplacement } }, vars)
  const define = { ...options.cache.$define, ..._vars.define }
  _vars.define = define
  const keys = Object.keys(define)
  if (keys.length) {
    const reg = new RegExp(keys.map(escapeRegExp).join('|'), 'g')
    src = src.replace(reg, match => {
      const val = define[match]
      // only support single line macro expression
      if (typeof val === 'string' && /^\s*\[=.+?=\]\s*$/s.test(val)) {
        // single line expression
        return val.trim().replaceAll('\n', magicNewline)
      } else {
        match = match.replace(/\n|'/, '\\$&')
        return `[= define['${match}'] =]`
      }
    })
  }

  const value = src.replace(/\[=.+?=\]/gs, (match, matchPos) => {
    try {
      const exp = match
        .substring(2, match.length - 2)
        .trim()
        .replace(/=\\\]|\[\\=/g, x => x.replace('\\', ''))

      const id = md5(exp)

      let result: Result | Promise<Result>
      if (options.purchased) {
        if (options.cache[id]) {
          result = options.cache[id]
        } else {
          result = macro(exp, _vars)
          if (result instanceof Promise) {
            options.cache[id] = result
              .catch(() => ({ __macroResult: true, value: match } as Result))
              .then(res => {
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
        return 'running...'
      }

      if (result.vars) {
        _vars = merge({}, result.vars, _vars)
      }

      return result.value
    } catch {}

    return match.replaceAll(magicNewline, '\n')
  })

  return { value, vars: _vars }
}

function exportVar (key: string, val: any): Result {
  return { __macroResult: true, vars: { [key]: val }, value: '' }
}

function afterMacro (fn: (src: string) => string): Result {
  return { __macroResult: true, vars: { $__hook_after_macro: fn }, value: '' }
}

// do nothing, text placeholder
function noop () {
  return { __macroResult: true, value: '' }
}

async function include (
  options: {
    belongDoc: Doc | undefined | null
    purchased: boolean,
    cache: CacheItem,
    count: number,
    vars: Record<string, any>
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
    const vars: Record<string, any> = merge(
      {},
      (fm.attributes && typeof fm.attributes === 'object') ? fm.attributes : {},
      options.vars
    )

    vars.$include = include.bind(null, { ...options, belongDoc: file, count: options.count + 1, vars })
    vars.$_doc = {
      basename: file.name ? file.name.substring(0, file.name.lastIndexOf('.')) : '',
      ...ctx.lib.lodash.pick(file, 'name', 'repo', 'path', 'content', 'status')
    }

    const cache = options.cache
    if (options.count === 0 && !options.cache.$include) {
      cache.$include = {}
    }

    const cacheKey = '' + options.count + file.repo + file.path
    if (!cache.$include![cacheKey]) {
      cache.$include![cacheKey] = { $define: {} } as CacheItem
    }

    const body = trim ? fm.body.trim() : fm.body

    const tasks: Promise<Result>[] = []
    let result = transform(
      body,
      vars,
      {
        ...options,
        cache: cache.$include![cacheKey],
        autoRerender: false,
        callback: res => {
          if (res instanceof Promise) {
            tasks.push(res.then(x => {
              cache.$include![cacheKey].$define = { ...x.vars?.define }
              return x
            }))
          }
        }
      }
    )

    if (tasks.length > 0) {
      await Promise.allSettled(tasks)

      // get final result
      result = transform(
        body,
        vars,
        {
          ...options,
          cache: cache.$include![cacheKey],
          autoRerender: false,
        }
      )
    }

    cache.$define = { ...result.vars.define }

    return { __macroResult: true, vars: omit(result.vars, '$include', '$_doc'), value: result.value }
  } catch (error: any) {
    return error.message
  }
}

function hookAfter (body: string, vars: Record<string, any>) {
  if (vars.$__hook_after_macro && typeof vars.$__hook_after_macro === 'function') {
    try {
      return vars.$__hook_after_macro(body)
    } catch (error) {
      debounceToast('warning', `[$afterMacro]: ${error}`)
      return body
    }
  }

  return body
}

export default {
  name: 'markdown-macro',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      md.core.ruler.after('normalize', 'after_normalize', (state) => {
        const env = state.env || {}
        const file = env.file || {}

        if (!env.attributes || !env.attributes.enableMacro) {
          return false
        }

        const cache = ctx.markdown.getRenderCache('plugin-macro', 'cache', { $define: {} } as CacheItem)

        const options = {
          purchased: getPurchased() || file.repo === ctx.args.HELP_REPO_NAME,
          cache,
          autoRerender: true,
        }

        const vars: Record<string, any> = { ...globalVars, ...env.attributes }

        vars.$include = include.bind(null, { ...options, belongDoc: file, count: 0, vars })
        vars.$seq = createSeq()
        vars.$doc = {
          basename: file.name ? file.name.substring(0, file.name.lastIndexOf('.')) : '',
          ...ctx.lib.lodash.pick(env.file, 'name', 'repo', 'path', 'content', 'status')
        }

        if (!env.macroLines) {
          env.macroLines = []
        }

        let lineOffset = 0
        let posOffset = 0

        const bodyBeginPos = env.bodyBeginPos || 0
        const head = state.src.substring(0, bodyBeginPos)
        const body = state.src.substring(bodyBeginPos)

        const result = transform(body, vars, {
          ...options,
          callback: (result, match, matchPos) => {
            if (result instanceof Promise) {
              return
            }

            const resultStr = result.value
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

        state.src = head + hookAfter(result.value, result.vars)
        state.env.originSource = state.env.source
        state.env.source = state.src

        return false
      })
    })

    ctx.registerHook('STARTUP', () => {
      ctx.statusBar.tapMenus(menus => {
        const list = menus['status-bar-tool']?.list
        if (list) {
          const id = 'plugin.markdown-macro.copy-markdown'
          const menu: MenuItem = {
            id,
            type: 'normal',
            hidden: !(ctx.view.getRenderEnv()?.attributes?.enableMacro),
            title: ctx.i18n.t('status-bar.tool.macro-copy-markdown'),
            onClick: () => {
              ctx.utils.copyText(ctx.view.getRenderEnv()?.source)
            }
          }

          const item = list.find(x => x.type === 'normal' && x.id === id)
          if (item) {
            Object.assign(item, menu)
          } else {
            list.push(menu)
          }
        }
      })
    })

    ctx.registerHook('VIEW_RENDERED', () => {
      ctx.statusBar.refreshMenu()
    })

    ctx.editor.tapSimpleCompletionItems(items => {
      /* eslint-disable no-template-curly-in-string */

      items.push(
        { label: '/ [= Macro', insertText: '[= ${1:1+1} =]' },
        { label: '/ [= Macro $include', insertText: '[= \\$include(\'$1\') =]' },
        { label: '/ [= Macro $afterMacro', insertText: '[= \\$afterMacro(src => { \n return src.toUpperCase(); \n}) =]' },
      )
    })

    ctx.editor.tapMarkdownMonarchLanguage(mdLanguage => {
      mdLanguage.tokenizer.root.unshift(
        [/\[=/, { token: 'keyword', next: '@monacoEnd', nextEmbedded: 'text/javascript' }],
      )

      mdLanguage.tokenizer.monacoEnd = [
        [/=\]/, { token: 'keyword', next: '@pop', nextEmbedded: '@pop' }]
      ]
    })

    ctx.setting.changeSchema(schema => {
      schema.groups.push({ label: 'T_setting-panel.tabs.macros', value: 'macros' })
      schema.properties.macros = {
        defaultValue: [],
        type: 'array',
        title: 'T_setting-panel.schema.repos.repos',
        format: 'table',
        group: 'macros',
        items: {
          type: 'object',
          title: 'T_setting-panel.schema.macros.macros',
          properties: {
            match: {
              type: 'string',
              title: 'T_setting-panel.schema.macros.match',
              defaultValue: '',
              maxLength: 50,
              options: {
                inputAttributes: { placeholder: 'T_setting-panel.schema.macros.match-placeholder' }
              },
            },
            replace: {
              type: 'string',
              title: 'T_setting-panel.schema.macros.replace',
              defaultValue: '',
              format: 'textarea',
              options: {
                inputAttributes: {
                  placeholder: 'T_setting-panel.schema.macros.replace-placeholder',
                  style: 'height: auto; resize: vertical; min-height: 37px;',
                  rows: 1,
                }
              },
            }
          } as any
        },
      }
    })

    ctx.registerHook('SETTING_BEFORE_WRITE', ({ settings }) => {
      if (settings.macros && Array.isArray(settings.macros)) {
        settings.macros = settings.macros.filter(x => x.match && x.replace)
      }
    })

    function buildGlobalMacroReplacement (settings: BuildInSettings) {
      const macros = settings.macros || []
      globalMacroReplacement = {}
      macros.forEach(x => {
        globalMacroReplacement[x.match] = x.replace
      })
    }

    ctx.registerHook('SETTING_FETCHED', ({ settings }) => {
      buildGlobalMacroReplacement(settings)
    }, true)

    ctx.registerHook('SETTING_CHANGED', ({ changedKeys, settings }) => {
      if (changedKeys.includes('macros')) {
        buildGlobalMacroReplacement(settings)
        ctx.view.render()
      }
    })
  }
} as Plugin
