import type { Plugin } from '@fe/context'

export default {
  name: 'status-bar-extension',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.unshift({
        id: 'extension-manager',
        type: 'normal',
        title: ctx.i18n.t('status-bar.extension.extension-manager'),
        subTitle: ctx.keybinding.getKeysLabel('extension.show-manager'),
        onClick: () => ctx.showExtensionManager(),
      })

      menus['status-bar-extension'] = {
        id: 'status-bar-extension',
        position: 'right',
        icon: 'puzzle-piece-solid',
        tips: ctx.i18n.t('status-bar.extension.extension-manager') + ' ' + ctx.keybinding.getKeysLabel('extension.show-manager'),
        onClick: () => ctx.showExtensionManager(),
      }
    })
  }
} as Plugin
