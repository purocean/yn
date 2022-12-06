import type { Plugin } from '@fe/context'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'

export default {
  name: 'status-bar-terminal',
  register: ctx => {
    if (FLAG_DISABLE_XTERM) {
      return
    }

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-terminal'] = {
        id: 'status-bar-terminal',
        position: 'right',
        tips: ctx.i18n.t('status-bar.terminal') + ` (${ctx.command.getKeysLabel('layout.toggle-xterm')})`,
        icon: 'terminal',
        onClick: () => ctx.action.getActionHandler('layout.toggle-xterm')()
      }
    })
  }
} as Plugin
