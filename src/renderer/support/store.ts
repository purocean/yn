import { orderBy, pick } from 'lodash-es'
import * as storage from '@fe/utils/storage'
import type { Components, Doc, FileSort, IndexStatus, Repo } from '@fe/types'
import { computed, reactive, watch, watchEffect } from 'vue'

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
  currentRepoIndexStatus: null as { repo: string, status: IndexStatus} | null,
  currentFile: undefined as Doc | null | undefined,
  recentOpenTime: storage.get<Record<string, number>>('recentOpenTime', {}),
  tabs: storage.get<Components.FileTabs.Item[]>('tabs', []),
  previewer: 'default',
  editor: 'default',
}

export type AppState = typeof initState

const state = reactive(initState)

export default {
  state,
  watch,
  watchEffect,
  getters: {
    isSaved: computed(() => {
      if (!state.currentFile?.status) {
        return true
      }

      if (state.currentFile.status === 'unsaved') {
        return false
      }

      return state.currentContent === state.currentFile?.content
    })
  }
}

watchEffect(() => {
  storage.set('treeSort', state.treeSort)
})

watchEffect(() => {
  storage.set('wordWrap', state.wordWrap)
})

watchEffect(() => {
  storage.set('typewriterMode', state.typewriterMode)
})

watchEffect(() => {
  storage.set('showView', state.showView)
})

watchEffect(() => {
  storage.set('showEditor', state.showEditor)
})

watchEffect(() => {
  storage.set('editorPreviewExclusive', state.editorPreviewExclusive)
})

watchEffect(() => {
  storage.set('showSide', state.showSide)
})

watchEffect(() => {
  storage.set('tabs', state.tabs)
})

watchEffect(() => {
  state.tree = null
  storage.set('currentRepo', state.currentRepo)
})

watchEffect(() => {
  const data = state.currentFile
  storage.set('currentFile', pick(data, 'repo', 'path', 'type', 'name'))

  if (data && data.type === 'file' && !data.repo.startsWith('__')) { // record recent open time, except for repo starts with '__'
    const record: Record<string, number> = {
      ...(state.recentOpenTime || {}),
      [`${data.repo}|${data.path}`]: Date.now()
    }

    state.recentOpenTime = Object.fromEntries(
      orderBy(Object.entries(record), x => x[1], 'desc').slice(0, 100)
    )

    storage.set('recentOpenTime', state.recentOpenTime)
  }
})

watch(() => state.currentRepo, () => {
  state.currentRepoIndexStatus = null
})
