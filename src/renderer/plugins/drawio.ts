import Markdown from 'markdown-it'
import { Plugin } from '@fe/useful/plugin'
import file from '@fe/useful/file'
import { useBus } from '@fe/useful/bus'
import { openInNewWindow } from '@fe/useful/utils'

const MarkdownItPlugin = (md: Markdown) => {
  const renderHtml = ({ url, content }: any) => {
    const iframe = document.createElement('iframe')
    iframe.className = 'drawio'
    iframe.style.border = '0'
    iframe.width = '100%'
    iframe.height = '300px'
    iframe.dataset.url = url || ''
    iframe.dataset.content = content || ''

    return `
      <div class="drawio-wrapper" style="position: relative">
        ${iframe.outerHTML}
      </div>
    `
  }

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

    return renderHtml({ url })
  }

  const fenceTemp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    const code = token.content.trim()
    const firstLine = code.split(/\n/)[0].trim()
    if (token.info !== 'xml' || !firstLine.includes('--drawio--')) {
      return fenceTemp(tokens, idx, options, env, slf)
    }

    return renderHtml({ content: code })
  }
}

type F = { repo?: string; path?: string; url?: string; content: string }

const buildSrcdoc = async ({ repo, path, content, url }: F) => {
  if (url) {
    content = await (await fetch(url)).text()
  } else if (!content && repo && path) {
    content = (await file.read({ repo, path })).content
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

const load = async (el: HTMLIFrameElement, url?: string) => {
  const bus = useBus()
  const content = el.dataset.content || ''

  const srcdoc = await buildSrcdoc({ content, url })

  const resize = () => {
    el.contentDocument!.body.style.height = 'auto'
    el.contentDocument!.documentElement.style.height = 'auto'
    el.height = el.contentDocument!.documentElement.offsetHeight + 'px'
    el.contentDocument!.body.style.height = el.contentDocument!.body.clientHeight + 'px'
    el.contentDocument!.documentElement.style.height = '100%'
    bus.emit('resize')
  }

  el.onload = () => setTimeout(resize, 300)
  el.srcdoc = srcdoc

  const button1 = document.createElement('button')
  button1.style.cssText = 'margin-left: 5px;font-size: 14px;background: #cacaca; border: 0; padding: 0 6px; color: #2c2b2b; cursor: pointer; border-radius: 2px; transition: all .1s ease-in-out; line-height: 24px;'
  button1.innerText = '适应高度'
  button1.onclick = resize
  const button2 = document.createElement('button')
  button2.style.cssText = 'margin-left: 5px;font-size: 14px;background: #cacaca; border: 0; padding: 0 6px; color: #2c2b2b; cursor: pointer; border-radius: 2px; transition: all .1s ease-in-out; line-height: 24px;'
  button2.innerText = '新窗口打开'
  button2.onclick = () => openInNewWindow(srcdoc)

  const action = document.createElement('div')
  action.className = 'no-print'
  action.style.cssText = 'position: absolute; right: 15px; top: 3px; z-index: 1;'
  action.appendChild(button2)
  action.appendChild(button1)
  el.parentElement!.appendChild(action)
}

export default {
  name: 'drawio',
  register: ctx => {
    ctx.markdown.registerPlugin(MarkdownItPlugin)

    ctx.registerHook('ON_VIEW_RENDERED', ({ getViewDom }) => {
      const refView: HTMLElement = getViewDom()
      const nodes = refView.querySelectorAll<HTMLIFrameElement>('.drawio[data-url]')
      nodes.forEach(el => {
        const url = el.dataset.url
        if (url) {
          load(el, url)
        } else {
          load(el)
        }
      })
    })

    ctx.registerHook('ON_TREE_NODE_SELECT', async (item: any) => {
      if (item.path.toLowerCase().endsWith('.drawio')) {
        const srcdoc = await buildSrcdoc(item)
        openInNewWindow(srcdoc)

        return true
      }

      return false
    })
  }
} as Plugin
