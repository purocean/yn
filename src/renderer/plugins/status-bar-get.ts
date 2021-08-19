import { FLAG_DEMO, URL_GITHUB, URL_MAS, URL_WS } from '@fe/support/global-args'
import { Plugin } from '@fe/context/plugin'

export default {
  name: 'status-bar-get',
  register: ctx => {
    if (FLAG_DEMO) {
      ctx.statusBar.tapMenus(menus => {
        menus['status-bar-get'] = {
          id: 'status-bar-get',
          position: 'left',
          title: '获取应用',
          icon: 'download',
          list: [
            { id: 'github', type: 'normal', title: 'GitHub', onClick: () => window.open(URL_GITHUB) },
            { id: 'mas', type: 'normal', title: 'Mac App Store', onClick: () => window.open(URL_MAS) },
            { id: 'ws', type: 'normal', title: 'Microsoft Store', onClick: () => window.open(URL_WS) },
          ]
        }
      })
    }
  }
} as Plugin
