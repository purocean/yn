import { showHelp } from '@fe/services/document'
import { Plugin } from '@fe/context'
import { Alt, getKeysLabel } from '@fe/core/command'

export default {
  name: 'status-bar-help',
  register: ctx => {
    const showHelpAction = ctx.action.registerAction({
      name: 'plugin.status-bar-help.show-readme',
      keys: [Alt, 'h'],
      handler: () => showHelp('README.md')
    })

    const showFeaturesAction = ctx.action.registerAction({
      name: 'plugin.status-bar-help.show-features',
      handler: () => showHelp('FEATURES.md'),
      keys: null
    })

    const showShortcutsAction = ctx.action.registerAction({
      name: 'plugin.status-bar-help.show-shortcuts',
      handler: () => showHelp('SHORTCUTS.md'),
      keys: null
    })

    const showPluginAction = ctx.action.registerAction({
      name: 'plugin.status-bar-help.show-plugin',
      handler: () => showHelp('PLUGIN.md'),
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
            tips: getKeysLabel(showHelpAction.name),
            onClick: () => ctx.action.getActionHandler(showHelpAction.name)()
          },
          {
            id: 'toggle-plugin',
            type: 'normal',
            title: '插件开发指南',
            onClick: () => ctx.action.getActionHandler(showPluginAction.name)()
          },
          {
            id: 'toggle-shortcuts',
            type: 'normal',
            title: '快捷键说明',
            onClick: () => ctx.action.getActionHandler(showShortcutsAction.name)()
          },
          {
            id: 'toggle-features',
            type: 'normal',
            title: '特色功能说明',
            onClick: () => ctx.action.getActionHandler(showFeaturesAction.name)()
          },
        ]
      }
    })
  }
} as Plugin
