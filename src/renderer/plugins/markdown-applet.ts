import { h } from 'vue'
import Markdown from 'markdown-it'
import { Plugin } from '@fe/context'
import { IFrame } from '@fe/support/embed'
import { md5 } from '@fe/utils'

const MarkdownItPlugin = (md: Markdown) => {
  const temp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    const code = token.content.trim()
    const firstLine = code.split(/\n/)[0].trim()
    if (token.info !== 'html' || !firstLine.includes('--applet--')) {
      return temp(tokens, idx, options, env, slf)
    }

    const hash = md5(code)
    const appletId = `applet-${hash}-${idx}`
    const appletTitle = firstLine.replace('<!--', '').replace('-->', '').replace('--applet--', '').trim()

    const html = `
      <style>
        button { margin-left: 0; }
        input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select { margin: 10px 0; }
      </style>

      ${code}
    `

    const iframe = h(IFrame, {
      html,
      debounce: 1000,
      globalStyle: true,
      onLoad (iframe: HTMLIFrameElement) {
        const win = iframe.contentWindow as any
        win.appletId = appletId
        win.init?.()
        win.resize()
      },
      iframeProps: {
        ...token.meta?.attrs,
        class: 'applet-iframe',
        height: '20px',
      }
    })

    if (!appletTitle) {
      return iframe
    }

    return h('fieldset', {}, [
      h('legend', {}, `Applet: ${appletTitle}`),
      h('div',
        { class: 'applet' },
        iframe,
      )
    ]) as any
  }
}

export default {
  name: 'applet',
  register: ctx => {
    ctx.markdown.registerPlugin(MarkdownItPlugin)
  }
} as Plugin
