import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CryptoJS from 'crypto-js'
import { debounce } from 'lodash-es'
import dayjs from 'dayjs'
import Markdown from 'markdown-it'
import { useBus } from '@fe/support/bus'
import { Plugin } from '@fe/context/plugin'
import { getThemeName } from '@fe/context/theme'

let cssText = ''

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
      const theme = getThemeName()
      srcdoc.value = `
        <html app-theme="${theme}">
          <head>
            <style>
              ${cssText}

              button {
                margin-left: 0;
              }

              input:not([type="checkbox"]):not([type="radio"]), textarea, select {
                margin: 10px 0;
              }
            </style>
          </head>

          ${props.code}
        </html>
      `
    }

    onMounted(setSrcdoc)
    watch(() => props.code, debounce(setSrcdoc, 1000))
    bus.on('theme.change', setSrcdoc)

    onBeforeUnmount(() => {
      bus.off('theme.change', setSrcdoc)
    })

    const onLoad = function (this: HTMLIFrameElement) {
      const resize = () => {
        iframe.value!.height = iframe.value!.contentDocument!.documentElement.scrollHeight + 'px'
        bus.emit('global.resize')
      }
      resize()

      const win = iframe.value!.contentWindow as any

      // 注入变量
      win.resize = resize
      win.appletFrame = this
      win.appletId = props.id
      win.CryptoJS = CryptoJS
      win.dayjs = dayjs
      win.ctx = window.ctx

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
            height: '20px',
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

export function getCssText () {
  return [].slice.call(window.document.styleSheets)
    .map((styleSheet: CSSStyleSheet) => [].slice.call(styleSheet.cssRules))
    .flat()
    .filter((cssRule: any) =>
      (
        cssRule.conditionText && (
          cssRule.conditionText === 'screen' ||
          cssRule.conditionText.includes('prefers-color-scheme')
        )
      ) || (
        cssRule.selectorText && (
          cssRule.selectorText.startsWith('html') ||
          cssRule.selectorText.startsWith(':root') ||
          cssRule.selectorText.startsWith('::')
        )
      )
    )
    .map((cssRule: CSSRule) => cssRule.cssText)
    .join('\n')
}

export default {
  name: 'applet',
  register: ctx => {
    cssText = getCssText()
    ctx.markdown.registerPlugin(MarkdownItPlugin)
  }
} as Plugin
