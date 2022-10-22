import type { Plugin } from '@fe/context'

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
            id: 'extension-manager',
            type: 'normal',
            title: ctx.i18n.t('status-bar.tool.extension-manager'),
            onClick: () => ctx.showExtensionManager(),
          },
          {
            id: 'print',
            type: 'normal',
            title: ctx.i18n.t('status-bar.tool.print'),
            hidden: !ctx.store.state.currentFile,
            onClick: () => {
              setTimeout(() => {
                ctx.export.printCurrentDocument()
              }, 0)
            },
          },
          {
            id: 'export',
            type: 'normal',
            hidden: !ctx.store.state.currentFile,
            title: ctx.i18n.t('status-bar.tool.export'),
            onClick: () => ctx.export.toggleExportPanel(),
          },
          {
            type: 'separator'
          },
        ]
      }
    })
  }
} as Plugin
