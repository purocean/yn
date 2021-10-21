import type { Plugin } from '@fe/context/plugin'
import { FLAG_DISABLE_XTERM } from '@fe/support/global-args'

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
        tips: `切换终端 (${ctx.shortcut.getKeysLabel('layout.toggle-xterm')})`,
        icon: 'terminal',
        onClick: () => ctx.action.getActionHandler('layout.toggle-xterm')()
      }
    })
  }
} as Plugin
