import { Plugin } from '@fe/context'
import store from '@fe/support/store'
import { $args } from '@fe/support/args'
import { basename } from '@fe/utils/path'
import { switchDoc } from '@fe/services/document'
import { whenEditorReady } from '@fe/services/editor'

export default {
  name: 'status-bar-repository-switch',
  register: ctx => {
    function initRepo () {
      const { currentRepo } = store.state

      const initRepoName = $args().get('init-repo')
      const initFilePath = $args().get('init-file')

      if (initRepoName) {
        try {
          ctx.repo.setCurrentRepo(initRepoName)
        } catch (error) {
          console.error(error)
        }
      }

      if (initFilePath) {
        switchDoc({ type: 'file', repo: initRepoName || currentRepo!.name, name: basename(initFilePath), path: initFilePath })
      }
    }

    ctx.statusBar.tapMenus(menus => {
      const { currentRepo } = store.state

      menus['status-bar-repository-switch'] = {
        id: 'status-bar-repository-switch',
        position: 'left',
        title: currentRepo
          ? ctx.i18n.t('status-bar.repo.repo', currentRepo.name.substring(0, 10))
          : ctx.i18n.t('status-bar.repo.no-data'),
        list: ctx.repo.getAllRepos().map((repo, i, arr) => {
          const { name, path } = repo
          return {
            id: name,
            type: 'normal',
            title: name,
            tips: path,
            checked: currentRepo && currentRepo.name === name && currentRepo.path === path,
            onClick: () => ctx.repo.setCurrentRepo(name),
            subTitle: i === arr.length - 1
              ? ctx.keybinding.getKeysLabel('base.switch-repository-0')
              : (
                  i < 9
                    ? ctx.keybinding.getKeysLabel(`base.switch-repository-${i + 1}`)
                    : undefined
                ),
          }
        })
      }
    })

    whenEditorReady().then(initRepo)

    ctx.lib.vue.watch(() => store.state.currentRepo, ctx.statusBar.refreshMenu)

    ctx.registerHook('SETTING_FETCHED', ({ settings }) => {
      const { currentRepo } = store.state
      const { repos } = settings

      // If the current repo is not in the list, switch to the first one
      if (!currentRepo || !repos.some(x => x.name === currentRepo.name && x.path === currentRepo.path)) {
        ctx.repo.setCurrentRepo(repos?.[0]?.name)
      } else {
        ctx.statusBar.refreshMenu()
      }
    })

    for (let i = 0; i <= 9; i++) {
      ctx.action.registerAction({
        name: `base.switch-repository-${i}`,
        description: i === 0 ? ctx.i18n.t('switch-the-last-repo') : ctx.i18n.t('switch-repo-n', String(i)),
        forUser: true,
        keys: [ctx.keybinding.Alt, String(i)],
        handler: () => {
          const repos = ctx.repo.getAllRepos()
          const idx = i === 0 ? repos.length - 1 : i - 1
          const repo = repos[idx]
          if (repo) {
            ctx.repo.setCurrentRepo(repo.name)
          }
        },
      })
    }
  }
} as Plugin
