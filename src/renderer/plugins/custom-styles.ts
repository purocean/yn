import type { Plugin } from '@fe/context'

export default {
  name: 'custom-styles',
  register: (ctx) => {
    ctx.registerHook('SETTING_PANEL_BEFORE_SHOW', async () => {
      const customStyles = await ctx.api.fetchCustomStyles()
      ctx.setting.changeSchema((schema) => {
        if (customStyles) {
          schema.properties['custom-css'].enum = customStyles
        }
      })
    })

    ctx.registerHook('SETTING_CHANGED', async ({ changedKeys }) => {
      if (changedKeys.includes('custom-css')) {
        if (await ctx.ui.useModal().confirm({
          title: ctx.i18n.t('custom-css.change-confirm.title'),
          content: ctx.i18n.t('custom-css.change-confirm.content')
        })) {
          window.location.reload()
        }
      }
    })
  }
} as Plugin
