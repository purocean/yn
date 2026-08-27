/* eslint-disable @typescript-eslint/no-var-requires */
import { protocol, app, Menu, Tray, powerMonitor, dialog, OpenDialogOptions, screen, shell, BrowserWindow, Display, Rectangle } from 'electron'
import type TBrowserWindow from 'electron'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs-extra'
import * as yargs from 'yargs'
import httpServer, { killPtyProcesses } from './server'
import store from './storage'
import { APP_NAME } from './constant'
import { getTrayMenus, getMainMenus } from './menus'
import { transformProtocolRequest } from './protocol'
import startup from './startup'
import { registerAction } from './action'
import { registerShortcut } from './shortcut'
import { initJSONRPCClient, jsonRPCClient } from './jsonrpc'
import { $t } from './i18n'
import { getProxyDispatcher, newProxyDispatcher } from './proxy-dispatcher'
import config from './config'
import { initProxy } from './proxy'
import { initEnvs } from './envs'
import { buildAppUrl } from './url'
import type { UrlMode } from './url'

app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer')

const isMacos = os.platform() === 'darwin'
const isLinux = os.platform() === 'linux'

// Linux Wayland / input method support.
//
// On Linux Wayland sessions (e.g. 银河麒麟 V10 SP1 aarch64 + UKUI Wayland) two
// problems must be solved:
//
// 1. GPU crash: Electron's Wayland (ozone) backend crashes with SIGSEGV during
//    BrowserWindow creation on this environment (EGL/GBM/DRM errors). The only
//    reliable fix is to force the X11 (XWayland) backend via the
//    `--ozone-platform=x11` command-line flag.
//
// 2. Input method: fcitx4 does NOT support the Wayland text-input protocol. It
//    only works through XIM / GTK / QT im-module on the X11 backend. So on a
//    Wayland session we must run Electron on the X11 (XWayland) backend and use
//    XIM, otherwise fcitx4 cannot attach to any window. fcitx5 supports the
//    Wayland text-input protocol natively, but the GPU crash (problem 1) still
//    forces us onto X11 on this environment.
//
// IMPORTANT: `app.commandLine.appendSwitch('ozone-platform', 'x11')` does NOT
// work — Electron reads `ozone-platform` from process.argv during very early
// initialization, before any JS runs. By the time appendSwitch is called the
// Wayland backend is already chosen. So we must re-exec the process with the
// flag as a real command-line argument. `app.relaunch()` is unreliable on some
// Electron builds, so we use a manual child_process.spawn + app.exit(0).
if (isLinux) {
  const isWaylandSession = !!process.env.WAYLAND_DISPLAY
  const currentOzone = app.commandLine.getSwitchValue('ozone-platform')

  if (isWaylandSession && currentOzone !== 'x11') {
    // We are on a Wayland session but not yet running on the X11 backend.
    // Re-exec ourselves with --ozone-platform=x11 (and --disable-gpu to avoid
    // EGL error spam / crashes on environments without a working GPU driver).
    try {
      const { spawn } = require('child_process') as typeof import('child_process')
      const newArgs: string[] = []
      for (const a of process.argv.slice(1)) {
        if (a.startsWith('--ozone-platform')) continue
        if (a.startsWith('--disable-gpu')) continue
        newArgs.push(a)
      }
      newArgs.push('--ozone-platform=x11')
      newArgs.push('--disable-gpu')

      const child = spawn(process.execPath, newArgs, {
        stdio: 'inherit',
        detached: true,
        env: { ...process.env },
      })
      child.on('error', (err) => {
        console.error('Failed to re-exec with --ozone-platform=x11:', err)
      })
      child.unref()
      // Exit the current (Wayland-backend) process; the spawned child continues
      // on the X11 backend.
      app.exit(0)
    } catch (err) {
      console.error('Linux Wayland re-exec failed:', err)
    }
  } else {
    // Already on the X11 backend (either re-execed, or an X11 session).
    // disable-gpu can be appended via JS (it is read later than ozone-platform).
    if (isWaylandSession && !app.commandLine.hasSwitch('disable-gpu')) {
      app.commandLine.appendSwitch('disable-gpu')
    }

    // Make sure XMODIFIERS is set for XIM (fcitx4 uses XIM on X11 backend).
    if (!process.env.XMODIFIERS) {
      process.env.XMODIFIERS = '@im=fcitx'
    }

    // Ensure input method environment variables are set (harmless defaults).
    if (!process.env.GTK_IM_MODULE) {
      process.env.GTK_IM_MODULE = 'fcitx'
    }
    if (!process.env.QT_IM_MODULE) {
      process.env.QT_IM_MODULE = 'fcitx'
    }
  }
}

type WindowState = { maximized: boolean } & Rectangle

initProxy()
initEnvs()

const electronContextMenu = require('electron-context-menu')
const electronRemote = require('@electron/remote/main')

let urlMode: UrlMode = 'scheme'
let skipBeforeUnloadCheck = false
let macOpenFilePath = ''

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

const getOpenFilePathFromArgv = (argv: string[]) => {
  const filePath = [...argv].reverse().find(x =>
    x !== process.argv[0] &&
    !x.startsWith('-') &&
    !x.endsWith('app.js')
  )

  return filePath ? path.resolve(process.cwd(), filePath) : null
}

const getDeepLinkFromArgv = (argv: string[]) => {
  const lastArgv = argv[argv.length - 1]
  if (lastArgv && lastArgv.startsWith(APP_NAME + '://')) {
    return lastArgv
  }

  return null
}

const getUrl = (mode?: typeof urlMode) => {
  return buildAppUrl({
    mode: mode ?? urlMode,
    backendPort,
    devFrontendPort,
  })
}

const hideWindow = () => {
  if (win) {
    win.hide()
    win.setSkipTaskbar(true)
    isMacos && app.dock?.hide()
  }
}

const restoreWindowBounds = () => {
  const state: WindowState | null = store.get('window.state', null) as any
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
    minWidth: 940,
    minHeight: 500,
    frame: false,
    backgroundColor: '#282a2b',
    titleBarStyle: isMacos ? 'hidden' : undefined,
    fullscreenable: true,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false,
      enableBlinkFeatures: 'InputEventContext',
    },
    // for linux icon.
    ...(isLinux ? { icon: path.join(__dirname, './assets/icon.png') } : undefined)
  })

  win.setMenu(null)
  win && win.loadURL(getUrl())
  restoreWindowBounds()
  win.once('ready-to-show', () => {
    // open file from argv
    const filePath = macOpenFilePath || getOpenFilePathFromArgv(process.argv)
    if (filePath) {
      win?.show()
      tryOpenFile(filePath)
      return
    }

    // reset macOpenFilePath
    macOpenFilePath = ''

    // hide window on startup
    if (config.get('hide-main-window-on-startup', false)) {
      hideWindow()
    } else {
      win?.show()
    }
  })

  win.on('ready-to-show', () => {
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

  initJSONRPCClient(win.webContents)

  win.webContents.on('will-navigate', (e) => {
    e.preventDefault()
  })

  win.webContents.on('will-prevent-unload', (e) => {
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
        isMacos && app.dock?.show()
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
    try {
      await ensureDocumentSaved()
    } catch (error) {
      console.error('reload ensureDocumentSaved error:', error)
    }
    win.loadURL(getUrl())
  }
}

const quit = async () => {
  try {
    saveWindowBounds()
  } catch (error) {
    console.error('saveWindowBounds error:', error)
  }

  if (!win) {
    app.exit(0)
    return
  }

  try {
    await ensureDocumentSaved()
  } catch (error) {
    console.error('ensureDocumentSaved error:', error)
  }

  try {
    await killPtyProcesses()
  } catch (error) {
    console.error('killPtyProcesses error:', error)
  }

  win.destroy()
  app.quit()
}

const showSetting = (key?: string) => {
  if (!win || !win.webContents) {
    return
  }

  showWindow()
  // delay to show setting panel to ensure window is ready.
  setTimeout(() => {
    try {
      jsonRPCClient.call.ctx.setting.showSettingPanel(key)
    } catch (error) {
      console.error('showSetting error:', error)
    }
  }, 200)
}

const toggleFullscreen = () => {
  win && win.setFullScreen(!fullscreen)
}

const serve = () => {
  try {
    const result = httpServer(backendPort)
    if (!result) {
      console.error('httpServer returned no result')
      return
    }

    const { callback: handler, server } = result

    if (server) {
      server.on('error', (e: Error) => {
        console.error(e)

        if (e.message.includes('EADDRINUSE') || e.message.includes('EACCES')) {
          // wait for electron app ready.
          setTimeout(async () => {
            await dialog.showMessageBox({
              type: 'error',
              title: 'Error',
              message: $t('app.error.EADDRINUSE', String(backendPort))
            })

            setTimeout(() => {
              showSetting('server.port')
            }, 500)
          }, 4000)
          return
        }

        console.error('server error:', e)
      })
    }

    if (handler) {
      protocol.registerStreamProtocol('yank-note', async (request, callback) => {
        try {
          // transform protocol data to koa request.
          const { req, res, out } = await transformProtocolRequest(request)
          ;(req as any)._protocol = true

          await handler(req, res)
          // eslint-disable-next-line n/no-callback-literal
          callback({
            headers: res.getHeaders() as any,
            statusCode: res.statusCode,
            data: out,
          })
        } catch (error) {
          console.error('protocol handler error:', error)
          callback({ statusCode: 500 })
        }
      })
    }
  } catch (error) {
    console.error('serve error:', error)
    dialog.showErrorBox('Server Error', String(error))
  }
}

const showOpenDialog = (params: OpenDialogOptions) => {
  if (win) {
    const data = dialog.showOpenDialog(win, params)
    return data
  }
}

const showTray = () => {
  const img = isMacos ? 'trayTemplate.png' : 'tray.png'
  tray = new Tray(path.join(__dirname, `./assets/${img}`))
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

async function tryOpenFile (path: string) {
  console.log('tryOpenFile', path)
  try {
    const stat = await fs.stat(path)

    if (stat.isFile()) {
      jsonRPCClient.call.ctx.doc.switchDocByPath(path)
      showWindow()
    } else {
      win && dialog.showMessageBox(win, { message: 'Yank Note only support open file.' })
    }
  } catch (error) {
    console.error('tryOpenFile error:', error)
    win && dialog.showMessageBox(win, { message: 'Failed to open file: ' + String(error) })
  }
}

async function tryHandleDeepLink (url: string) {
  if (url) {
    try {
      jsonRPCClient.call.ctx.base.triggerDeepLinkOpen(url)
    } catch (error) {
      console.error('tryHandleDeepLink error:', error)
    }
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
registerAction('get-proxy-dispatcher', getProxyDispatcher)
registerAction('new-proxy-dispatcher', newProxyDispatcher)

powerMonitor.on('shutdown', quit)

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(APP_NAME, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(APP_NAME)
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.exit()
} else {
  app.on('second-instance', (e, argv) => {
    console.log('second-instance', argv)
    showWindow()

    const url = getDeepLinkFromArgv(argv)
    if (url) {
      tryHandleDeepLink(url)
      return
    }

    // only check last param of argv.
    const path = getOpenFilePathFromArgv([argv[argv.length - 1]])
    if (path) {
      tryOpenFile(path)
    }
  })

  app.on('open-file', (e, path) => {
    e.preventDefault()

    if (!win || win.webContents.isLoading()) {
      macOpenFilePath = path
    } else {
      tryOpenFile(path)
    }
  })

  app.on('open-url', (e, url) => {
    e.preventDefault()
    tryHandleDeepLink(url)
  })

  app.on('ready', () => {
    try {
      startup()
    } catch (error) {
      console.error('startup error:', error)
    }

    try {
      serve()
    } catch (error) {
      console.error('serve error:', error)
    }

    try {
      showWindow()
    } catch (error) {
      console.error('showWindow error:', error)
    }

    // getLocale returns empty string before ready. so refresh menus after ready.
    refreshMenus()

    if (trayEnabled) {
      try {
        showTray()
      } catch (error) {
        console.error('showTray error:', error)
      }
    }

    registerShortcut({
      'show-main-window': showWindow,
      'hide-main-window': hideWindow,
      'open-in-browser': openInBrowser
    })
  })

  app.on('activate', () => {
    showWindow(false)
  })

  app.on('web-contents-created', (_, webContents) => {
    electronRemote.enable(webContents)

    // fix focus issue after dialog show on Windows.
    webContents.on('frame-created', (_, { frame }) => {
      if (!frame) {
        return
      }

      frame.on('dom-ready', () => {
        frame.executeJavaScript(`if ('ctx' in window && ctx?.env?.isWindows) {
          window._FIX_ELECTRON_DIALOG_FOCUS ??= function () {
            setTimeout(() => {
              ctx.env.getElectronRemote().getCurrentWindow().blur();
              ctx.env.getElectronRemote().getCurrentWindow().focus();
            }, 0);
          };

          if (!window._ORIGIN_ALERT) {
            window._ORIGIN_ALERT = window.alert;
            window.alert = function (...args) {
              window._ORIGIN_ALERT(...args);
              window._FIX_ELECTRON_DIALOG_FOCUS();
            };
          }

          if (!window._ORIGIN_CONFIRM) {
            window._ORIGIN_CONFIRM = window.confirm;
            window.confirm = function (...args) {
              const res = window._ORIGIN_CONFIRM(...args);
              window._FIX_ELECTRON_DIALOG_FOCUS();
              return res;
            };
          }
        }`)
      })
    })

    webContents.setWindowOpenHandler(({ url, features }) => {
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

      const webPreferences: Record<string, boolean | string> = {}

      // electron not auto parse features below. https://www.electronjs.org/docs/latest/api/window-open
      const extraFeatureKeys = [
        'experimentalFeatures',
        'nodeIntegrationInSubFrames',
        'webSecurity',
      ]

      extraFeatureKeys.forEach(key => {
        const match = features.match(new RegExp(`${key}=([^,]+)`))
        if (match) {
          webPreferences[key] = match[1] === 'true' ? true : match[1] === 'false' ? false : match[1]
        }
      })

      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: Object.keys(webPreferences).length > 0 ? webPreferences : undefined,
        }
      }
    })
  })
}
