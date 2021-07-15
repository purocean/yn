import { Plugin } from '@fe/context/plugin'
import { FLAG_DISABLE_XTERM } from '@fe/support/global-args'
import { getActionHandler } from '@fe/context/action'
import { getKeysLabel } from '@fe/context/shortcut'

export default {
  name: 'status-bar-view',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-view'] = {
        id: 'status-bar-view',
        position: 'left',
        title: '视图',
        list: [
          {
            id: 'show-quick-open',
            type: 'normal',
            title: '快速跳转',
            tips: getKeysLabel('filter.show-quick-open'),
            onClick: () => getActionHandler('filter.show-quick-open')()
          },
          {
            id: 'toggle-side',
            type: 'normal',
            title: '切换侧栏',
            tips: getKeysLabel('layout.toggle-side'),
            onClick: () => getActionHandler('layout.toggle-side')()
          },
          {
            id: 'toggle-view',
            type: 'normal',
            title: '切换预览',
            tips: getKeysLabel('layout.toggle-view'),
            onClick: () => getActionHandler('layout.toggle-view')()
          },
          ...(FLAG_DISABLE_XTERM ? [{
            id: 'toggle-xterm',
            type: 'normal' as any,
            title: '切换终端',
            tips: getKeysLabel('layout.toggle-xterm'),
            onClick: () => getActionHandler('layout.toggle-xterm')()
          }] : []),
          {
            id: 'toggle-wrap',
            type: 'normal',
            title: '切换换行',
            tips: getKeysLabel('editor.toggle-wrap'),
            onClick: () => getActionHandler('editor.toggle-wrap')()
          },
        ]
      }
    })
  }
} as Plugin
