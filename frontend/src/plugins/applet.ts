import CryptoJS from 'crypto-js'
import lodash from 'lodash'
import dayjs from 'dayjs'
import Markdown from 'markdown-it'
import { useBus } from '@/useful/bus'
import { Plugin } from '@/useful/plugin'

const RunPlugin = (md: Markdown) => {
  const temp = md.renderer.rules.fence!!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    const code = token.content.trim()
    const firstLine = code.split(/\n/)[0].trim()
    if (token.info !== 'html' || !firstLine.includes('--applet--')) {
      return temp(tokens, idx, options, env, slf)
    }

    const hash = CryptoJS.MD5(code).toString()
    const appletId = `applet-${hash}-${idx}`
    const appletTitle = firstLine.replace('<!--', '').replace('-->', '').replace('--applet--', '').trim()

    const div = document.createElement('div')
    div.id = appletId
    div.className = 'applet'
    div.dataset.code = code
    div.innerHTML = 'loading……'

    return `
      <fieldset>
        <legend>Applet: ${appletTitle}</legend>
        ${div.outerHTML}
      </fieldset>
    `
  }
}

const runScript = (el: HTMLElement) => {
  const appletId = el.id
  const appletCode = el.dataset.code
  if (!appletCode) {
    return
  }

  const iframe = document.createElement('iframe')
  iframe.srcdoc = `
    <style>
      ::selection {
        background: #515455;
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

      @media screen {
        body {
          color: #ccc;
        }
        button {
          background: #4c4c4c;
          border: 0;
          padding: 0 10px;
          color: #ccc;
          cursor: pointer;
          border-radius: 2px;
          transition: all .3s ease-in-out;
          line-height: 28px;
          margin: 5px 0;
        }

        button.primary {
          background: #71706e;
        }

        button:hover {
          background: #807d7d;
        }

        input, select, textarea {
          border: 0;
          font-size: 18px;
          line-height: 1.4em;
          padding: 6px;
          box-sizing: border-box;
          background: #3a3939;
          color: #ddd;
          transition: all .1s ease-in-out;
        }
      }

      input, select, textarea {
        margin: 5px 0;
      }
    </style>

    ${appletCode}
  `

  const bus = useBus()

  iframe.className = 'applet-iframe'
  iframe.frameBorder = '0'
  iframe.width = '100%'
  iframe.onload = function () {
    const resize = () => {
      iframe.height = iframe.contentDocument!!.documentElement.scrollHeight + 'px'
      bus.emit('resize')
    }
    resize()

    const win = iframe.contentWindow as any

    // 注入变量
    win.resize = resize
    win.appletFrame = this
    win.appletId = appletId
    win.CryptoJS = CryptoJS
    win.dayjs = dayjs

    // 调用初始化方法
    win.init && win.init()
  }
  el.innerHTML = ''
  el.appendChild(iframe)
}

export default {
  name: 'applet',
  register: ctx => {
    ctx.registerMarkdownItPlugin(RunPlugin)

    function runAppletScript ({ getViewDom }: any) {
      const refView: HTMLElement = getViewDom()
      const nodes = refView.querySelectorAll<HTMLElement>('.applet[data-code]')
      nodes.forEach(runScript)
    }

    ctx.registerHook('ON_VIEW_RENDER', lodash.debounce(runAppletScript, 1000, { leading: true }))
  }
} as Plugin
