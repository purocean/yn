import Markdown from 'markdown-it'
import mermaid from 'mermaid/dist/mermaid.js'
import { defineComponent, h, onMounted, ref, watch } from 'vue'
import type { Plugin } from '@fe/context'
import { debounce } from 'lodash-es'
import { getLogger } from '@fe/utils'

const logger = getLogger('mermaid')

let mid = 1

const Mermaid = defineComponent({
  name: 'mermaid',
  props: {
    code: {
      type: String,
      default: ''
    }
  },
  setup (props) {
    const container = ref<HTMLElement>()
    const result = ref('')

    function render () {
      logger.debug('render', props.code)
      try {
        mermaid.render(`mermaid-${mid++}`, props.code, (svgCode: string) => {
          result.value = svgCode
        }, container.value)
      } catch (error) {
        logger.error('render', error)
      }
    }

    const renderDebounce = debounce(render, 100)

    watch(() => props.code, renderDebounce)

    onMounted(() => setTimeout(render, 0))

    return () => {
      return h('div', {
        ref: container,
        key: props.code,
        class: 'mermaid reduce-brightness',
        innerHTML: result.value,
      })
    }
  }
})

const MermaidPlugin = (md: Markdown) => {
  const temp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]
    const code = token.content.trim()
    if (token.info === 'mermaid') {
      return h(Mermaid, { code }) as any
    }

    const firstLine = code.split(/\n/)[0].trim()
    if (firstLine === 'gantt' || firstLine === 'sequenceDiagram' || firstLine.match(/^graph (?:TB|BT|RL|LR|TD);?$/)) {
      return h(Mermaid, { code }) as any
    }

    return temp(tokens, idx, options, env, slf)
  }
}

export default {
  name: 'markdown-mermaid',
  register: ctx => {
    ctx.theme.addStyles(`
      .markdown-view .markdown-body .mermaid {
        background: #fff;
      }
    `)
    ctx.markdown.registerPlugin(MermaidPlugin)
  }
} as Plugin
