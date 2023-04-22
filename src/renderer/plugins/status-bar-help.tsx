import type { Plugin } from '@fe/context'
import logoImg from '@fe/assets/icon.png'

export default {
  name: 'status-bar-help',
  register: ctx => {
    const getDoc = (name: string) => ctx.i18n.getCurrentLanguage() === 'zh-CN'
      ? `${name}_ZH-CN.md`
      : `${name}.md`

    const showHelpAction = ctx.action.registerAction({
      name: 'plugin.status-bar-help.show-readme',
      keys: null,
      handler: () => ctx.doc.showHelp(getDoc('README'))
    })

    const showFeaturesAction = ctx.action.registerAction({
      name: 'plugin.status-bar-help.show-features',
      handler: () => ctx.doc.showHelp(getDoc('FEATURES')),
      keys: null
    })

    const showShortcutsAction = ctx.action.registerAction({
      name: 'plugin.status-bar-help.show-shortcuts',
      handler: () => ctx.doc.showHelp('SHORTCUTS.md'),
      keys: null
    })

    const showPluginAction = ctx.action.registerAction({
      name: 'plugin.status-bar-help.show-plugin',
      handler: () => ctx.doc.showHelp(getDoc('PLUGIN')),
      keys: null
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-help'] = {
        id: 'status-bar-help',
        position: 'right',
        title: ctx.i18n.t('status-bar.help.help'),
        list: [
          {
            id: 'show-premium',
            type: 'normal',
            title: ctx.i18n.t('premium.premium'),
            hidden: ctx.args.FLAG_DEMO,
            onClick: () => ctx.showPremium()
          },
          { type: 'separator' },
          {
            id: 'show-readme',
            type: 'normal',
            title: ctx.i18n.t('status-bar.help.readme'),
            onClick: () => ctx.action.getActionHandler(showHelpAction.name)()
          },
          {
            id: 'show-plugin',
            type: 'normal',
            title: ctx.i18n.t('status-bar.help.plugin'),
            onClick: () => ctx.action.getActionHandler(showPluginAction.name)()
          },
          {
            id: 'show-shortcuts',
            type: 'normal',
            title: ctx.i18n.t('status-bar.help.shortcuts'),
            onClick: () => ctx.action.getActionHandler(showShortcutsAction.name)()
          },
          {
            id: 'show-features',
            type: 'normal',
            title: ctx.i18n.t('status-bar.help.features'),
            onClick: () => ctx.action.getActionHandler(showFeaturesAction.name)()
          },
          { type: 'separator' },
          {
            id: 'about',
            type: 'normal',
            title: ctx.i18n.t('about') + ' ' + ctx.i18n.t('app-name'),
            onClick: () => {
              ctx.ui.useModal().alert({
                title: ctx.i18n.t('about') + ' ' + ctx.i18n.t('app-name'),
                component: <div style={{ textAlign: 'center' }}>
                  <img src={logoImg} width="100" height="100" />
                  <p>{ctx.i18n.t('slogan')}</p>
                  <p>
                    <a href="https://github.com/purocean/yn/releases" target="_blank">{ctx.version}</a>
                    &nbsp;|&nbsp;
                    <a href="https://yank-note.com/" target="_blank">Homepage</a>
                    &nbsp;|&nbsp;
                    <a href="https://github.com/purocean/yn" target="_blank">Github</a>
                    &nbsp;|&nbsp;
                    <a href="https://blog-purocean.vercel.app/yank-note-01/" target="_blank">Blog</a>
                  </p>
                  <p style={{ fontSize: '14px' }}>
                    <span>CopyRight &copy; 2018 - {new Date().getFullYear()}</span>&nbsp;
                    <a href="https://github.com/purocean" target="_blank">purocean</a>
                  </p>
                </div>
              })
            }
          },
        ]
      }
    })
  }
} as Plugin
