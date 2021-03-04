import { Plugin } from '@/useful/plugin'
import { useBus } from '@/useful/bus'
import { Alt, getActionLabel, isAction } from '@/useful/shortcut'

export default {
  name: 'status-bar-view',
  register: ctx => {
    const bus = useBus()

    const actions = {
      'toggle-side': {
        title: '切换侧栏',
        action: () => bus.emit('toggle-side'),
        shortcut: [Alt, 'e'],
      },
      'toggle-view': {
        title: '切换预览',
        action: () => bus.emit('toggle-view'),
        shortcut: [Alt, 'v'],
      },
      'toggle-xterm': {
        title: '切换终端',
        action: () => bus.emit('toggle-xterm'),
        shortcut: [Alt, 't'],
      },
      'toggle-wrap': {
        title: '切换换行',
        action: () => bus.emit('editor-toggle-wrap'),
        shortcut: [Alt, 'w'],
      },
    }

    Object.entries(actions).forEach(([key, item]) => ctx.registerShortcutAction(key, item.shortcut))

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
      id: 'status-bar-view',
      location: 'status-bar',
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
