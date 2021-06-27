import CryptoJS from 'crypto-js'
import { debounce } from 'lodash-es'
import dayjs from 'dayjs'
import Markdown from 'markdown-it'
import { useBus } from '@fe/useful/bus'
import { Plugin } from '@fe/useful/plugin'
import { defineComponent, h, onMounted, ref, watch } from 'vue'

const Applet = defineComponent({
  name: 'applet',
  props: {
    id: String,
    code: String,
    title: String,
  },
  setup (props) {
    const bus = useBus()
    const iframe = ref<HTMLIFrameElement>()
    const srcdoc = ref('')

    const setSrcdoc = () => {
      srcdoc.value = `
        <style>
          ::selection {
            background: rgba(255, 255, 255, 0.3);
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
              transition: all .1s ease-in-out;
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

        ${props.code}
      `
    }

    onMounted(setSrcdoc)
    watch(() => props.code, debounce(setSrcdoc, 1000))

    const onLoad = function (this: HTMLIFrameElement) {
      const resize = () => {
        iframe.value!.height = iframe.value!.contentDocument!.documentElement.scrollHeight + 'px'
        bus.emit('resize')
      }
      resize()

      const win = iframe.value!.contentWindow as any

      // 注入变量
      win.resize = resize
      win.appletFrame = this
      win.appletId = props.id
      win.CryptoJS = CryptoJS
      win.dayjs = dayjs

      // 调用初始化方法
      win.init && win.init()
    }

    return () => {
      return h('fieldset', {}, [
        h('legend', {}, `Applet: ${props.title}`),
        h('div',
          { class: 'applet' },
          h('iframe', {
            ref: iframe,
            srcdoc: srcdoc.value,
            class: 'applet-iframe',
            frameBorder: '0',
            width: '100%',
            onLoad,
          })
        )
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
    if (token.info !== 'html' || !firstLine.includes('--applet--')) {
      return temp(tokens, idx, options, env, slf)
    }

    const hash = CryptoJS.MD5(code).toString()
    const appletId = `applet-${hash}-${idx}`
    const appletTitle = firstLine.replace('<!--', '').replace('-->', '').replace('--applet--', '').trim()

    return h(Applet, {
      id: appletId,
      title: appletTitle,
      code,
    }) as any
  }
}

export default {
  name: 'applet',
  register: ctx => {
    ctx.markdown.registerPlugin(MarkdownItPlugin)
  }
} as Plugin
