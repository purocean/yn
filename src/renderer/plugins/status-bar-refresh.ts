import { Plugin } from '@fe/context/plugin'
import store from '@fe/support/store'
import { getAction } from '@fe/context/action'

export default {
  name: 'status-bar-refresh',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      const { autoPreview } = store.state
      menus['status-bar-refresh-status'] = {
        id: 'status-bar-refresh-status',
        position: 'right',
        title: '同步渲染-' + (autoPreview ? '已开启' : '已关闭'),
        onClick: () => store.commit('setAutoPreview', !autoPreview)
      }

      menus['status-bar-refresh-action'] = {
        id: 'status-bar-refresh-action',
        position: 'right',
        tips: '强制渲染',
        icon: 'sync-alt-solid',
        hidden: autoPreview,
        onClick: () => getAction('view.refresh')()
      }
    })

    store.watch(() => store.state.autoPreview, ctx.statusBar.refreshMenu)
  }
} as Plugin
