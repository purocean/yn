import type { Plugin } from '@fe/context'

export default {
  name: 'status-bar-previewer',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      const previewers = ctx.ioc.get('VIEW_PREVIEWER')
      menus['status-bar-previewer'] = {
        id: 'status-bar-previewer',
        position: 'right',
        title: ctx.i18n.t('previewer'),
        hidden: previewers.length < 1 || ctx.store.state.currentFile?.repo === '__help__',
        list: previewers.map(item => ({
          id: item.name,
          type: 'normal' as any,
          title: item.name,
          checked: item.name === ctx.store.state.previewer,
          onClick: () => ctx.view.switchPreviewer(item.name),
        })).concat([{
          id: 'default-previewer',
          type: 'normal' as any,
          title: ctx.i18n.t('default'),
          checked: ctx.store.state.previewer === 'default',
          onClick: () => ctx.view.switchPreviewer('default'),
        }]),
      }
    })

    ctx.registerHook('VIEW_PREVIEWER_CHANGE', () => {
      ctx.statusBar.refreshMenu()
    })
  }
} as Plugin
