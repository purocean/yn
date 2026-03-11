import type { Plugin } from '@fe/context'

export default {
  name: 'text-autospace',
  register: (ctx) => {
    let textAutospaceStyle: HTMLStyleElement | null = null

    async function updateTextAutospaceStyle (enabled: boolean) {
      const style = enabled
        ? `
          .markdown-view .markdown-body { text-autospace: normal; }
          .markdown-view .markdown-body code,
          .markdown-view .markdown-body pre { text-autospace: no-autospace; }
        `
        : ''

      if (!textAutospaceStyle) {
        textAutospaceStyle = await ctx.view.addStyles(style)
      } else {
        textAutospaceStyle.textContent = style
      }
    }

    ctx.registerHook('STARTUP', () => {
      const enabled = ctx.setting.getSetting('render.text-autospace', false)
      updateTextAutospaceStyle(enabled)
    })

    ctx.registerHook('SETTING_CHANGED', ({ changedKeys }) => {
      if (changedKeys.includes('render.text-autospace')) {
        const enabled = ctx.setting.getSetting('render.text-autospace', false)
        updateTextAutospaceStyle(enabled)
      }
    })
  }
} as Plugin
