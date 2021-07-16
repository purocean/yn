import { getActionHandler } from '@fe/context/action'
import { showHelp } from '@fe/context/document'
import { Plugin } from '@fe/context/plugin'
import { Alt, getKeysLabel } from '@fe/context/shortcut'

export default {
  name: 'status-bar-help',
  register: ctx => {
    const showHelpCommand = ctx.shortcut.registerCommand({
      id: 'plugin.status-bar-help.show-readme',
      keys: [Alt, 'h'],
      handler: () => showHelp('README.md')
    })

    const showFeaturesCommand = ctx.shortcut.registerCommand({
      id: 'plugin.status-bar-help.show-features',
      handler: () => showHelp('README.md'),
      keys: null
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-help'] = {
        id: 'status-bar-help',
        position: 'right',
        title: '帮助',
        list: [
          {
            id: 'toggle-readme',
            type: 'normal',
            title: 'README',
            tips: getKeysLabel(showHelpCommand.id),
            onClick: () => getActionHandler(showHelpCommand.id)()
          },
          {
            id: 'toggle-features',
            type: 'normal',
            title: '特色功能说明',
            onClick: () => getActionHandler(showFeaturesCommand.id)()
          },
        ]
      }
    })
  }
} as Plugin
