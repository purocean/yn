import { Plugin } from '@fe/context'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'
import { getActionHandler } from '@fe/core/action'
import { getKeysLabel } from '@fe/core/command'
import { MsgPath } from '@share/i18n'

export default {
  name: 'status-bar-view',
  register: ctx => {
    const updateMenu = () => {
      const t = ctx.i18n.t
      const toggleTitle = (flag: boolean, title: MsgPath) => (flag ? t('status-bar.view.hide') : t('status-bar.view.show')) + t(title)

      ctx.statusBar.tapMenus(menus => {
        menus['status-bar-view'] = {
          id: 'status-bar-view',
          position: 'left',
          title: t('status-bar.view.view'),
          list: [
            {
              id: 'toggle-side',
              type: 'normal',
              title: toggleTitle(ctx.store.state.showSide, 'status-bar.view.side-bar'),
              subTitle: getKeysLabel('layout.toggle-side'),
              onClick: () => getActionHandler('layout.toggle-side')()
            },
            {
              id: 'toggle-editor',
              type: 'normal',
              title: toggleTitle(ctx.store.state.showEditor, 'status-bar.view.editor'),
              subTitle: getKeysLabel('layout.toggle-editor'),
              onClick: () => getActionHandler('layout.toggle-editor')()
            },
            {
              id: 'toggle-view',
              type: 'normal',
              title: toggleTitle(ctx.store.state.showView, 'status-bar.view.preview'),
              subTitle: getKeysLabel('layout.toggle-view'),
              onClick: () => getActionHandler('layout.toggle-view')()
            },
            ...(!FLAG_DISABLE_XTERM ? [{
              id: 'toggle-xterm',
              type: 'normal' as any,
              title: toggleTitle(ctx.store.state.showXterm, 'status-bar.view.xterm'),
              subTitle: getKeysLabel('layout.toggle-xterm'),
              onClick: () => getActionHandler('layout.toggle-xterm')()
            }] : []),
            {
              id: 'toggle-wrap',
              type: 'normal',
              title: t('status-bar.view.toggle-wrap'),
              subTitle: getKeysLabel('editor.toggle-wrap'),
              onClick: () => getActionHandler('editor.toggle-wrap')()
            },
          ]
        }
      })
    }

    ctx.store.watch((state: any) => {
      return Object.keys(state).filter(key => key.startsWith('show')).map((key: any) => state[key]).join()
    }, updateMenu, { immediate: true })
  }
} as Plugin
