import type { Plugin } from '@fe/context/plugin'

export default {
  name: 'status-bar-terminal',
  register: ctx => {
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
