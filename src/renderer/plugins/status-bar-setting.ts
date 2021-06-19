import store from '@fe/store'
import { Plugin } from '@fe/useful/plugin'

export default {
  name: 'status-bar-setting',
  register: ctx => {
    const showSetting = () => store.commit('setShowSetting', true)
    ctx.bus.on('show-setting', showSetting)
    ctx.statusBar.updateMenu({
      id: 'status-bar-setting',
      position: 'left',
      tips: '设置',
      icon: 'cog',
      onClick: showSetting
    })
  }
} as Plugin
