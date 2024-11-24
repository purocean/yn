import frontMatter from 'front-matter'
import type MarkdownIt from 'markdown-it'

export function processFrontMatter (src: string, env: any) {
  let bodyBegin = 0
  let attributes: Record<string, any> = {}
  try {
    const fm = frontMatter(src)

    bodyBegin = fm.bodyBegin - 1
    if (fm.attributes && typeof fm.attributes === 'object') {
      attributes = fm.attributes
    }
  } catch (error) {
    console.error(error)
  }

  let count = 0
  let bodyBeginPos = 0
  while (count < bodyBegin) {
    count++
    bodyBeginPos = src.indexOf('\n', bodyBeginPos + 1)
  }

  Object.assign(env, { bodyBegin, bodyBeginPos, attributes, _front_matter_exec_flag: false })

  return { attributes }
}

export function useMarkdownItRule (md: MarkdownIt) {
  const firstRule = (md.block.ruler as any).__rules__[0]
  md.block.ruler.before(firstRule.name, 'front-matter', (state, startLine) => {
    if (state.env?._front_matter_exec_flag) {
      return false
    }

    const bodyBegin = state.env?.bodyBegin || 0
    if (startLine >= bodyBegin) {
      return false
    }

    state.line = bodyBegin
    state.env._front_matter_exec_flag = true
    return true
  })
}
