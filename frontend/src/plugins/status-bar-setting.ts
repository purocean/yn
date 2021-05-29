import store from '@/store'
import { Plugin } from '@/useful/plugin'

export default {
  name: 'status-bar-setting',
  register: ctx => {
    ctx.statusBar.updateMenu({
      id: 'status-bar-setting',
      position: 'left',
      tips: '设置',
      icon: 'cog',
      onClick: () => store.commit('setShowSetting', !store.state.showSetting)
    })
  }
} as Plugin
