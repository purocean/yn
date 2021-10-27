import Markdown from 'markdown-it'
import { defineComponent, h, ref, watch } from 'vue'
import { Plugin } from '@fe/context'
import { buildSrc, IFrame } from '@fe/support/embed'
import * as api from '@fe/support/api'
import { useBus } from '@fe/core/bus'
import { openWindow } from '@fe/support/env'

const Drawio = defineComponent({
  name: 'drawio',
  props: {
    url: String,
    content: String
  },
  setup (props) {
    const bus = useBus()
    const srcdoc = ref('')
    const refIFrame = ref<any>()

    watch(props, async () => {
      srcdoc.value = await buildSrcdoc({ url: props.url, content: props.content || '' })
    }, { immediate: true })

    const resize = () => {
      const iframe = refIFrame.value.getIframe()
      if (iframe) {
        iframe.contentDocument.body.style.height = 'auto'
        iframe.contentDocument.documentElement.style.height = 'auto'
        iframe.height = iframe.contentDocument.documentElement.offsetHeight + 'px'
        iframe.contentDocument.body.style.height = iframe.contentDocument.body.clientHeight + 'px'
        iframe.contentDocument.documentElement.style.height = '100%'
        bus.emit('global.resize')
      }
    }

    const reload = () => {
      refIFrame.value.reload()
    }

    setTimeout(resize, 1000)

    const button = (text: string, onClick: any) => h('button', {
      style: 'margin-left: 5px;font-size: 14px;background: #cacaca; border: 0; padding: 0 6px; color: #2c2b2b; cursor: pointer; border-radius: 4px; transition: all .1s ease-in-out; line-height: 24px;',
      onClick
    }, text)

    return () => h('div', { class: 'drawio-wrapper reduce-brightness', style: 'position: relative' }, [
      h(
        'div',
        {
          class: 'no-print',
          style: 'position: absolute; right: 15px; top: 3px; z-index: 1;'
        },
        [
          button('适应高度', resize),
          button('重载', reload),
          button('新窗口打开', () => openWindow(buildSrc(srcdoc.value, '查看图形'))),
        ]
      ),
      h(IFrame, {
        html: srcdoc.value,
        ref: refIFrame,
        onLoad: resize,
        iframeProps: {
          class: 'drawio',
          height: '300px',
        },
      })
    ])
  }
})

const MarkdownItPlugin = (md: Markdown) => {
  const render = ({ url, content }: any) => h(Drawio, { url, content })

  const linkTemp = md.renderer.rules.link_open!.bind(md.renderer.rules)
  md.renderer.rules.link_open = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    if (token.attrGet('link-type') !== 'drawio') {
      return linkTemp(tokens, idx, options, env, slf)
    }

    const url = token.attrGet('href')
    const nextToken = tokens[idx + 1]
    if (nextToken && nextToken.type === 'text') {
      nextToken.content = ''
    }

    return render({ url }) as any
  }

  const fenceTemp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    const code = token.content.trim()
    const firstLine = code.split(/\n/)[0].trim()
    if (token.info !== 'xml' || !firstLine.includes('--drawio--')) {
      return fenceTemp(tokens, idx, options, env, slf)
    }

    return render({ content: code }) as any
  }
}

type F = { repo?: string; path?: string; url?: string; content: string }

async function buildSrcdoc ({ repo, path, content, url }: F) {
  if (url) {
    content = await (await fetch(url)).text()
  } else if (!content && repo && path) {
    content = (await api.readFile({ repo, path })).content
  }

  content = content.replace(/<!--.*?-->/gs, '').trim()

  const div = document.createElement('div')
  div.className = 'mxgraph'
  div.dataset.mxgraph = JSON.stringify({
    highlight: '#00afff',
    lightbox: false,
    nav: true,
    resize: true,
    toolbar: 'pages zoom layers',
    page: 1,
    xml: content,
  })

  return `
    <style>
      ::selection {
        background: #d3d3d3;
      }

      ::-webkit-scrollbar {
        width: 7px;
        height: 7px;
      }

      ::-webkit-scrollbar-track {
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.08);
        box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.1);
      }

      ::-webkit-scrollbar-thumb {
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.09);
        box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.1);
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .mxgraph {
        max-width: 100%;
      }

      .geDiagramContainer {
        max-width: 100%;
        max-height: 100%;
      }

      body {
        background: #fff;
      }
    </style>
    ${div.outerHTML}
    <script src="${location.origin}/viewer.min.js"></script>
  `
}

export default {
  name: 'markdown-drawio',
  register: ctx => {
    ctx.markdown.registerPlugin(MarkdownItPlugin)

    ctx.registerHook('ON_TREE_NODE_SELECT', async (item: any) => {
      if (item.path.toLowerCase().endsWith('.drawio')) {
        const srcdoc = await buildSrcdoc(item)
        openWindow(buildSrc(srcdoc, '查看图形'))

        return true
      }

      return false
    })
  }
} as Plugin
