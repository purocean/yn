import type { Plugin } from '@fe/context'

export default {
  name: 'status-bar-history',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      const action = ctx.action.getAction('doc.show-history')
      if (!action) {
        return
      }

      menus['status-bar-history'] = {
        id: 'status-bar-history',
        position: 'right',
        tips: ctx.i18n.t('status-bar.tool.doc-history') + ` ${ctx.keybinding.getKeysLabel(action.name)}`,
        icon: 'history-solid',
        onClick: () => {
          action.handler()
        }
      }
    })
  }
} as Plugin
