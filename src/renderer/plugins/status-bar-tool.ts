import type { Plugin } from '@fe/context'

export default {
  name: 'status-bar-tool',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      const printExportVisible = (!ctx.store.state.previewer || ctx.store.state.previewer === 'default') &&
        ctx.store.state.currentFile && ctx.doc.isMarkdownFile(ctx.store.state.currentFile)

      menus['status-bar-tool'] = {
        id: 'status-bar-tool',
        position: 'left',
        title: ctx.i18n.t('status-bar.tool.tool'),
        list: [
          {
            id: 'print',
            type: 'normal',
            title: ctx.i18n.t('status-bar.tool.print'),
            hidden: !printExportVisible,
            ellipsis: true,
            onClick: () => {
              setTimeout(() => {
                ctx.export.printCurrentDocument()
              }, 0)
            },
          },
          {
            id: 'export',
            type: 'normal',
            hidden: !printExportVisible,
            ellipsis: true,
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
