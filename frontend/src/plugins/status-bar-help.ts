import { Plugin } from '@/useful/plugin'
import { Alt, getActionLabel, isAction } from '@/useful/shortcut'
import store from '@/store'

export default {
  name: 'status-bar-view',
  register: ctx => {
    const actions = {
      'toggle-readme': {
        title: 'README',
        action: () => store.dispatch('showHelp', 'README.md'),
        shortcut: [Alt, 'h'],
      },
      'toggle-features': {
        title: '特色功能说明',
        action: () => store.dispatch('showHelp', 'FEATURES.md'),
        shortcut: null,
      },
    }

    Object.entries(actions).forEach(([key, item]) => {
      item.shortcut && ctx.registerShortcutAction(key, item.shortcut)
    })

    function keydownHandler (e: KeyboardEvent) {
      for (const [key, item] of Object.entries(actions)) {
        if (isAction(e, key)) {
          item.action()
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }
    }

    window.addEventListener('keydown', keydownHandler, true)

    ctx.updateStatusBarMenu({
      id: 'status-bar-help',
      location: 'status-bar',
      position: 'right',
      title: '帮助',
      list: Object.entries(actions).map(([key, item]) => {
        return {
          id: key,
          type: 'normal',
          title: item.title,
          tips: item.shortcut ? getActionLabel(key) : '',
          onClick: item.action
        }
      })
    })
  }
} as Plugin
