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
      const { repositories } = store.state
      if (name && repositories[name]) {
        choose({ name, path: repositories[name] })
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
        switchDoc({ type: 'file', repo: currentRepo!.name, name: basename(initFilePath), path: initFilePath })
      }
    }

    ctx.statusBar.tapMenus(menus => {
      const { currentRepo, repositories } = store.state

      menus['status-bar-repository-switch'] = {
        id: 'status-bar-repository-switch',
        position: 'left',
        title: currentRepo ? `仓库: ${currentRepo.name}` : '未选择仓库',
        list: Object.keys(repositories).map(name => {
          const path = repositories[name]

          return {
            id: name,
            type: 'normal',
            title: name,
            tips: path,
            onClick: () => choose({ name, path })
          }
        })
      }
    })

    whenEditorReady().then(initRepo)
    store.dispatch('fetchRepositories')

    store.watch(() => store.state.repositories, ctx.statusBar.refreshMenu)
    store.watch(() => store.state.currentRepo, ctx.statusBar.refreshMenu)

    store.watch(() => store.state.repositories, val => {
      const { currentRepo } = store.state
      const keys = Object.keys(val)
      if (!currentRepo || keys.indexOf(currentRepo.name) < 0) {
        if (keys.length > 0) {
          const name = keys[0]
          store.commit('setCurrentRepo', { name, path: val[name] })
        } else {
          store.commit('setCurrentRepo', undefined)
        }
      }
    })
  }
} as Plugin
