import type { Plugin } from '@fe/context'
import type Renderer from 'markdown-it/lib/renderer'
import type Token from 'markdown-it/lib/token'

function getLine (token: Token, env?: Record<string, any>) {
  const [lineStart, lineEnd] = token.map || [0, 1]

  // 由于宏替换，可能导致源码行号和渲染内容行号不一致，需要补偿，参考 `markdown-macro` 插件
  let sOffset = 0
  if (env?.macroLines && env.bMarks && env.eMarks) {
    const sPos = env.bMarks[lineStart]
    for (let i = 0; i < env.macroLines.length; i++) {
      const { matchPos, lineOffset, posOffset } = env.macroLines[i]
      if (sPos + posOffset > matchPos) {
        sOffset = lineOffset
      } else {
        break
      }
    }
  }

  return [lineStart + sOffset, lineEnd + sOffset]
}

const buildFunction = (className: string): Renderer.RenderRule => {
  return (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    const [lineStart, lineEnd] = getLine(token, env)

    if (token.map) {
      token.attrJoin('class', className)
      token.attrSet('data-source-line', String(lineStart + 1))
      token.attrSet('data-source-line-end', String(lineEnd + 1))
    }
    return slf.renderToken(tokens, idx, options)
  }
}

export const injectLineNumbers = buildFunction('source-line')

export default {
  name: 'markdown-source-line',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      md.renderer.rules.paragraph_open = injectLineNumbers
      md.renderer.rules.heading_open = injectLineNumbers
      md.renderer.rules.list_item_open = injectLineNumbers
      md.renderer.rules.table_open = injectLineNumbers
      md.renderer.rules.td_open = buildFunction('yank-table-cell')
      md.renderer.rules.th_open = buildFunction('yank-table-cell')
    })
  }
} as Plugin
