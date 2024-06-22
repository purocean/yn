import { defineComponent, h, onBeforeUnmount, ref } from 'vue'
import Markdown from 'markdown-it'
import { registerHook, removeHook } from '@fe/core/hook'
import { IFrame } from '@fe/support/embed'
import { md5 } from '@fe/utils'
import type { Plugin } from '@fe/context'
import type { RenderEnv } from '@fe/types'

const Applet = defineComponent({
  name: 'XApplet',
  props: {
    appletId: String,
    html: String,
    attrs: Object as () => Record<string, string>,
  },
  setup (props) {
    const displayFlag = ref(false)

    function hide () {
      displayFlag.value = false
    }

    function show () {
      displayFlag.value = true
    }

    registerHook('DOC_SWITCHED', hide)
    registerHook('VIEW_BEFORE_REFRESH', hide)
    registerHook('VIEW_RENDERED', show)

    onBeforeUnmount(() => {
      removeHook('DOC_SWITCHED', hide)
      removeHook('VIEW_BEFORE_REFRESH', hide)
      removeHook('VIEW_RENDERED', show)
    })

    return () => !displayFlag.value ? null : h(IFrame, {
      html: props.html,
      debounce: 1000,
      globalStyle: true,
      onLoad (iframe: HTMLIFrameElement) {
        const win = iframe.contentWindow as any
        win.appletId = props.appletId
        win.init?.()
        win.resize()
      },
      iframeProps: {
        ...props.attrs,
        class: 'applet-iframe',
        height: '20px',
      }
    })
  }
})

const MarkdownItPlugin = (md: Markdown) => {
  const temp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env: RenderEnv, slf) => {
    const token = tokens[idx]

    const code = token.content.trim()
    const firstLine = code.split(/\n/)[0].trim()
    if (token.info !== 'html' || !firstLine.includes('--applet--') || env.safeMode) {
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

    const iframe = h(Applet, {
      html,
      appletId,
      attrs: token.meta?.attrs,
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

    ctx.editor.tapSimpleCompletionItems(items => {
      /* eslint-disable no-template-curly-in-string */

      items.push(
        { label: '/ ``` Applet', insertText: '```html\n<!-- --applet-- ${1:DEMO} -->\n<button onclick="ctx.ui.useToast().show(`info`, `HELLOWORLD!`)">TEST</button>\n```\n', block: true },
      )
    })
  }
} as Plugin
