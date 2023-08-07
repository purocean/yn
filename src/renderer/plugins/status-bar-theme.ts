import type { Plugin } from '@fe/context'
import type { ThemeName } from '@fe/types'

export default {
  name: 'status-bar-theme',
  register: ctx => {
    ctx.registerHook('THEME_CHANGE', () => {
      ctx.statusBar.refreshMenu()
    })

    const id = 'status-bar-theme'
    const actionName = 'plugin.status-bar-theme.switch'

    function handler () {
      const theme = ctx.theme.getThemeName()
      const nextTheme = {
        light: 'dark',
        dark: 'system',
        system: 'light',
      }[theme] as ThemeName

      if (ctx.getPremium()) {
        ctx.theme.setTheme(nextTheme as any)
        ctx.ui.useToast().show('info', ctx.i18n.t('status-bar.theme.tips', ctx.i18n.t(`status-bar.theme.${nextTheme}`)))
      } else {
        ctx.ui.useToast().show('warning', ctx.i18n.t('premium.need-purchase', 'Theme'))
        ctx.showPremium()
      }
    }

    ctx.statusBar.tapMenus(menus => {
      const theme = ctx.theme.getThemeName()
      const icon = {
        light: 'sun-solid',
        dark: 'moon-solid',
        system: 'circle-half-stroke-solid',
      }[theme]

      menus[id] = {
        id: id,
        position: 'right',
        tips: ctx.i18n.t('status-bar.theme.tips', ctx.i18n.t(`status-bar.theme.${theme}`)) + ' ' + ctx.keybinding.getKeysLabel(actionName),
        icon,
        onClick: handler
      }
    })

    ctx.action.registerAction({
      name: actionName,
      handler,
      description: ctx.i18n.t('command-desc.plugin_status-bar-theme_switch'),
      forUser: true,
    })
  }
} as Plugin
