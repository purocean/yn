import { isElectron, nodeRequire } from '@fe/support/env'
import { init } from '@fe/core/plugin'
import { registerHook, triggerHook } from '@fe/core/hook'
import store from '@fe/support/store'
import * as storage from '@fe/utils/storage'
import { basename } from '@fe/utils/path'
import type { Doc, Repo } from '@fe/types'
import { hasCtrlCmd } from '@fe/core/command'
import { showHelp, switchDoc, unmarkDoc } from '@fe/services/document'
import { refreshTree } from '@fe/services/tree'
import { getSelectionInfo, whenEditorReady } from '@fe/services/editor'
import { fetchSettings } from '@fe/services/setting'
import plugins from '@fe/plugins'
import ctx from '@fe/context'

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

  // 在 Electron 环境中开启缩放页面功能
  if (isElectron) {
    const webContents = nodeRequire('electron').remote.getCurrentWebContents()

    const changeZoomFactor = (zoomIn: boolean) => {
      const currentZoomFactor = webContents.getZoomFactor()
      const factor = currentZoomFactor + (zoomIn ? 0.1 : -0.1)

      if (factor > 0.2 && factor < 3) {
        webContents.setZoomFactor(factor)
      }
    }

    window.addEventListener('keydown', e => {
      if (hasCtrlCmd(e)) {
        if (e.key === '0') {
          webContents.setZoomFactor(1)
        } else if (e.key === '=') {
          changeZoomFactor(true)
        } else if (e.key === '-') {
          changeZoomFactor(false)
        }
      }
    })

    window.addEventListener('mousewheel', event => {
      const e = event as WheelEvent

      if (hasCtrlCmd(e)) {
        changeZoomFactor(e.deltaY < 0)
      }
    })
  }
}

const doc = getLastOpenFile()
switchDoc(doc)

registerHook('DOC_CREATED', refreshTree)
registerHook('DOC_DELETED', refreshTree)
registerHook('DOC_MOVED', refreshTree)
registerHook('DOC_CHANGED', refreshTree)
registerHook('DOC_SWITCH_FAILED', refreshTree)
registerHook('DOC_SWITCH_FAILED', (payload?: { doc?: Doc | null, message: string }) => {
  if (payload && payload.doc && payload?.message?.indexOf('NOENT')) {
    unmarkDoc(payload.doc)
  }
})

whenEditorReady().then(({ editor }) => {
  editor.onDidChangeCursorSelection(() => {
    store.commit('setSelectionInfo', getSelectionInfo())
  })

  const { currentFile } = store.state

  if (!currentFile) {
    // 当前没打开文件，直接打开 README
    showHelp('README.md')
  }
})

fetchSettings()
