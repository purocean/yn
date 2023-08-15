import { orderBy, pick } from 'lodash-es'
import { createStore } from 'vuex'
import * as storage from '@fe/utils/storage'
import type { Components, Doc, FileSort, Repo } from '@fe/types'

export const initState = {
  tree: null as Components.Tree.Node[] | null,
  treeSort: storage.get<FileSort>('treeSort', { by: 'serial', order: 'asc' }),
  wordWrap: storage.get<'off' | 'on'>('wordWrap', 'on'),
  typewriterMode: storage.get<boolean>('typewriterMode', false),
  showSide: storage.get('showSide', true),
  showView: storage.get('showView', true),
  showEditor: storage.get('showEditor', true),
  editorPreviewExclusive: storage.get('editorPreviewExclusive', false),
  showXterm: false,
  showOutline: false,
  autoPreview: true,
  syncScroll: true,
  showSetting: false,
  showExport: false,
  presentation: false,
  isFullscreen: false,
  currentContent: '',
  inComposition: false,
  currentRepo: storage.get<Repo>('currentRepo'),
  currentFile: undefined as Doc | null | undefined,
  recentOpenTime: storage.get<Record<string, number>>('recentOpenTime', {}),
  tabs: storage.get<Components.FileTabs.Item[]>('tabs', []),
  previewer: 'default',
  editor: 'default',
}

export type AppState = typeof initState
export default createStore({
  state: initState,
  mutations: {
    setTree (state, data) {
      state.tree = data
    },
    setTreeSort (state, data) {
      state.treeSort = data
      storage.set('treeSort', data)
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
    setEditorPreviewExclusive (state, data) {
      state.editorPreviewExclusive = data
      storage.set('editorPreviewExclusive', data)
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
    setPreviewer (state, data: string) {
      state.previewer = data
    },
    setEditor (state, data: string) {
      state.editor = data
    },
    setShowOutline (state, data) {
      state.showOutline = data
    },
    setInComposition (state, data) {
      state.inComposition = data
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
