import { useBus } from '@fe/support/bus'
import { isElectron, nodeRequire } from '@fe/utils/env'
import { triggerHook } from '@fe/context/plugin'
import store, { getLastOpenFile } from '@fe/support/store'
import { Doc } from '@fe/support/types'
import { hasCtrlCmd } from './shortcut'
import { showHelp, switchDoc, unmarkDoc } from './document'
import { refreshTree } from './tree'
import { getSelectionInfo, whenEditorReady } from './editor'

const bus = useBus()

export default function startup () {
  triggerHook('ON_STARTUP')

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

bus.on('doc.created', refreshTree)
bus.on('doc.deleted', refreshTree)
bus.on('doc.moved', refreshTree)
bus.on('doc.changed', refreshTree)
bus.on('doc.switch-failed', refreshTree)

bus.on('doc.switch-failed', (payload?: { doc?: Doc | null, message: string }) => {
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
