import { Plugin } from '@fe/context/plugin'

export default {
  name: 'status-bar-tool',
  register: ctx => {
    ctx.statusBar.updateMenu({
      id: 'status-bar-tool',
      position: 'left',
      title: '工具',
      list: []
    })
  }
} as Plugin
