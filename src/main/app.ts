/* eslint-disable @typescript-eslint/no-var-requires */
import { protocol, app, Menu, Tray, powerMonitor, dialog, OpenDialogOptions, shell, BrowserWindow } from 'electron'
import type TBrowserWindow from 'electron'
import * as path from 'path'
import * as os from 'os'
import * as yargs from 'yargs'
import server from './server'
import { APP_NAME } from './constant'
import { getTrayMenus, getMainMenus } from './menus'
import { transformProtocolRequest } from './protocol'
import startup from './startup'
import { registerAction } from './action'
import { registerShortcut } from './shortcut'
import { $t } from './i18n'
import { getProxyAgent } from './proxy-agent'

const electronContextMenu = require('electron-context-menu')
const electronRemote = require('@electron/remote/main')

const isMacos = os.platform() === 'darwin'
const isLinux = os.platform() === 'linux'

let urlMode: 'scheme' | 'dev' | 'prod' = 'scheme'

const trayEnabled = !(yargs.argv['disable-tray'])
const backendPort = Number(yargs.argv.port) || 3044
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
  win.on('ready-to-show', () => {
    win!.show()
  })

  win.on('close', e => {
    if (trayEnabled) {
      hideWindow()
      e.preventDefault()
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

const reload = () => {
  win && win.loadURL(getUrl())
}

const quit = () => {
  if (!win) {
    app.exit(0)
    return
  }

  const contents = win.webContents
  if (contents) {
    contents.executeJavaScript('window.documentSaved', true).then(val => {
      if (!win) {
        return
      }

      if (val === false) {
        dialog.showMessageBox(win, {
          type: 'question',
          title: $t('quit-check-dialog.title'),
          message: $t('quit-check-dialog.desc'),
          buttons: [
            $t('quit-check-dialog.buttons.cancel'),
            $t('quit-check-dialog.buttons.discard')
          ],
        }).then(choice => {
          if (choice.response === 1) {
            win && win.destroy()
            app.quit()
          }
        })
      } else {
        win.destroy()
        app.quit()
      }
    })
  }
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
