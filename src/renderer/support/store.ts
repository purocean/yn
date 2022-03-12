import { orderBy, pick } from 'lodash-es'
import { createStore } from 'vuex'
import * as storage from '@fe/utils/storage'
import type { Components, Doc, Repo } from '@fe/types'

export const initState = {
  tree: null as Components.Tree.Node[] | null,
  wordWrap: storage.get<'off' | 'on'>('wordWrap', 'off'),
  typewriterMode: storage.get<boolean>('typewriterMode', false),
  showSide: storage.get('showSide', true),
  showView: storage.get('showView', true),
  showEditor: storage.get('showEditor', true),
  showXterm: false,
  autoPreview: true,
  syncScroll: true,
  showSetting: false,
  showExport: false,
  showControlCenter: false,
  presentation: false,
  isFullscreen: false,
  currentContent: '',
  inComposition: false,
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
}

export type AppState = typeof initState
export default createStore({
  state: initState,
  mutations: {
    setTree (state, data) {
      state.tree = data
    },
    setWordWrap (state, data: 'off' | 'on') {
      state.wordWrap = data
      storage.set('wordWrap', data)
    },
    setTypewriterMode (state, data: boolean) {
      state.typewriterMode = data
      storage.set('typewriterMode', data)
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
    setShowControlCenter (state, data) {
      state.showControlCenter = data
    },
    setPresentation (state, data) {
      state.presentation = data
    },
    setIsFullscreen (state, data) {
      state.isFullscreen = data
    },
    setSyncScroll (state, data) {
      state.syncScroll = data
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
    setInComposition (state, data) {
      state.inComposition = data
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
        const record: Record<string, number> = {
          ...(state.recentOpenTime || {}),
          [`${data.repo}|${data.path}`]: Date.now()
        }

        state.recentOpenTime = Object.fromEntries(
          orderBy(Object.entries(record), x => x[1], 'desc').slice(0, 100)
        )

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
})
