import { omit } from 'lodash-es'
import { createStore } from 'vuex'
import Storage from '@fe/utils/storage'
import { basename } from '@fe/utils/path'
import * as api from '@fe/support/api'
import { Doc } from './types'

export const getLastOpenFile = (repoName?: string) => {
  const currentFile = Storage.get('currentFile')
  const recentOpenTime = Storage.get('recentOpenTime', {}) as {[key: string]: number}

  repoName ??= Storage.get('currentRepo')?.name

  if (!repoName) {
    return null
  }

  if (currentFile && currentFile.repo === repoName) {
    return currentFile
  }

  const item = Object.entries(recentOpenTime)
    .filter(x => x[0].startsWith(repoName + '|'))
    .sort((a, b) => b[1] - a[1])[0]

  if (!item) {
    return null
  }

  const path = item[0].split('|', 2)[1]
  if (!path) {
    return null
  }

  return { repo: repoName, name: basename(path), path }
}

export default createStore({
  state: {
    repositories: {} as any,
    tree: null,
    showSide: Storage.get('showSide', true),
    showView: Storage.get('showView', true),
    showXterm: false,
    autoPreview: true,
    showSetting: false,
    currentContent: '',
    currentRepo: Storage.get('currentRepo'),
    currentFile: null as Doc | null,
    recentOpenTime: Storage.get('recentOpenTime', {}),
    tabs: Storage.get('tabs', []),
    selectionInfo: {
      textLength: 0,
      selectedLength: 0,
      lineCount: 0,
      line: 0,
      column: 0
    },
    markedFiles: [],
  },
  mutations: {
    setMarkedFiles (state, files) {
      state.markedFiles = files
    },
    setRepositories (state, data) {
      state.repositories = data
    },
    setTree (state, data) {
      state.tree = data
    },
    setShowView (state, data) {
      state.showView = data
      Storage.set('showView', data)
    },
    setShowSide (state, data) {
      state.showSide = data
      Storage.set('showSide', data)
    },
    setShowSetting (state, data) {
      state.showSetting = data
    },
    setAutoPreview (state, data) {
      state.autoPreview = data
    },
    setTabs (state, data) {
      state.tabs = data
      Storage.set('tabs', data)
    },
    setShowXterm (state, data) {
      state.showXterm = data
    },
    setSelectionInfo (state, data) {
      state.selectionInfo = data
    },
    setCurrentContent (state, data) {
      state.currentContent = data
    },
    setCurrentRepo (state, data) {
      state.currentRepo = data
      state.tree = null
      Storage.set('currentRepo', data)
    },
    setCurrentFile (state, data: Doc | null) {
      state.currentFile = data

      Storage.set('currentFile', omit(data, 'content'))

      if (data) {
        state.recentOpenTime = { ...(state.recentOpenTime || {}), [`${data.repo}|${data.path}`]: new Date().valueOf() }
        Storage.set('recentOpenTime', state.recentOpenTime)
      }
    },
  },
  getters: {
    isSaved (state) {
      if (!state.currentFile?.status) {
        return true
      }

      return state.currentContent === state.currentFile?.content
    }
  },
  actions: {
    async fetchMarkedFiles ({ commit }) {
      const files = (await api.fetchMarkedFiles()).map((x: any) => ({ ...x, name: basename(x.path) }))
      commit('setMarkedFiles', files)
    },
    async fetchRepositories ({ commit }) {
      const repos = await api.fetchRepositories()
      commit('setRepositories', repos)
    },
    async fetchTree ({ commit, state }) {
      const repo = state.currentRepo
      if (!repo) {
        console.warn('未选择仓库')
        return
      }

      const tree = await api.fetchTree(repo.name)
      commit('setTree', tree)
    },
  }
})
