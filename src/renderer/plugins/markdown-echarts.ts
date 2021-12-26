import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import Markdown from 'markdown-it'
import type { Plugin } from '@fe/context'
import { getColorScheme } from '@fe/services/theme'
import { debounce } from 'lodash-es'
import { registerHook, removeHook } from '@fe/core/hook'
import { dataURItoBlobLink, getLogger, sleep } from '@fe/utils'
import type { ExportTypes } from '@fe/types'

const logger = getLogger('echarts')

const Echarts = defineComponent({
  name: 'echarts',
  props: {
    attrs: Object,
    code: {
      type: String,
      default: '',
    }
  },
  setup (props) {
    let chart: echarts.ECharts | null = null

    const container = ref<HTMLElement>()
    const error = ref<any>()
    const imgSrc = ref('')

    function cleanChart () {
      logger.debug('cleanChart')
      chart?.dispose()
      chart = null
    }

    function render (theme?: 'dark' | 'light', animation?: boolean, img = false) {
      logger.debug('render', { theme, animation, img })

      if (!container.value) {
        cleanChart()
        return
      }

      if (typeof theme === 'string') {
        cleanChart()
      }

      if (!chart) {
        logger.debug('init', theme || getColorScheme())
        chart = echarts.init(container.value, theme || getColorScheme())
      }

      if (typeof animation === 'boolean') {
        chart.setOption({ animation })
      } else {
        chart.setOption({ animation: true })
      }

      try {
        // eslint-disable-next-line
        eval(`(${props.code})(chart)`)
        if (img) {
          imgSrc.value = chart.getDataURL({ type: 'png' })
          cleanChart()
        } else {
          imgSrc.value = ''
        }
      } catch (e: any) {
        error.value = e
        cleanChart()
      }
    }

    const renderDebounce = debounce(render, 400)

    function resize () {
      chart?.resize()
    }

    async function beforeExport ({ type }: { type: ExportTypes }) {
      render('light', false, type !== 'pdf') // convert to image and set light theme.
      await sleep(0)
      setTimeout(async () => {
        imgSrc.value = ''
        error.value = null
        nextTick(() => render(getColorScheme(), false))
      }, 500) // restore
    }

    function changeTheme () {
      render(getColorScheme())
    }

    const exportData = async (type: 'png') => {
      if (!chart) {
        return
      }

      const link = document.createElement('a')
      link.href = dataURItoBlobLink(chart.getDataURL({ type, pixelRatio: 2 }))
      link.target = '_blank'
      link.download = `echarts-${Date.now()}.${type}`
      link.click()
    }

    watch(() => props.code, () => {
      if (error.value) {
        imgSrc.value = ''
        error.value = null
        nextTick(renderDebounce)
      } else {
        renderDebounce()
      }
    })

    onMounted(() => setTimeout(render, 0))

    registerHook('GLOBAL_RESIZE', resize)
    registerHook('DOC_BEFORE_EXPORT', beforeExport)
    registerHook('THEME_CHANGE', changeTheme)

    onBeforeUnmount(() => {
      removeHook('GLOBAL_RESIZE', resize)
      removeHook('DOC_BEFORE_EXPORT', beforeExport)
      removeHook('THEME_CHANGE', changeTheme)
      chart?.dispose()
      chart = null
    })

    return () => {
      if (error.value) {
        return h('pre', {
          class: 'echarts',
          style: 'background: var(--g-color-95); padding: 20px'
        }, `${error.value}\n\n${props.code}`)
      }

      if (imgSrc.value) {
        return h('img', { src: imgSrc.value })
      }

      return h('div', { ...props.attrs, class: 'echarts-wrapper' }, [
        h('div', { class: 'echarts-action no-print' }, [
          h('button', { class: 'small', onClick: () => exportData('png') }, 'PNG'),
        ]),
        h('div', { ref: container, class: 'echarts' }),
      ])
    }
  }
})

const MarkdownItPlugin = (md: Markdown) => {
  const temp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    const code = token.content.trim()
    const firstLine = code.split(/\n/)[0].trim()
    if (token.info !== 'js' || !firstLine.includes('--echarts--')) {
      return temp(tokens, idx, options, env, slf)
    }

    return h(Echarts, { attrs: token.meta?.attrs, code }) as any
  }
}

export default {
  name: 'markdown-echarts',
  register: ctx => {
    ctx.theme.addStyles(`
      .markdown-view .markdown-body .echarts-wrapper {
        position: relative;
      }

      .markdown-view .markdown-body .echarts-wrapper .echarts-action {
        position: absolute;
        right: 10px;
        top: 10px;
        z-index: 1;
        text-align: right;
        opacity: 0;
        transition: opacity .2s;
      }

      .markdown-view .markdown-body .echarts-wrapper:hover .echarts-action {
        opacity: 1;
      }

      .markdown-view .markdown-body .echarts {
        width: 100%;
        height: 350px;
      }
    `)

    ctx.markdown.registerPlugin(MarkdownItPlugin)
  }
} as Plugin
