import type { Plugin } from '@fe/context'
import type { ThemeName } from '@fe/types'

export default {
  name: 'status-bar-theme',
  register: ctx => {
    ctx.registerHook('THEME_CHANGE', () => {
      ctx.statusBar.refreshMenu()
    })

    ctx.statusBar.tapMenus(menus => {
      const theme = ctx.theme.getThemeName()
      const icon = {
        light: 'sun-solid',
        dark: 'moon-solid',
        system: 'circle-half-stroke-solid',
      }[theme]

      menus['status-bar-theme'] = {
        id: 'status-bar-theme',
        position: 'right',
        tips: ctx.i18n.t('status-bar.theme.tips', ctx.i18n.t(`status-bar.theme.${theme}`)),
        icon,
        onClick: () => {
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
      }
    })
  }
} as Plugin
