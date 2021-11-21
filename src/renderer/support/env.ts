const _window = window as any

export const nodeProcess: NodeJS.Process = window && (window.process || _window.nodeProcess)
export const nodeModule = window && (window.module || _window.nodeModule)
export const nodeRequire = window && (window.require || _window.nodeRequire)

export const isElectron = !!(nodeProcess?.versions?.electron)
export const isMacOS = /macintosh|mac os x/i.test(navigator.userAgent)
export const isWindows = /win64|win32|wow64|wow32/i.test(navigator.userAgent)

/**
 * Open in new window.
 * @param url
 * @param target
 * @param options
 * @returns opener
 */
export const openWindow = (url: string, target = '_blank', options: Record<string, any> = {}) => {
  if (isElectron) {
    const [x, y] = nodeRequire('electron').remote.getCurrentWindow().getPosition()
    const opts = {
      x: x + 33,
      y: y + 33,
      nodeIntegration: true,
      frame: true,
      titleBarStyle: 'default',
      alwaysOnTop: true,
      enableRemoteModule: true,
      nodeIntegrationInSubFrames: true,
      experimentalFeatures: true,
      ...options
    }

    const opener: any = window.open(url, target, Object.entries(opts).map(([k, v]) => `${k}=${v}`).join(','))

    const preload = `
      // enable page zoom in electron.
      xRequire = require || nodeRequire

      const webContents = xRequire('electron').remote.getCurrentWebContents()

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
