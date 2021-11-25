import { pick } from 'lodash-es'
import { createStore } from 'vuex'
import * as storage from '@fe/utils/storage'
import * as api from '@fe/support/api'
import type { Components, Doc, FileItem, Repo } from '@fe/types'

export const initState = {
  repositories: {} as Record<string, string>,
  tree: null,
  showSide: storage.get('showSide', true),
  showView: storage.get('showView', true),
  showEditor: storage.get('showEditor', true),
  showXterm: false,
  autoPreview: true,
  showSetting: false,
  showExport: false,
  presentation: false,
  isFullscreen: false,
  currentContent: '',
  currentRepo: storage.get<Repo>('currentRepo'),
  currentFile: null as Doc | null,
  recentOpenTime: storage.get<Record<string, number>>('recentOpenTime', {}),
  tabs: storage.get<Components.FileTabs.Item[]>('tabs', []),
  selectionInfo: {
    textLength: 0,
    selectedLength: 0,
    lineCount: 0,
    line: 0,
    column: 0
  },
  markedFiles: [] as FileItem[],
}

export type AppState = typeof initState
export default createStore({
  state: initState,
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
      storage.set('showView', data)
    },
    setShowEditor (state, data) {
      state.showEditor = data
      storage.set('showEditor', data)
    },
    setShowSide (state, data) {
      state.showSide = data
      storage.set('showSide', data)
    },
    setShowSetting (state, data) {
      state.showSetting = data
    },
    setShowExport (state, data) {
      state.showExport = data
    },
    setPresentation (state, data) {
      state.presentation = data
    },
    setIsFullscreen (state, data) {
      state.isFullscreen = data
    },
    setAutoPreview (state, data) {
      state.autoPreview = data
    },
    setTabs (state, data) {
      state.tabs = data
      storage.set('tabs', data)
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
      storage.set('currentRepo', data)
    },
    setCurrentFile (state, data: Doc | null) {
      state.currentFile = data

      storage.set('currentFile', pick(data, 'repo', 'path', 'type', 'name'))

      if (data) {
        state.recentOpenTime = { ...(state.recentOpenTime || {}), [`${data.repo}|${data.path}`]: new Date().valueOf() }
        storage.set('recentOpenTime', state.recentOpenTime)
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
      const files = await api.fetchMarkedFiles()
      commit('setMarkedFiles', files)
    },
  }
})
