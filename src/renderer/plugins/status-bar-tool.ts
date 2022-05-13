import type { Plugin } from '@fe/context'

export default {
  name: 'status-bar-tool',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool'] = {
        id: 'status-bar-tool',
        position: 'left',
        title: ctx.i18n.t('status-bar.tool.tool'),
        list: [
          {
            id: 'extension-manager',
            type: 'normal',
            title: ctx.i18n.t('status-bar.tool.extension-manager'),
            onClick: () => ctx.showExtensionManager(),
          }
        ]
      }
    })
  }
} as Plugin
