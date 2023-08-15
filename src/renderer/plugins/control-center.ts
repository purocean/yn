import { Plugin } from '@fe/context'
import store from '@fe/support/store'

export default {
  name: 'status-control-center',
  register: ctx => {
    let count = 0
    ctx.store.subscribe(() => {
      if (count === 0) {
        ctx.workbench.ControlCenter.tapSchema(schema => {
          schema.switch.items.push(
            {
              type: 'btn',
              icon: 'side-bar',
              title: ctx.i18n.t('control-center.switch.side-bar', ctx.keybinding.getKeysLabel('layout.toggle-side')),
              checked: ctx.store.state.showSide,
              onClick: () => {
                ctx.layout.toggleSide()
              }
            },
            {
              type: 'btn',
              icon: 'edit-solid',
              title: ctx.i18n.t('control-center.switch.editor', ctx.keybinding.getKeysLabel('layout.toggle-editor')),
              checked: ctx.store.state.showEditor,
              onClick: () => {
                ctx.layout.toggleEditor()
              }
            },
            {
              type: 'btn',
              icon: 'eye-regular',
              title: ctx.i18n.t('control-center.switch.view', ctx.keybinding.getKeysLabel('layout.toggle-view')),
              checked: ctx.store.state.showView,
              onClick: () => {
                ctx.layout.toggleView()
              }
            },
            {
              type: 'btn',
              icon: 'columns-solid',
              title: ctx.i18n.t('control-center.switch.sync-scroll'),
              checked: ctx.store.state.syncScroll,
              onClick: () => {
                ctx.view.toggleSyncScroll()
              }
            },
            {
              type: 'btn',
              icon: 'paint-roller',
              title: ctx.i18n.t('control-center.switch.sync-rendering'),
              checked: ctx.store.state.autoPreview,
              onClick: () => {
                ctx.view.toggleAutoPreview()
                if (ctx.store.state.autoPreview) {
                  ctx.view.refresh()
                }
              }
            },
            {
              type: 'btn',
              icon: 'text-width-solid',
              title: ctx.i18n.t('control-center.switch.word-wrap', ctx.keybinding.getKeysLabel('editor.toggle-wrap')),
              checked: ctx.store.state.wordWrap === 'on',
              onClick: () => {
                ctx.editor.toggleWrap()
              }
            },
            {
              type: 'btn',
              icon: 'keyboard-solid',
              title: ctx.i18n.t('control-center.switch.typewriter-mode'),
              checked: ctx.store.state.typewriterMode,
              onClick: () => {
                ctx.editor.toggleTypewriterMode()
              }
            },
            {
              type: 'btn',
              icon: 'search-solid',
              title: ctx.i18n.t('control-center.switch.find-in-preview', ctx.keybinding.getKeysLabel('view.show-find-in-preview')),
              hidden: !ctx.store.state.showView || ctx.store.state.previewer !== 'default',
              onClick: () => {
                ctx.action.getActionHandler('view.show-find-in-preview')()
              }
            },
          )
        })
      } else {
        ctx.workbench.ControlCenter.refresh()
      }

      count++
    })

    ctx.workbench.ControlCenter.tapSchema(schema => {
      schema.navigation.items.push(
        {
          type: 'btn',
          icon: 'sync-alt-solid',
          flat: true,
          title: ctx.i18n.t('control-center.navigation.refresh', ctx.keybinding.getKeysLabel('view.refresh')),
          onClick: () => {
            ctx.view.refresh()
            ctx.workbench.ControlCenter.toggle(false)
          }
        },
        {
          type: 'btn',
          icon: 'bolt-solid',
          flat: true,
          title: ctx.i18n.t('control-center.navigation.goto', ctx.keybinding.getKeysLabel('workbench.show-quick-open')),
          showInActionBar: true,
          onClick: () => {
            ctx.action.getActionHandler('workbench.show-quick-open')()
            ctx.workbench.ControlCenter.toggle(false)
          }
        },
      )
    })

    store.watch(() => store.state.autoPreview, ctx.statusBar.refreshMenu)
  }
} as Plugin
