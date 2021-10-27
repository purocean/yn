import { Plugin } from '@fe/context'
import { getActionHandler } from '@fe/core/action'
import { getKeysLabel } from '@fe/core/shortcut'

export default {
  name: 'status-bar-navigation',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-navigation'] = {
        id: 'status-bar-navigation',
        position: 'left',
        title: '导航',
        list: [
          {
            id: 'show-quick-open',
            type: 'normal',
            title: '快速跳转',
            subTitle: getKeysLabel('filter.show-quick-open'),
            onClick: () => getActionHandler('filter.show-quick-open')()
          },
        ]
      }
    })
  }
} as Plugin
