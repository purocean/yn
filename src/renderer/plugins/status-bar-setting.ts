import store from '@fe/support/store'
import { Plugin } from '@fe/context/plugin'

export default {
  name: 'status-bar-setting',
  register: ctx => {
    const showSetting = () => store.commit('setShowSetting', true)

    ctx.action.registerAction('status-bar.show-setting', showSetting)

    ctx.statusBar.updateMenu({
      id: 'status-bar-setting',
      position: 'left',
      tips: '设置',
      icon: 'cog',
      onClick: showSetting
    })
  }
} as Plugin
