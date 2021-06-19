import { Plugin } from '@fe/useful/plugin'
import store from '@fe/store'
import { useBus } from '@fe/useful/bus'

export default {
  name: 'status-bar-refresh',
  register: ctx => {
    const bus = useBus()

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
        onClick: () => bus.emit('view-rerender')
      })
    }

    store.watch(() => store.state.autoPreview, updateMenu)

    updateMenu(store.state.autoPreview)
  }
} as Plugin
