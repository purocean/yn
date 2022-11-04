/* eslint-disable @typescript-eslint/no-var-requires */
import { protocol, app, Menu, Tray, powerMonitor, dialog, OpenDialogOptions, screen, shell, BrowserWindow, Display, Rectangle } from 'electron'
import type TBrowserWindow from 'electron'
import * as path from 'path'
import * as os from 'os'
import * as yargs from 'yargs'
import server from './server'
import store from './storage'
import { APP_NAME } from './constant'
import { getTrayMenus, getMainMenus } from './menus'
import { transformProtocolRequest } from './protocol'
import startup from './startup'
import { registerAction } from './action'
import { registerShortcut } from './shortcut'
import { $t } from './i18n'
import { getProxyAgent } from './proxy-agent'
import config from './config'
import { initProxy } from './proxy'
import { initEnvs } from './envs'

type WindowState = { maximized: boolean } & Rectangle

initProxy()
initEnvs()

const electronContextMenu = require('electron-context-menu')
const electronRemote = require('@electron/remote/main')

const isMacos = os.platform() === 'darwin'
const isLinux = os.platform() === 'linux'

let urlMode: 'scheme' | 'dev' | 'prod' = 'scheme'
let skipBeforeUnloadCheck = false

const trayEnabled = !(yargs.argv['disable-tray'])
const backendPort = Number(yargs.argv.port) || config.get('server.port', 3044)
const devFrontendPort = 8066

electronRemote.initialize()
electronContextMenu({
  showLookUpSelection: true,
  showSearchWithGoogle: false,
  showCopyImage: true,
  showCopyImageAddress: false,
  showSaveImage: false,
  showSaveImageAs: true,
  showSaveLinkAs: false,
  showInspectElement: false,
  showServices: true,
})
Menu.setApplicationMenu(getMainMenus())

let fullscreen = false
let win: TBrowserWindow.BrowserWindow | null = null
let tray: Tray | null = null

const getUrl = (mode?: typeof urlMode) => {
  mode = mode ?? urlMode

  const args = Object.entries(yargs.argv).filter(x => [
    'readonly',
    'show-status-bar',
    'init-repo',
    'init-file',
  ].includes(x[0]))

  const searchParams = new URLSearchParams(args as any)

  if (mode === 'scheme') {
    searchParams.set('port', backendPort.toString())
  }

  const query = searchParams.toString()

  const proto = mode === 'scheme' ? APP_NAME : 'http'
  const port = proto === 'http' ? (mode === 'dev' ? devFrontendPort : backendPort) : ''

  return `${proto}://localhost:${port}` + (query ? `?${query}` : '')
}

const hideWindow = () => {
  if (win) {
    win.hide()
    win.setSkipTaskbar(true)
    isMacos && app.dock.hide()
  }
}

const restoreWindowBounds = () => {
  const state: WindowState = store.get('window.state', null)
  if (state) {
    if (state.maximized) {
      win!.maximize()
    } else {
      const validateWindowState = (state: WindowState, displays: Display[]): WindowState | undefined => {
        if (state.width <= 0 || state.height <= 0) {
          return undefined
        }

        const getWorkingArea = (display: Display): Rectangle | undefined => {
          if (display.workArea.width > 0 && display.workArea.height > 0) {
            return display.workArea
          }

          if (display.bounds.width > 0 && display.bounds.height > 0) {
            return display.bounds
          }

          return undefined
        }

        if (displays.length === 1) {
          const displayWorkingArea = getWorkingArea(displays[0])
          if (displayWorkingArea) {
            const ensureStateInDisplayWorkingArea = (): void => {
              if (!state || typeof state.x !== 'number' || typeof state.y !== 'number' || !displayWorkingArea) {
                return
              }

              if (state.x < displayWorkingArea.x) {
                // prevent window from falling out of the screen to the left
                state.x = displayWorkingArea.x
              }

              if (state.y < displayWorkingArea.y) {
                // prevent window from falling out of the screen to the top
                state.y = displayWorkingArea.y
              }
            }

            // ensure state is not outside display working area (top, left)
            ensureStateInDisplayWorkingArea()

            if (state.width > displayWorkingArea.width) {
              // prevent window from exceeding display bounds width
              state.width = displayWorkingArea.width
            }

            if (state.height > displayWorkingArea.height) {
              // prevent window from exceeding display bounds height
              state.height = displayWorkingArea.height
            }

            if (state.x > (displayWorkingArea.x + displayWorkingArea.width - 128)) {
              // prevent window from falling out of the screen to the right with
              // 128px margin by positioning the window to the far right edge of
              // the screen
              state.x = displayWorkingArea.x + displayWorkingArea.width - state.width
            }

            if (state.y > (displayWorkingArea.y + displayWorkingArea.height - 128)) {
              // prevent window from falling out of the screen to the bottom with
              // 128px margin by positioning the window to the far bottom edge of
              // the screen
              state.y = displayWorkingArea.y + displayWorkingArea.height - state.height
            }

            // again ensure state is not outside display working area
            // (it may have changed from the previous validation step)
            ensureStateInDisplayWorkingArea()
          }

          return state
        }

        // Multi Monitor (non-fullscreen): ensure window is within display bounds
        let display: Display | undefined
        let displayWorkingArea: Rectangle | undefined
        try {
          display = screen.getDisplayMatching({ x: state.x, y: state.y, width: state.width, height: state.height })
          displayWorkingArea = getWorkingArea(display)
        } catch (error) {
          // Electron has weird conditions under which it throws errors
          // e.g. https://github.com/microsoft/vscode/issues/100334 when
          // large numbers are passed in
        }

        if (
          display && // we have a display matching the desired bounds
          displayWorkingArea && // we have valid working area bounds
          state.x + state.width > displayWorkingArea.x && // prevent window from falling out of the screen to the left
          state.y + state.height > displayWorkingArea.y && // prevent window from falling out of the screen to the top
          state.x < displayWorkingArea.x + displayWorkingArea.width && // prevent window from falling out of the screen to the right
          state.y < displayWorkingArea.y + displayWorkingArea.height // prevent window from falling out of the screen to the bottom
        ) {
          return state
        }

        return undefined
      }

      const displays = screen.getAllDisplays()
      const validatedState = validateWindowState(state, displays)
      if (validatedState) {
        win!.setBounds(validatedState)
      }
    }
  }
}

const saveWindowBounds = () => {
  if (win) {
    const fullscreen = win.isFullScreen()
    const maximized = win.isMaximized()

    // save bounds only when not fullscreen
    if (!fullscreen) {
      const state: WindowState = { ...win.getBounds(), maximized }
      store.set('window.state', state)
    }
  }
}

const createWindow = () => {
  win = new BrowserWindow({
    maximizable: true,
    show: false,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    backgroundColor: '#282a2b',
    titleBarStyle: isMacos ? 'hidden' : undefined,
    fullscreenable: true,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false,
    },
    // for linux icon.
    ...(isLinux ? { icon: path.join(__dirname, './assets/icon.png') } : undefined)
  })

  win.setMenu(null)
  win && win.loadURL(getUrl())
  restoreWindowBounds()
  win.on('ready-to-show', () => {
    win!.show()
    skipBeforeUnloadCheck = false
  })

  win.on('close', e => {
    e.preventDefault()

    saveWindowBounds()

    // keep running in tray
    if (trayEnabled && config.get('keep-running-after-closing-window', !isMacos)) {
      hideWindow()
    } else {
      // quit app
      quit()
    }
  })

  win.on('closed', () => {
    win = null
  })

  win.on('enter-full-screen', () => {
    fullscreen = true
  })

  win.on('leave-full-screen', () => {
    fullscreen = false
  })

  win!.webContents.on('will-navigate', (e) => {
    e.preventDefault()
  })

  win!.webContents.on('will-prevent-unload', (e) => {
    if (skipBeforeUnloadCheck) {
      e.preventDefault()
    }
  })
}

const showWindow = (showInCurrentWindow = true) => {
  if (win) {
    const show = () => {
      if (win) {
        // macos need show in dock
        isMacos && app.dock.show()
        win.setSkipTaskbar(false)
        win.show()
        win.focus()
      }
    }

    if (showInCurrentWindow && !fullscreen) {
      if (isMacos) {
        // show in current workspace
        win.setVisibleOnAllWorkspaces(true)
        show()
        win.setVisibleOnAllWorkspaces(false)
      } else {
        // hide first, then show in current desktop. for windows 10.
        hideWindow()
        setTimeout(show, 100)
      }
    } else {
      show()
    }
  } else {
    createWindow()
  }
}

const ensureDocumentSaved = () => {
  return new Promise((resolve, reject) => {
    if (!win) {
      reject(new Error('window is not ready'))
      return
    }

    const contents = win!.webContents
    contents.executeJavaScript('window.documentSaved', true).then(val => {
      if (!win) {
        reject(new Error('window is not ready'))
        return
      }

      if (val) {
        resolve(undefined)
        return
      }

      dialog.showMessageBox(win!, {
        type: 'question',
        title: $t('quit-check-dialog.title'),
        message: $t('quit-check-dialog.desc'),
        buttons: [
          $t('quit-check-dialog.buttons.cancel'),
          $t('quit-check-dialog.buttons.discard')
        ],
      }).then(choice => {
        if (choice.response === 1) {
          resolve(undefined)
        } else {
          reject(new Error('document not saved'))
        }
      }, reject)
    })
  })
}

const reload = async () => {
  if (win) {
    skipBeforeUnloadCheck = true
    await ensureDocumentSaved()
    win.loadURL(getUrl())
  }
}

const quit = async () => {
  saveWindowBounds()

  if (!win) {
    app.exit(0)
    return
  }

  await ensureDocumentSaved()

  win.destroy()
  app.quit()
}

const showSetting = () => {
  if (!win || !win.webContents) {
    return
  }

  showWindow()
  win.webContents.executeJavaScript('window.ctx.setting.showSettingPanel();', true)
}

const toggleFullscreen = () => {
  win && win.setFullScreen(!fullscreen)
}

const serve = () => {
  try {
    const handler = server(backendPort)
    protocol.registerStreamProtocol('yank-note', async (request, callback) => {
      // transform protocol data to koa request.
      const { req, res, out } = await transformProtocolRequest(request)
      ;(req as any)._protocol = true

      await handler(req, res)
      callback({
        headers: res.getHeaders() as any,
        statusCode: res.statusCode,
        data: out,
      })
    })
  } catch (error) {
    app.exit(-1)
  }
}

const showOpenDialog = (params: OpenDialogOptions) => {
  if (win) {
    const data = dialog.showOpenDialog(win, params)
    return data
  }
}

const showTray = () => {
  tray = new Tray(path.join(__dirname, './assets/tray.png'))
  tray.setToolTip(`${$t('app-name')} - ${$t('slogan')}`)
  if (isMacos) {
    tray.on('click', function (this: Tray) { this.popUpContextMenu() })
  } else {
    tray.on('click', () => showWindow())
  }
  tray.setContextMenu(getTrayMenus())
}

const openInBrowser = () => shell.openExternal(getUrl('prod'))

function refreshMenus () {
  Menu.setApplicationMenu(getMainMenus())
  if (tray) {
    tray.setContextMenu(getTrayMenus())
  }
}

registerAction('show-main-window', showWindow)
registerAction('hide-main-window', hideWindow)
registerAction('toggle-fullscreen', toggleFullscreen)
registerAction('show-main-window-setting', showSetting)
registerAction('reload-main-window', reload)
registerAction('get-main-widow', () => win)
registerAction('get-url-mode', () => urlMode)
registerAction('set-url-mode', (val: typeof urlMode) => { urlMode = val })
registerAction('get-backend-port', () => backendPort)
registerAction('get-dev-frontend-port', () => devFrontendPort)
registerAction('open-in-browser', openInBrowser)
registerAction('quit', quit)
registerAction('show-open-dialog', showOpenDialog)
registerAction('refresh-menus', refreshMenus)
registerAction('get-proxy-agent', getProxyAgent)

powerMonitor.on('shutdown', quit)

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.exit()
} else {
  app.on('second-instance', () => {
    showWindow()
  })

  app.on('open-file', (e) => {
    win && dialog.showMessageBox(win, { message: 'Yank Note dose not support opening files directly.' })
    e.preventDefault()
  })

  app.on('ready', () => {
    startup()
    serve()
    showWindow()

    // getLocale returns empty string before ready. so refresh menus after ready.
    refreshMenus()

    if (trayEnabled) {
      showTray()
    }

    registerShortcut({
      'show-main-window': showWindow,
      'open-in-browser': openInBrowser
    })
  })

  app.on('activate', () => {
    if (!win) {
      showWindow(false)
    }
  })

  app.on('web-contents-created', (_, webContents) => {
    electronRemote.enable(webContents)

    webContents.setWindowOpenHandler(({ url }) => {
      if (url.includes('__allow-open-window__')) {
        return { action: 'allow' }
      }

      const allowList = [
        `${APP_NAME}://`,
        `http://localhost:${backendPort}`,
        `http://localhost:${devFrontendPort}`,
        `http://127.0.0.1:${backendPort}`,
        `http://127.0.0.1:${devFrontendPort}`,
      ]

      if (!allowList.find(x => url.startsWith(x))) {
        shell.openExternal(url)
        return { action: 'deny' }
      }

      return { action: 'allow' }
    })
  })
}
