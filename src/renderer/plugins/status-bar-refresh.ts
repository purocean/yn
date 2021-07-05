import { Plugin } from '@fe/context/plugin'
import store from '@fe/support/store'
import { getAction } from '@fe/context/action'

export default {
  name: 'status-bar-refresh',
  register: ctx => {
    const updateMenu = (autoPreview: boolean) => {
      ctx.statusBar.updateMenu({
        id: 'status-bar-refresh-status',
        position: 'right',
        title: '同步渲染-' + (autoPreview ? '已开启' : '已关闭'),
        onClick: () => store.commit('setAutoPreview', !autoPreview)
      })

      ctx.statusBar.updateMenu({
        id: 'status-bar-refresh-action',
        position: 'right',
        tips: '强制渲染',
        icon: 'sync-alt-solid',
        hidden: autoPreview,
        onClick: () => getAction('view.refresh')()
      })
    }

    store.watch(() => store.state.autoPreview, updateMenu)

    updateMenu(store.state.autoPreview)
  }
} as Plugin
