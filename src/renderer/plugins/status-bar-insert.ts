import { Plugin } from '@fe/context'

export default {
  name: 'status-bar-insert',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-insert'] = {
        id: 'status-bar-insert',
        position: 'left',
        title: ctx.i18n.t('status-bar.insert.insert'),
        list: []
      }
    })
  }
} as Plugin
