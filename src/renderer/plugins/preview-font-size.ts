import { h, ref } from 'vue'
import type { Plugin } from '@fe/context'
import type { Components } from '@fe/types'

export default {
  name: 'preview-font-size',
  register: ctx => {
    function customFontSize (): Components.ControlCenter.Item {
      const defaultFontSize = 16
      const storageFontSizeKey = 'plugin.preview-font-size'
      const previewFontSize = ref(ctx.utils.storage.get(storageFontSizeKey, defaultFontSize))

      ctx.lib.vue.watchEffect(() => {
        const fontSize = previewFontSize.value
        ctx.storage.set(storageFontSizeKey, fontSize)
        ctx.view.getRenderIframe().then(iframe => {
          const markdownBody = iframe.contentDocument?.querySelector(`.${ctx.args.DOM_CLASS_NAME.PREVIEW_MARKDOWN_BODY}`)
          if (markdownBody) {
            (markdownBody as HTMLElement).style.fontSize = `${fontSize}px`
          }
        })
      })

      return {
        type: 'custom',
        order: 1024,
        component: () => h('div', { style: 'width: 100%; display: flex; justify-content: center; align-items: center; height: 40px; padding: 0 10px;' }, [
          h('span', { style: 'margin-right: 8px; cursor: default', onClick: () => { previewFontSize.value = defaultFontSize } }, 'Aa'),
          h('input', {
            style: 'width: 100%;',
            type: 'range',
            min: 12,
            max: 40,
            step: 1,
            value: previewFontSize.value,
            onInput: (e: any) => {
              previewFontSize.value = e.target.value
            }
          }),
          h('output', { style: 'margin-left: 8px; font-size: 14px; font-family: "Helvetica Neue"' }, previewFontSize.value),
        ])
      }
    }

    ctx.workbench.ControlCenter.tapSchema(schema => {
      schema.switch.items.push(customFontSize())
    })
  }
} as Plugin
