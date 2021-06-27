import { protocol, app, BrowserWindow, Menu, Tray, powerMonitor, dialog } from 'electron'
import * as path from 'path'
import * as os from 'os'

import * as yargs from 'yargs'
import server from './server'
import { APP_NAME, USER_DIR, FLAG_DISABLE_DEVTOOL, FLAG_DISABLE_SERVER } from './constant'
import * as updater from './updater'
import { getAccelerator, registerShortcut } from './shortcut'
import { mainMenus, inputMenu, selectionMenu } from './menus'
import { transformProtocolRequest } from './protocol'
import { bus } from './bus'
import opn from 'opn'
import startup from './startup'

const isMacos = os.platform() === 'darwin'
const isLinux = os.platform() === 'linux'

let urlMode: 'scheme' | 'dev' | 'prod' = 'scheme'

const showTray = !(yargs.argv['disable-tray'])
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

const openInBrowser = () => opn(getUrl('prod'))

const hide = () => {
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
    if (showTray) {
      hide()
      e.preventDefault()
    }
  })

  win.on('closed', () => {
    win = null
  })

  win.webContents.on('context-menu', (e, props) => {
    const { selectionText, isEditable } = props
    if (isEditable) {
      inputMenu.popup({ window: win || undefined })
    } else if (selectionText && selectionText.trim() !== '') {
      selectionMenu.popup({ window: win || undefined })
    }
  })
}

const showWindow = (forceShow?: boolean) => {
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

    if (win.isVisible() && win.isFocused() && !forceShow) {
      hide()
    } else {
      if (isMacos) {
        show()
      } else {
        // 先隐藏再显示，以便在 windows 10 当前虚拟窗口展示
        hide()
        setTimeout(show, 100)
      }
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

  showWindow(true)
  win.webContents.executeJavaScript('globalBus.emit("show-setting");', true)
}

bus.on('show-setting', showSetting)
bus.on('quit-app', quit)

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.exit()
} else {
  app.on('second-instance', () => {
    showWindow(true)
  })

  app.on('ready', () => {
    startup()

    // 打开后端服务器
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

    showWindow(true)

    bus.on('show-main-window', showWindow)

    bus.on('show-open-dialog', ({ args: [params], callback }: any) => {
      if (win) {
        const data = dialog.showOpenDialog(win, params)
        callback && callback(data)
      }
    })

    // 注册快捷键
    registerShortcut({
      'show-main-window': () => showWindow(),
      'open-in-browser': () => openInBrowser()
    })

    powerMonitor.on('shutdown', quit)

    if (showTray) {
      const contextMenu = Menu.buildFromTemplate([
        {
          type: 'normal',
          label: '打开主界面',
          accelerator: getAccelerator('show-main-window'),
          click: () => {
            showWindow(true)
          }
        },
        {
          type: 'normal',
          label: '浏览器中打开',
          accelerator: getAccelerator('open-in-browser'),
          visible: !FLAG_DISABLE_SERVER,
          click: openInBrowser
        },
        {
          type: 'normal',
          label: '打开主目录',
          click: () => {
            opn(USER_DIR)
          }
        },
        {
          type: 'normal',
          label: '偏好设置',
          click: showSetting
        },
        {
          type: 'checkbox',
          label: '开机启动',
          checked: app.getLoginItemSettings().openAtLogin,
          click: x => {
            app.setLoginItemSettings({ openAtLogin: x.checked })
            x.checked = app.getLoginItemSettings().openAtLogin
          }
        },
        { type: 'separator' },
        {
          type: 'submenu',
          label: '开发',
          visible: !FLAG_DISABLE_DEVTOOL,
          submenu: [
            {
              type: 'radio',
              checked: urlMode === 'scheme',
              label: '正式端口（Scheme）',
              click: () => {
                urlMode = 'scheme'
                reload()
              }
            },
            {
              type: 'radio',
              checked: urlMode === 'prod',
              label: `正式端口（${backendPort}）`,
              click: () => {
                urlMode = 'prod'
                reload()
              }
            },
            {
              type: 'radio',
              checked: urlMode === 'dev',
              label: `开发端口（${devFrontendPort}）`,
              click: () => {
                urlMode = 'dev'
                reload()
              }
            },
            { type: 'separator' },
            {
              type: 'normal',
              label: '重载页面',
              click: () => {
                reload()
              }
            },
            {
              type: 'normal',
              label: '主窗口开发工具',
              click: () => {
                win && win.webContents.openDevTools()
              }
            },
            { type: 'separator' },
            {
              type: 'normal',
              label: '强制重新启动',
              click: () => {
                app.relaunch()
                app.exit(1)
              }
            },
            {
              type: 'normal',
              label: '强制退出',
              click: () => {
                app.exit(1)
              }
            },
          ]
        },
        {
          type: 'normal',
          label: 'GitHub',
          click: () => {
            opn('https://github.com/purocean/yn')
          }
        },
        {
          type: 'normal',
          label: `版本 ${app.getVersion()}`,
          click: () => {
            updater.checkForUpdates()
          }
        },
        { type: 'separator' },
        {
          type: 'normal',
          label: '退出',
          click: () => {
            setTimeout(() => {
              quit()
            }, 200)
          }
        },
      ])

      tray = new Tray(path.join(__dirname, './assets/tray.png'))
      tray.setToolTip('Yank Note 一款面向程序员的 Markdown 编辑器')
      if (isMacos) {
        tray.on('click', function (this: Tray) { this.popUpContextMenu() })
      } else {
        tray.on('click', () => showWindow())
      }
      tray.setContextMenu(contextMenu)
    }

    updater.init(() => {
      // 立即升级，退出程序
      if (!isMacos) {
        app.exit(0)
      }
    })
    setTimeout(() => {
      updater.autoCheckForUpdates()
    }, 1000)
  })

  app.on('activate', () => {
    showWindow(true)
  })
}
