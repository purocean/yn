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
        title: ctx.i18n.t('status-bar.rendering.rendering', ctx.i18n.t(autoPreview ? 'status-bar.rendering.on' : 'status-bar.rendering.off')),
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
        tips: ctx.i18n.t('status-bar.rendering.refresh'),
        icon: 'sync-alt-solid',
        hidden: autoPreview,
        onClick: () => ctx.view.refresh()
      }
    })

    store.watch(() => store.state.autoPreview, ctx.statusBar.refreshMenu)
  }
} as Plugin
