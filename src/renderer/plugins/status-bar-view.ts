import type { Plugin } from '@fe/context'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'
import { getKeysLabel } from '@fe/core/command'

export default {
  name: 'status-bar-view',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-view'] = {
        id: 'status-bar-view',
        position: 'left',
        title: ctx.i18n.t('status-bar.view.view'),
        list: []
      }
    })

    let count = 0
    ctx.store.subscribe(() => {
      if (count === 0) {
        ctx.statusBar.tapMenus(menus => {
          menus['status-bar-view'].list?.push(
            {
              id: 'word-wrap',
              type: 'normal',
              checked: ctx.store.state.wordWrap === 'on',
              title: ctx.i18n.t('status-bar.view.word-wrap'),
              subTitle: getKeysLabel('editor.toggle-wrap'),
              onClick: () => ctx.editor.toggleWrap()
            },
            {
              id: 'typewriter-mode',
              type: 'normal',
              checked: ctx.store.state.typewriterMode,
              title: ctx.i18n.t('status-bar.view.typewriter-mode'),
              onClick: () => ctx.editor.toggleTypewriterMode()
            },
            { type: 'separator' },
            {
              id: 'toggle-side',
              type: 'normal',
              title: ctx.i18n.t('status-bar.view.side-bar'),
              checked: ctx.store.state.showSide,
              subTitle: getKeysLabel('layout.toggle-side'),
              onClick: () => ctx.layout.toggleSide()
            },
            {
              id: 'toggle-editor',
              type: 'normal',
              checked: ctx.store.state.showEditor,
              title: ctx.i18n.t('status-bar.view.editor'),
              subTitle: getKeysLabel('layout.toggle-editor'),
              onClick: () => ctx.layout.toggleEditor()
            },
            {
              id: 'toggle-view',
              type: 'normal',
              checked: ctx.store.state.showView,
              title: ctx.i18n.t('status-bar.view.preview'),
              subTitle: getKeysLabel('layout.toggle-view'),
              onClick: () => ctx.layout.toggleView()
            },
            ...(!FLAG_DISABLE_XTERM ? [{
              id: 'toggle-xterm',
              type: 'normal' as any,
              checked: ctx.store.state.showXterm,
              title: ctx.i18n.t('status-bar.view.xterm'),
              subTitle: getKeysLabel('layout.toggle-xterm'),
              onClick: () => ctx.layout.toggleXterm()
            }] : []),
          )
        })
      } else {
        ctx.statusBar.refreshMenu()
      }

      count++
    })
  }
} as Plugin
