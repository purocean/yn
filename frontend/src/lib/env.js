const nodeProcess = window && (window.process || window.nodeProcess)
const nodeModule = window && (window.module || window.nodeModule)
const nodeRequire = window && (window.require || window.nodeRequire)

const isElectron = !!(nodeProcess && nodeProcess.versions && nodeProcess.versions['electron'])

const openAlwaysOnTopWindow = (url, target = '_blank') => {
  if (isElectron) {
    const opener = window.open(url, target, 'frame=true,alwaysOnTop=true')

    // 让弹出的窗口置顶
    opener.eval(`require('electron').remote.getCurrentWindow().setAlwaysOnTop(true)`)

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
  openAlwaysOnTopWindow,
}
