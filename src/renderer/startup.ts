import { init } from '@fe/core/plugin'
import { registerHook, triggerHook } from '@fe/core/hook'
import store from '@fe/support/store'
import * as storage from '@fe/utils/storage'
import { basename } from '@fe/utils/path'
import type { BuildInSettings, Doc, Repo } from '@fe/types'
import { isMarked, markDoc, showHelp, switchDoc, unmarkDoc } from '@fe/services/document'
import { refreshTree } from '@fe/services/tree'
import { getSelectionInfo, whenEditorReady } from '@fe/services/editor'
import { getLanguage, setLanguage } from '@fe/services/i18n'
import { fetchSettings } from '@fe/services/setting'
import { getPurchased } from '@fe/others/premium'
import * as extension from '@fe/others/extension'
import { setTheme } from '@fe/services/theme'
import { toggleOutline } from '@fe/services/layout'
import * as view from '@fe/services/view'
import plugins from '@fe/plugins'
import ctx from '@fe/context'
import { MODE } from './support/args'

init(plugins, ctx)

function getLastOpenFile (repoName?: string): Doc | null {
  const currentFile = storage.get<Doc>('currentFile')
  const recentOpenTime = storage.get('recentOpenTime', {}) as {[key: string]: number}

  repoName ??= storage.get<Repo>('currentRepo')?.name

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

  return { type: 'file', repo: repoName, name: basename(path), path }
}

export default function startup () {
  triggerHook('STARTUP')
}

const doc = getLastOpenFile()
switchDoc(doc)

function changeLanguage ({ settings }: { settings: BuildInSettings }) {
  if (settings.language && settings.language !== getLanguage()) {
    setLanguage(settings.language)
  }
}

registerHook('I18N_CHANGE_LANGUAGE', view.refresh)
registerHook('SETTING_FETCHED', changeLanguage)
registerHook('SETTING_BEFORE_WRITE', changeLanguage)
registerHook('DOC_CREATED', refreshTree)
registerHook('DOC_DELETED', refreshTree)
registerHook('DOC_MOVED', refreshTree)
registerHook('DOC_SWITCH_FAILED', refreshTree)
registerHook('DOC_SWITCH_FAILED', (payload?: { doc?: Doc | null, message: string }) => {
  if (payload && payload.doc && payload?.message?.indexOf('NOENT')) {
    unmarkDoc(payload.doc)
  }
})

registerHook('DOC_MOVED', async ({ oldDoc, newDoc }) => {
  if (isMarked(oldDoc)) {
    await unmarkDoc(oldDoc)
    await markDoc(newDoc)
    await refreshTree()
  }
})

registerHook('SETTING_FETCHED', () => {
  if (!getPurchased(true)) {
    whenEditorReady().then(() => {
      setTheme('light')
    })
  }
})

registerHook('EXTENSION_READY', () => {
  view.render()
})

whenEditorReady().then(({ editor }) => {
  editor.onDidChangeCursorSelection(() => {
    store.commit('setSelectionInfo', getSelectionInfo())
  })

  const { currentFile } = store.state

  if (!currentFile && MODE === 'normal') {
    // no recent file, show readme.
    showHelp(
      ctx.i18n.getCurrentLanguage() === 'zh-CN'
        ? 'README_ZH-CN.md'
        : 'README.md'
    )
  }
})

store.watch(() => store.state.currentRepo, (val) => {
  toggleOutline(false)
  document.documentElement.setAttribute('repo-name', val?.name || '')
}, { immediate: true })

store.watch(() => store.state.currentFile, (val) => {
  document.documentElement.setAttribute('current-file-repo', val?.repo || '')
  document.documentElement.setAttribute('current-file-name', val?.name || '')
  document.documentElement.setAttribute('current-file-path', val?.path || '')
}, { immediate: true })

fetchSettings()

whenEditorReady().then(() => {
  setTimeout(extension.init, 0)
})
