import type { Plugin } from '@fe/context'

export default {
  name: 'status-bar-navigation',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-navigation'] = {
        id: 'status-bar-navigation',
        position: 'left',
        title: ctx.i18n.t('status-bar.nav.nav'),
        list: [
          {
            id: 'show-quick-open',
            type: 'normal',
            title: ctx.i18n.t('status-bar.nav.goto'),
            subTitle: ctx.keybinding.getKeysLabel('workbench.show-quick-open'),
            ellipsis: true,
            onClick: () => ctx.action.getActionHandler('workbench.show-quick-open')()
          },
          {
            id: 'reveal-current-file-in-sidebar',
            hidden: ctx.store.state.currentRepo?.name !== ctx.store.state.currentFile?.repo,
            type: 'normal',
            title: ctx.i18n.t('status-bar.nav.reveal-current-file-in-sidebar'),
            subTitle: ctx.keybinding.getKeysLabel('tree.reveal-current-node'),
            ellipsis: false,
            onClick: () => ctx.action.getActionHandler('tree.reveal-current-node')()
          },
          { type: 'separator' },
        ]
      }
    })
  }
} as Plugin
