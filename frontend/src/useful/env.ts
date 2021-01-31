const _window = window as any

interface Process extends NodeJS.Process {
  versions?: any;
}

const nodeProcess: Process = window && (window.process || _window.nodeProcess)
const nodeModule = window && (window.module || _window.nodeModule)
const nodeRequire = window && (window.require || _window.nodeRequire)

const isElectron = !!(nodeProcess?.versions?.electron)
const isMacOS = /macintosh|mac os x/i.test(navigator.userAgent)

const openAlwaysOnTopWindow = (url: string, target = '_blank') => {
  if (isElectron) {
    const opener: any = window.open(url, target, 'nodeIntegration=yes,frame=true,alwaysOnTop=true,enableRemoteModule=true')

    const preload = `
      // 在 Electron 环境中开启鼠标滚轮缩放页面
      const webContents = require('electron').remote.getCurrentWebContents()

      const changeZoomFactor = zoomIn => {
        const currentZoomFactor = webContents.getZoomFactor()
        const factor = currentZoomFactor + (zoomIn ? 0.1 : -0.1)

        if (factor > 0.2 && factor < 3) {
          webContents.setZoomFactor(factor)
        }
      }

      window.addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey) {
          if (e.key === '0') {
            webContents.setZoomFactor(1)
          } else if (e.key === '=') {
            changeZoomFactor(true)
          } else if (e.key === '-') {
            changeZoomFactor(false)
          }
        }
      })

      window.addEventListener('mousewheel', e => {
        if (e.ctrlKey || e.metaKey) {
          changeZoomFactor(e.deltaY < 0)
        }
      })
    `

    opener.eval(preload)

    return opener
  } else {
    return window.open(url, target)
  }
}

export default {
  process: nodeProcess,
  module: nodeModule,
  require: nodeRequire,
  isElectron,
  isMacOS,
  openAlwaysOnTopWindow,
}
