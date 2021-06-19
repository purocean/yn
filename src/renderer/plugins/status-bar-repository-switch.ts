import { Plugin } from '@fe/useful/plugin'
import { Menu as StatusBarMenu } from '@fe/useful/plugin/status-bar'
import store from '@fe/store'
import { useBus } from '@fe/useful/bus'
import { $args } from '@fe/useful/global-args'
import file from '@fe/useful/file'

export default {
  name: 'status-bar-repository-switch',
  register: ctx => {
    const bus = useBus()

    function choose (repo: any) {
      const { currentRepo } = store.state
      if (repo.name !== currentRepo.name) {
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
        store.commit('setCurrentFile', { repo: currentRepo.name, name: file.basename(initFilePath), path: initFilePath })
      }
    }

    const menu = {
      id: 'status-bar-repository-switch',
      position: 'left',
      title: '仓库',
    } as StatusBarMenu

    function updateMenu () {
      const { currentRepo, repositories } = store.state
      ctx.statusBar.updateMenu({
        ...menu,
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
      })
    }

    ctx.statusBar.updateMenu(menu)

    bus.on('switch-repo-by-name', chooseRepoByName)
    bus.on('editor-ready', initRepo)
    store.dispatch('fetchRepositories')

    store.watch(() => store.state.repositories, updateMenu)
    store.watch(() => store.state.currentRepo, updateMenu)

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
