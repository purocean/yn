import { Plugin } from '@fe/context'
import store from '@fe/support/store'
import { $args } from '@fe/support/args'
import { basename } from '@fe/utils/path'
import { switchDoc } from '@fe/services/document'
import { whenEditorReady } from '@fe/services/editor'
import type { Repo } from '@fe/types'

export default {
  name: 'status-bar-repository-switch',
  register: ctx => {
    function choose (repo: Repo) {
      const { currentRepo } = store.state
      if (repo.name !== currentRepo?.name) {
        store.commit('setCurrentRepo', repo)
      }
    }

    function chooseRepoByName (name?: string) {
      if (name) {
        const repo = ctx.base.getRepo(name)
        if (repo) {
          choose(repo)
        }
      }
    }

    function initRepo () {
      const { currentRepo } = store.state

      const initRepoName = $args().get('init-repo')
      const initFilePath = $args().get('init-file')

      if (initRepoName) {
        chooseRepoByName(initRepoName)
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
        list: ctx.setting.getSetting('repos', []).map(({ name, path }, i, arr) => {
          return {
            id: name,
            type: 'normal',
            title: name,
            tips: path,
            checked: currentRepo && currentRepo.name === name && currentRepo.path === path,
            onClick: () => choose({ name, path }),
            subTitle: i === arr.length - 1
              ? ctx.command.getKeysLabel([ctx.command.Alt, '0'])
              : (
                  i < 9
                    ? ctx.command.getKeysLabel([ctx.command.Alt, (i + 1).toString()])
                    : undefined
                ),
          }
        })
      }
    })

    whenEditorReady().then(initRepo)

    store.watch(() => store.state.currentRepo, ctx.statusBar.refreshMenu)

    ctx.registerHook('SETTING_FETCHED', ({ settings }) => {
      const { currentRepo } = store.state
      const { repos } = settings

      if (!currentRepo || !repos.some(x => x.name === currentRepo.name && x.path === currentRepo.path)) {
        if (repos.length > 0) {
          store.commit('setCurrentRepo', { ...repos[0] })
        } else {
          store.commit('setCurrentRepo', undefined)
        }
      } else {
        ctx.statusBar.refreshMenu()
      }
    })

    window.addEventListener('keydown', e => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code.startsWith('Digit')) {
        const repoIndex = Number(e.code.substring(5)) - 1
        const repos = ctx.setting.getSetting('repos', [])

        const repo = repos[repoIndex === -1 ? repos.length - 1 : repoIndex]
        if (repo) {
          choose({ name: repo.name, path: repo.path })
        }

        e.preventDefault()
        e.stopPropagation()
      }
    }, true)
  }
} as Plugin
