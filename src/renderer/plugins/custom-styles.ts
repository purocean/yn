import type { Plugin } from '@fe/context'

export default {
  name: 'custom-styles',
  register: (ctx) => {
    let renderExtraStyle: HTMLStyleElement | null = null
    async function updateRenderExtraStyle (style: string) {
      if (!renderExtraStyle) {
        renderExtraStyle = await ctx.view.addStyles(style)
      } else {
        renderExtraStyle.textContent = style
      }
    }

    ctx.registerHook('STARTUP', () => {
      const head = document.getElementsByTagName('head')[0]
      const cssLink = document.createElement('link')
      cssLink.id = 'custom-css'
      cssLink.rel = 'stylesheet'
      cssLink.type = 'text/css'
      cssLink.href = ctx.args.FLAG_DEMO ? '/github.css' : '/custom-css'

      head.appendChild(cssLink)

      // for demo
      if (ctx.args.FLAG_DEMO) {
        ctx.view.addStyleLink('/github.css')
      }
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
          ctx.base.reloadMainWindow()
        }
      }

      if (changedKeys.includes('render.extra-css-style')) {
        const extraStyle = ctx.setting.getSetting('render.extra-css-style', '')
        updateRenderExtraStyle(extraStyle)
      }
    })

    ctx.registerHook('SETTING_PANEL_AFTER_SHOW', ({ editor }) => {
      const debouncedUpdate = ctx.lib.lodash.debounce(updateRenderExtraStyle, 300)
      const input: HTMLTextAreaElement = editor.getEditor('root.render.extra-css-style').input
      input.addEventListener('input', (e) => {
        const value = (e.target as HTMLTextAreaElement).value
        debouncedUpdate(value)
      })

      editor.watch('root.render.extra-css-style', () => {
        const value = editor.getEditor('root.render.extra-css-style').getValue()
        updateRenderExtraStyle(value)
      })
    })

    ctx.registerHook('SETTING_PANEL_BEFORE_CLOSE', async () => {
      await ctx.utils.sleep(100)
      const extraStyle = ctx.setting.getSetting('render.extra-css-style', '')
      updateRenderExtraStyle(extraStyle)
    })
  }
} as Plugin
