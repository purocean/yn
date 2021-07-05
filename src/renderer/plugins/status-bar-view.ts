import { Plugin } from '@fe/context/plugin'
import { Alt, getActionLabel, isAction } from '@fe/context/shortcut'
import { FLAG_DISABLE_XTERM } from '@fe/support/global-args'
import { toggleSide, toggleView, toggleXterm } from '@fe/context/layout'
import { toggleWrap } from '@fe/context/editor'

export default {
  name: 'status-bar-view',
  register: ctx => {
    const actions = {
      'toggle-side': {
        title: '切换侧栏',
        action: toggleSide,
        shortcut: [Alt, 'e'],
      },
      'toggle-view': {
        title: '切换预览',
        action: toggleView,
        shortcut: [Alt, 'v'],
      },
      'toggle-xterm': {
        title: '切换终端',
        action: () => toggleXterm(),
        shortcut: [Alt, 't'],
      },
      'toggle-wrap': {
        title: '切换换行',
        action: toggleWrap,
        shortcut: [Alt, 'w'],
      },
    }

    if (FLAG_DISABLE_XTERM) {
      delete (actions as any)['toggle-xterm']
    }

    Object.entries(actions).forEach(([key, item]) => ctx.shortcut.addAction(key, item.shortcut))

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

    ctx.statusBar.updateMenu({
      id: 'status-bar-view',
      position: 'left',
      title: '视图',
      list: Object.entries(actions).map(([key, item]) => {
        return {
          id: key,
          type: 'normal',
          title: item.title,
          tips: getActionLabel(key),
          onClick: item.action
        }
      })
    })
  }
} as Plugin
