import { protocol, app, BrowserWindow, Menu, Tray, powerMonitor, dialog, OpenDialogOptions } from 'electron'
import * as path from 'path'
import * as os from 'os'

import * as yargs from 'yargs'
import server from './server'
import { APP_NAME } from './constant'
import { mainMenus, inputMenu, selectionMenu, getTrayMenus } from './menus'
import { transformProtocolRequest } from './protocol'
import opn from 'opn'
import startup from './startup'
import { registerAction } from './action'
import { registerShortcut } from './shortcut'

const isMacos = os.platform() === 'darwin'
const isLinux = os.platform() === 'linux'

let urlMode: 'scheme' | 'dev' | 'prod' = 'scheme'

const trayEnabled = !(yargs.argv['disable-tray'])
const backendPort = Number(yargs.argv.port) || 3044
const devFrontendPort = 8066

Menu.setApplicationMenu(mainMenus)

// 主窗口
let win: BrowserWindow | null = null
// 系统托盘
let tray = null

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
    fullscreenable: false,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      enableRemoteModule: true,
    },
    // Linux 上设置窗口图标
    ...(isLinux ? { icon: path.join(__dirname, './assets/icon.png') } : undefined)
  })

  // win.maximize()
  win.show()
  win.setMenu(null)

  // 不明原因，第一次启动窗口不能正确加载js
  setTimeout(() => {
    win && win.loadURL(getUrl())
  }, 0)

  win.on('close', e => {
    if (trayEnabled) {
      hideWindow()
      e.preventDefault()
    }
  })

  win.on('closed', () => {
    win = null
  })
}

const showWindow = () => {
  if (win) {
    const show = () => {
      if (win) {
        // macos 上展示图标
        isMacos && app.dock.show()
        win.setSkipTaskbar(false)
        win.show()
        win.focus()
      }
    }

    if (isMacos) {
      show()
    } else {
      // 先隐藏再显示，以便在 windows 10 当前虚拟窗口展示
      hideWindow()
      setTimeout(show, 100)
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
          buttons: ['取消', '放弃保存并退出'],
          title: '提示',
          message: '有文档未保存，是否要退出？'
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

const serve = () => {
  try {
    const handler = server(backendPort)
    protocol.registerStreamProtocol('yank-note', async (request, callback) => {
      // 自定义 protocol 协议转换为 koa 请求
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
  tray.setToolTip('Yank Note 一款面向程序员的 Markdown 编辑器')
  if (isMacos) {
    tray.on('click', function (this: Tray) { this.popUpContextMenu() })
  } else {
    tray.on('click', () => showWindow())
  }
  tray.setContextMenu(getTrayMenus())
}

const openInBrowser = () => opn(getUrl('prod'))

registerAction('show-main-window', showWindow)
registerAction('hide-main-window', hideWindow)
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

powerMonitor.on('shutdown', quit)

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.exit()
} else {
  app.on('second-instance', () => {
    showWindow()
  })

  app.on('ready', () => {
    startup()
    serve()
    showWindow()

    if (trayEnabled) {
      showTray()
    }

    registerShortcut({
      'show-main-window': showWindow,
      'open-in-browser': openInBrowser
    })
  })

  app.on('activate', () => {
    showWindow()
  })

  app.on('web-contents-created', (_, webContents) => {
    webContents.on('context-menu', (_, props) => {
      const { selectionText, isEditable } = props
      if (isEditable) {
        inputMenu.popup({ window: win || undefined })
      } else if (selectionText && selectionText.trim() !== '') {
        selectionMenu.popup({ window: win || undefined })
      }
    })

    webContents.on('new-window', (e, url) => {
      const allowList = [
        `${APP_NAME}://`,
        `http://localhost:${backendPort}`,
        `http://localhost:${devFrontendPort}`,
        `http://127.0.0.1:${backendPort}`,
        `http://127.0.0.1:${devFrontendPort}`,
      ]

      if (!allowList.find(x => url.startsWith(x))) {
        e.preventDefault()
        opn(url)
      }
    })
  })
}
