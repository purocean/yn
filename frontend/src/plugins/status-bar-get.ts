import { FLAG_DEMO, URL_GITHUB, URL_MAS } from '@/useful/global-args'
import { Plugin } from '@/useful/plugin'

export default {
  name: 'status-bar-github',
  register: ctx => {
    if (FLAG_DEMO) {
      ctx.statusBar.updateMenu({
        id: 'status-bar-get',
        position: 'left',
        title: '获取应用',
        icon: 'download',
        list: [
          { id: 'github', type: 'normal', title: 'GitHub', onClick: () => window.open(URL_GITHUB) },
          { id: 'mas', type: 'normal', title: 'Mac App Store', onClick: () => window.open(URL_MAS) },
        ]
      })
    }
  }
} as Plugin
