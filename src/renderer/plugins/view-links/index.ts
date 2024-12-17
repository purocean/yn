import { ROOT_REPO_NAME_PREFIX } from '@share/misc'
import type { Plugin } from '@fe/context'
import ViewLinksComponent from './ViewLinksComponent.vue'

export default {
  name: 'view-links',
  register: (ctx) => {
    const actionName = 'plugin.view-links.view-document-links'

    function showLinks () {
      ctx.ui.useFixedFloat().show({
        right: '20px',
        top: ctx.env.isElectron ? '66px' : '36px',
        component: ViewLinksComponent,
        closeOnBlur: false,
        closeBtn: true,
        onBlur (byClickSelf) {
          if (!byClickSelf && ctx.store.state.currentRepoIndexStatus?.repo !== ctx.store.state.currentFile?.repo) {
            ctx.ui.useFixedFloat().hide()
          }
        },
      })
    }

    function when () {
      const currentRepoName = ctx.store.state.currentRepo?.name
      const currentFileRepoName = ctx.store.state.currentFile?.repo

      const result = !ctx.args.FLAG_DEMO && // not in demo mode
        ctx.args.MODE === 'normal' && // in normal mode
        currentRepoName && // has current repo
        currentFileRepoName && // has current file
        currentFileRepoName !== ctx.args.HELP_REPO_NAME && // current file is not in help repo
        !currentFileRepoName.startsWith(ROOT_REPO_NAME_PREFIX) // current file is not in root repo

      return !!result
    }

    ctx.action.registerAction({
      name: actionName,
      forUser: true,
      description: ctx.i18n.t('command-desc.plugin_view-links_view-document-links'),
      handler: showLinks,
      when,
    })

    ctx.workbench.FileTabs.tapActionBtns(btns => {
      if (when()) {
        btns.push({ type: 'separator' })
        btns.push({
          type: 'normal',
          icon: 'link-solid',
          title: 'Links',
          onClick: () => {
            ctx.action.getActionHandler(actionName)()
          },
        })
        btns.push({ type: 'separator' })
      }
    })
  }
} as Plugin
