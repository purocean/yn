import { Plugin } from '@fe/context'

export default {
  name: 'status-bar-setting',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-setting'] = {
        id: 'status-bar-setting',
        position: 'left',
        tips: ctx.i18n.t('status-bar.setting'),
        icon: 'cog',
        onClick: () => ctx.setting.showSettingPanel(),
        order: -9999999999,
      }
    })
  }
} as Plugin
