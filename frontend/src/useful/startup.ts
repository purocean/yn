import { useStore } from 'vuex'
import { useBus } from './bus'
import env from './env'
import { hasCtrlCmd } from './shortcut'
import { triggerHook } from './plugin'

export default function startup () {
  const bus = useBus()
  const store = useStore()

  triggerHook('ON_STARTUP')

  bus.on('editor-ready', () => {
    const { currentFile } = store.state

    if (!currentFile) {
      // 当前没打开文件，直接打开 README
      store.dispatch('showHelp', 'README.md')
    }
  })

  // 在 Electron 环境中开启缩放页面功能
  if (env.isElectron) {
    const webContents = env.require('electron').remote.getCurrentWebContents()

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
