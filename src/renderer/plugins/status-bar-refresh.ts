import { Plugin } from '@fe/context'
import store from '@fe/support/store'

export default {
  name: 'status-bar-refresh',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      const { autoPreview } = store.state
      menus['status-bar-refresh-status'] = {
        id: 'status-bar-refresh-status',
        position: 'right',
        title: '同步渲染-' + (autoPreview ? '已开启' : '已关闭'),
        onClick: () => {
          ctx.view.toggleAutoPreview()
          if (!autoPreview) {
            ctx.view.refresh()
          }
        },
      }

      menus['status-bar-refresh-action'] = {
        id: 'status-bar-refresh-action',
        position: 'right',
        tips: '强制渲染',
        icon: 'sync-alt-solid',
        hidden: autoPreview,
        onClick: () => ctx.view.refresh()
      }
    })

    store.watch(() => store.state.autoPreview, ctx.statusBar.refreshMenu)
  }
} as Plugin
