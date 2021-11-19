import { showHelp } from '@fe/services/document'
import { Plugin } from '@fe/context'

export default {
  name: 'status-bar-help',
  register: ctx => {
    const showHelpAction = ctx.action.registerAction({
      name: 'plugin.status-bar-help.show-readme',
      keys: null,
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
        title: ctx.i18n.t('status-bar.help.help'),
        list: [
          {
            id: 'toggle-readme',
            type: 'normal',
            title: ctx.i18n.t('status-bar.help.readme'),
            onClick: () => ctx.action.getActionHandler(showHelpAction.name)()
          },
          {
            id: 'toggle-plugin',
            type: 'normal',
            title: ctx.i18n.t('status-bar.help.plugin'),
            onClick: () => ctx.action.getActionHandler(showPluginAction.name)()
          },
          {
            id: 'toggle-shortcuts',
            type: 'normal',
            title: ctx.i18n.t('status-bar.help.shortcuts'),
            onClick: () => ctx.action.getActionHandler(showShortcutsAction.name)()
          },
          {
            id: 'toggle-features',
            type: 'normal',
            title: ctx.i18n.t('status-bar.help.features'),
            onClick: () => ctx.action.getActionHandler(showFeaturesAction.name)()
          },
        ]
      }
    })
  }
} as Plugin
