import { showHelp } from '@fe/context/document'
import { Plugin } from '@fe/context/plugin'
import { Alt, getKeysLabel } from '@fe/context/shortcut'

export default {
  name: 'status-bar-help',
  register: ctx => {
    const showHelpCommand = ctx.action.registerAction({
      name: 'plugin.status-bar-help.show-readme',
      keys: [Alt, 'h'],
      handler: () => showHelp('README.md')
    })

    const showFeaturesCommand = ctx.action.registerAction({
      name: 'plugin.status-bar-help.show-features',
      handler: () => showHelp('FEATURES.md'),
      keys: null
    })

    const showShortcutsCommand = ctx.action.registerAction({
      name: 'plugin.status-bar-help.show-shortcuts',
      handler: () => showHelp('SHORTCUTS.md'),
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
            tips: getKeysLabel(showHelpCommand.name),
            onClick: () => ctx.action.getActionHandler(showHelpCommand.name)()
          },
          {
            id: 'toggle-shortcuts',
            type: 'normal',
            title: '快捷键说明',
            onClick: () => ctx.action.getActionHandler(showShortcutsCommand.name)()
          },
          {
            id: 'toggle-features',
            type: 'normal',
            title: '特色功能说明',
            onClick: () => ctx.action.getActionHandler(showFeaturesCommand.name)()
          },
        ]
      }
    })
  }
} as Plugin
