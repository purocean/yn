import Markdown from 'markdown-it'
import mermaid from 'mermaid/dist/mermaid.js'
import { Plugin } from '@fe/useful/plugin'

const mermaidChart = (code: string) => {
  try {
    mermaid.parse(code)
    return `<div class="mermaid">${code}</div>`
  } catch ({ str, hash }) {
    return `<pre>${str}</pre>`
  }
}

const MermaidPlugin = (md: Markdown) => {
  mermaid.initialize({})

  const temp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]
    const code = token.content.trim()
    if (token.info === 'mermaid') {
      return mermaidChart(code)
    }
    const firstLine = code.split(/\n/)[0].trim()
    if (firstLine === 'gantt' || firstLine === 'sequenceDiagram' || firstLine.match(/^graph (?:TB|BT|RL|LR|TD);?$/)) {
      return mermaidChart(code)
    }
    return temp(tokens, idx, options, env, slf)
  }
}

export default {
  name: 'mermaid',
  register: ctx => {
    ctx.markdown.registerPlugin(MermaidPlugin)
    ctx.registerHook('ON_VIEW_RENDER', () => mermaid.init('.mermaid'))
  }
} as Plugin
