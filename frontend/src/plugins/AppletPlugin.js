import Vue from 'vue'
import CryptoJS from 'crypto-js'
import dayjs from 'dayjs'

const RunPlugin = (md) => {
  const temp = md.renderer.rules.fence.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    const code = token.content.trim()
    const firstLine = code.split(/\n/)[0].trim()
    if (!firstLine.includes('--applet--')) {
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

RunPlugin.runScript = (el) => {
  const appletId = el.id
  const appletCode = el.dataset.code
  if (!appletCode) {
    return
  }

  const iframe = document.createElement('iframe')
  iframe.srcdoc = `
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

  const appVm = window.appVm

  iframe.className = 'applet-iframe'
  iframe.frameBorder = '0'
  iframe.width = '100%'
  iframe.onload = function () {
    const resize = () => {
      this.height = this.contentDocument.documentElement.scrollHeight + 'px'
      appVm.$bus.emit('resize')
    }
    resize()

    // 注入变量
    this.contentWindow.resize = resize
    this.contentWindow.appletFrame = this
    this.contentWindow.appletId = appletId
    this.contentWindow.Vue = Vue
    this.contentWindow.CryptoJS = CryptoJS
    this.contentWindow.dayjs = dayjs

    // 调用初始化方法
    this.contentWindow.init && this.contentWindow.init()
  }
  el.innerHTML = ''
  el.appendChild(iframe)
}

export default RunPlugin
