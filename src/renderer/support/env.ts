import type Remote from '@electron/remote/index'

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
export function openWindow (url: string, target = '_blank', options: Record<string, any> = {}) {
  if (isElectron) {
    const [x, y] = getElectronRemote().getCurrentWindow().getPosition()
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

    return window.open(
      url,
      target,
      Object.entries(opts)
        .map(([k, v]) => typeof v === 'undefined' ? null : `${k}=${v}`)
        .filter(Boolean)
        .join(',')
    )
  } else {
    return window.open(url, target)
  }
}

export function getElectronRemote (): typeof Remote {
  if (!isElectron) {
    throw new Error('not in electron')
  }

  return nodeRequire('@electron/remote')
}
