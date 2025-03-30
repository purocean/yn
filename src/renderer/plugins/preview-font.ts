import { h, ref } from 'vue'
import type { Plugin } from '@fe/context'
import type { Components } from '@fe/types'

export default {
  name: 'preview-font',
  register: ctx => {
    const defaultFontSize = 16
    const storageFontSizeKey = 'plugin.preview-font.size'
    const previewFontSize = ref(ctx.utils.storage.get(storageFontSizeKey, defaultFontSize))

    function updateMarkdownBodyDom () {
      const fontSize = previewFontSize.value
      ctx.storage.set(storageFontSizeKey, fontSize)

      ctx.view.getRenderIframe().then(iframe => {
        const markdownBody = iframe.contentDocument?.querySelector(`.${ctx.args.DOM_CLASS_NAME.PREVIEW_MARKDOWN_BODY}`) as HTMLElement
        if (markdownBody) {
          markdownBody.style.fontSize = `${fontSize}px`
          const fontFamily = ctx.setting.getSetting('view.default-previewer-font-family')
          if (fontFamily) {
            markdownBody.style.fontFamily = fontFamily
          } else {
            markdownBody.style.removeProperty('font-family')
          }
        }
      })
    }

    function customFontSize (): Components.ControlCenter.Item {
      ctx.lib.vue.watchEffect(updateMarkdownBodyDom)

      return {
        type: 'custom',
        order: 1024,
        hidden: !ctx.store.state.showView || ctx.store.state.previewer !== 'default',
        component: () => h('div', { style: 'width: 100%; display: flex; justify-content: center; align-items: center; height: 40px; padding: 0 10px;' }, [
          h('span', { style: 'margin-right: 8px; cursor: default', onClick: () => { previewFontSize.value = defaultFontSize } }, [
            'A',
            h('span', { style: 'font-size: 12px;' }, 'A')
          ]),
          h('input', {
            style: 'width: 100%;',
            type: 'range',
            min: 12,
            max: 40,
            step: 1,
            value: previewFontSize.value,
            onInput: (e: any) => {
              previewFontSize.value = parseInt(e.target.value)
            }
          }),
          h('output', { style: 'margin-left: 8px; font-size: 14px; font-variant-numeric: tabular-nums;' }, previewFontSize.value),
        ])
      }
    }

    ctx.workbench.ControlCenter.tapSchema(schema => {
      schema.switch.items.push(customFontSize())
    })

    ctx.registerHook('SETTING_CHANGED', ({ changedKeys }) => {
      if (changedKeys.includes('view.default-previewer-font-family')) {
        updateMarkdownBodyDom()
      }
    })
  }
} as Plugin
