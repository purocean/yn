const _window = window as any

interface Process extends NodeJS.Process {
  versions?: any;
}

const nodeProcess: Process = window && (window.process || _window.nodeProcess)
const nodeModule = window && (window.module || _window.nodeModule)
const nodeRequire = window && (window.require || _window.nodeRequire)

const isElectron = !!(nodeProcess?.versions?.electron)

const openAlwaysOnTopWindow = (url: string, target = '_blank') => {
  if (isElectron) {
    const opener: any = window.open(url, target, 'frame=true,alwaysOnTop=true')

    // 让弹出的窗口置顶
    opener.eval("require('electron').remote.getCurrentWindow().setAlwaysOnTop(true)")

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
