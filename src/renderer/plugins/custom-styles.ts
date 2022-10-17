import type { Plugin } from '@fe/context'

export default {
  name: 'custom-styles',
  register: (ctx) => {
    ctx.registerHook('STARTUP', () => {
      const head = document.getElementsByTagName('head')[0]
      const cssLink = document.createElement('link')
      cssLink.id = 'custom-css'
      cssLink.rel = 'stylesheet'
      cssLink.type = 'text/css'
      cssLink.href = ctx.args.FLAG_DEMO ? '/github.css' : '/custom-css'

      head.appendChild(cssLink)
    })

    if (ctx.args.FLAG_DEMO) {
      return
    }

    ctx.registerHook('SETTING_PANEL_BEFORE_SHOW', async () => {
      const customStyles = await ctx.api.fetchCustomStyles().catch(() => [])
      ctx.theme.removeThemeStyle(item => item.from === 'custom')
      customStyles.forEach(css => {
        ctx.theme.registerThemeStyle({ from: 'custom', name: css, css })
      })

      const styles = ctx.theme.getThemeStyles()

      ctx.setting.changeSchema((schema) => {
        schema.properties['custom-css'].enum = styles.map(x => x.css)
        schema.properties['custom-css'].options.enum_titles = styles.map(x => x.name)
      })
    })

    ctx.registerHook('SETTING_CHANGED', async ({ changedKeys }) => {
      if (changedKeys.includes('custom-css')) {
        if (await ctx.ui.useModal().confirm({
          title: ctx.i18n.t('custom-css.change-confirm.title'),
          content: ctx.i18n.t('custom-css.change-confirm.content')
        })) {
          ctx.base.forceReload()
        }
      }
    })
  }
} as Plugin
