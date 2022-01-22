import { Plugin } from '@fe/context'

export default {
  name: 'status-bar-tool',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool'] = {
        id: 'status-bar-tool',
        position: 'left',
        title: ctx.i18n.t('status-bar.tool.tool'),
        list: [
          {
            id: 'show-doc-history',
            type: 'normal',
            title: ctx.i18n.t('status-bar.tool.doc-history'),
            hidden: !ctx.store.state.currentFile,
            onClick: () => ctx.doc.showHistory(ctx.store.state.currentFile!)
          },
          { type: 'separator' },
        ]
      }
    })
  }
} as Plugin
