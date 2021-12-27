import type { Plugin } from '@fe/context'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'
import { getKeysLabel } from '@fe/core/command'
import type { MsgPath } from '@share/i18n'

export default {
  name: 'status-bar-view',
  register: ctx => {
    const t = ctx.i18n.t
    const toggleTitle = (flag: boolean, title: MsgPath) => (flag ? t('status-bar.view.hide') : t('status-bar.view.show')) + t(title)

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-view'] = {
        id: 'status-bar-view',
        position: 'left',
        title: t('status-bar.view.view'),
        list: []
      }
    })

    let count = 0
    ctx.store.subscribe(() => {
      if (count === 0) {
        ctx.statusBar.tapMenus(menus => {
          menus['status-bar-view'].list = [
            {
              id: 'toggle-side',
              type: 'normal',
              title: toggleTitle(ctx.store.state.showSide, 'status-bar.view.side-bar'),
              subTitle: getKeysLabel('layout.toggle-side'),
              onClick: () => ctx.layout.toggleSide()
            },
            {
              id: 'toggle-editor',
              type: 'normal',
              title: toggleTitle(ctx.store.state.showEditor, 'status-bar.view.editor'),
              subTitle: getKeysLabel('layout.toggle-editor'),
              onClick: () => ctx.layout.toggleEditor()
            },
            {
              id: 'toggle-view',
              type: 'normal',
              title: toggleTitle(ctx.store.state.showView, 'status-bar.view.preview'),
              subTitle: getKeysLabel('layout.toggle-view'),
              onClick: () => ctx.layout.toggleView()
            },
            ...(!FLAG_DISABLE_XTERM ? [{
              id: 'toggle-xterm',
              type: 'normal' as any,
              title: toggleTitle(ctx.store.state.showXterm, 'status-bar.view.xterm'),
              subTitle: getKeysLabel('layout.toggle-xterm'),
              onClick: () => ctx.layout.toggleXterm()
            }] : []),
            {
              id: 'toggle-wrap',
              type: 'normal',
              title: t('status-bar.view.toggle-wrap'),
              subTitle: getKeysLabel('editor.toggle-wrap'),
              onClick: () => ctx.editor.toggleWrap()
            },
          ]
        })
      } else {
        ctx.statusBar.refreshMenu()
      }

      count++
    })
  }
} as Plugin
