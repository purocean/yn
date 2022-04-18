import Markdown from 'markdown-it'
import mermaid from 'mermaid/dist/mermaid.js'
import DomToImage from 'dom-to-image'
import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Plugin } from '@fe/context'
import { debounce } from 'lodash-es'
import { downloadDataURL, getLogger, strToBase64 } from '@fe/utils'
import { registerHook, removeHook } from '@fe/core/hook'
import { getColorScheme } from '@fe/services/theme'
import monacoMermaid from '@fe/others/monaco-mermaid'

const logger = getLogger('mermaid')

function initMermaidTheme (colorScheme?: 'light' | 'dark') {
  colorScheme ??= getColorScheme()
  const theme = {
    light: 'default',
    dark: 'dark',
  }[colorScheme]

  if (mermaid.mermaidAPI.getConfig().theme === theme) {
    return
  }

  mermaid.mermaidAPI.initialize({ theme })
}

let mid = 1

const Mermaid = defineComponent({
  name: 'mermaid',
  props: {
    attrs: Object,
    code: {
      type: String,
      default: ''
    }
  },
  setup (props) {
    const container = ref<HTMLElement>()
    const imgRef = ref<HTMLElement>()
    const result = ref('')
    const img = ref('')
    const errMsg = ref('')

    function getImageUrl (code?: string) {
      const svg = code || container.value?.innerHTML
      if (!svg) {
        return ''
      }

      return 'data:image/svg+xml;base64,' + strToBase64(svg)
    }

    function render () {
      logger.debug('render', props.code)
      try {
        mermaid.render(`mermaid-${mid++}`, props.code, (svgCode: string) => {
          result.value = svgCode
          errMsg.value = ''
          img.value = getImageUrl(svgCode)
        }, container.value)
      } catch (error) {
        errMsg.value = '' + error
        logger.error('render', error)
      }
    }

    function exportSvg () {
      const url = getImageUrl()
      if (!url) {
        return
      }

      downloadDataURL(`mermaid-${Date.now()}.svg`, url)
    }

    async function exportPng () {
      if (!imgRef.value) {
        return
      }

      const width = imgRef.value.clientWidth
      const height = imgRef.value.clientHeight

      const dataUrl = await DomToImage
        .toPng(imgRef.value, { width: width * 2, height: height * 2 })

      downloadDataURL(`mermaid-${Date.now()}.png`, dataUrl)
    }

    async function beforeDocExport () {
      initMermaidTheme('light')
      render()
      setTimeout(async () => {
        initMermaidTheme()
        render()
      }, 500)
    }

    const renderDebounce = debounce(render, 100)

    watch(() => props.code, renderDebounce)

    onMounted(() => render())

    registerHook('THEME_CHANGE', renderDebounce)
    registerHook('DOC_BEFORE_EXPORT', beforeDocExport)
    onBeforeUnmount(() => {
      removeHook('THEME_CHANGE', renderDebounce)
      removeHook('DOC_BEFORE_EXPORT', beforeDocExport)
    })

    return () => {
      return h('div', { ...props.attrs, class: `mermaid-wrapper${errMsg.value ? ' error' : ''}` }, [
        h('div', { class: 'mermaid-action skip-print' }, [
          h('button', { class: 'small', onClick: exportSvg }, 'SVG'),
          h('button', { class: 'small', onClick: exportPng }, 'PNG'),
        ]),
        h('div', {
          ref: container,
          key: props.code,
          class: 'mermaid-container skip-export',
        }),
        h('img', {
          src: img.value,
          ref: imgRef,
          alt: 'mermaid',
          class: 'mermaid-image',
        }),
        h('pre', { class: 'mermaid-error skip-export' }, errMsg.value)
      ])
    }
  }
})

const MermaidPlugin = (md: Markdown) => {
  const temp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]
    const code = token.content.trim()
    if (token.info === 'mermaid') {
      return h(Mermaid, { attrs: token.meta?.attrs, code }) as any
    }

    const firstLine = code.split(/\n/)[0].trim()
    if (firstLine === 'gantt' || firstLine === 'sequenceDiagram' || firstLine.match(/^graph (?:TB|BT|RL|LR|TD);?$/)) {
      return h(Mermaid, { attrs: token.meta?.attrs, code }) as any
    }

    return temp(tokens, idx, options, env, slf)
  }
}

export default {
  name: 'markdown-mermaid',
  register: ctx => {
    ctx.theme.addStyles(`
      .markdown-view .markdown-body .mermaid-wrapper {
        --skip-contain: 1;
        position: relative;
      }

      .markdown-view .markdown-body .mermaid-wrapper .mermaid-action {
        --skip-contain: 1;
        position: absolute;
        right: 10px;
        top: 10px;
        z-index: 1;
        text-align: right;
        opacity: 0;
        transition: opacity .2s;
      }

      .markdown-view .markdown-body .mermaid-wrapper:hover .mermaid-action {
        --skip-contain: 1;
        opacity: 1;
      }

      .markdown-view .markdown-body .mermaid-wrapper .mermaid-container {
        --skip-contain: 1;
        visibility: hidden;
      }

      .markdown-view .markdown-body .mermaid-wrapper .mermaid-container > svg {
        --skip-contain: 1;
        display: block;
      }

      .markdown-view .markdown-body .mermaid-wrapper .mermaid-error {
        --skip-contain: 1;
        display: none;
        white-space: pre-wrap;
      }

      .markdown-view .markdown-body .mermaid-wrapper.error .mermaid-action,
      .markdown-view .markdown-body .mermaid-wrapper.error .mermaid-image {
        --skip-contain: 1;
        display: none;
      }

      .markdown-view .markdown-body .mermaid-wrapper.error .mermaid-error,
      .markdown-view .markdown-body .mermaid-wrapper.error .mermaid-container {
        --skip-contain: 1;
        display: block;
        visibility: visible;
      }
    `)

    ctx.markdown.registerPlugin(MermaidPlugin)

    initMermaidTheme()
    ctx.registerHook('THEME_CHANGE', () => initMermaidTheme())

    ctx.registerHook('VIEW_ON_GET_HTML_FILTER_NODE', async ({ node, options }) => {
      if (options.preferPng && node.tagName === 'IMG' && node.classList.contains('mermaid-image')) {
        try {
          const img = document.createElement('img')
          img.style.position = 'absolute'
          img.style.left = '200vw'
          img.src = (node as HTMLImageElement).src
          document.body.appendChild(img)
          const width = img.clientWidth
          const height = img.clientHeight
          document.body.removeChild(img)

          // svg to img
          const dataUrl = await ctx.lib.domtoimage
            .toPng(node, { width: width * 2, height: height * 2 })
          ;(node as HTMLImageElement).src = dataUrl
        } catch (error) {
          console.error(error)
        }
      }
    })

    ctx.editor.whenEditorReady().then(({ monaco }) => {
      monacoMermaid(monaco)
    })
  }
} as Plugin
