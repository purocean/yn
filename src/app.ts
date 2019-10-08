import { app, BrowserWindow, Menu, Tray } from 'electron'
import * as path from 'path'
import { dialog } from 'electron'
import server from './server/main'
import { USER_DIR } from './server/constant'
import * as updater from './updater'
import { getAccelerator, registerShortcut } from './shortcut'
const opn = require('opn')

let isDev = false

const backendPort = 3044
const devFrontendPort = 8066
const getUrl = () => `http://localhost:${isDev ? devFrontendPort : backendPort}`

// 去掉每个窗口默认的菜单
Menu.setApplicationMenu(null)

// 主窗口
let win: BrowserWindow | null = null
// 系统托盘
let tray = null

const hide = () => {
  if (win) {
    win.hide()
    win.setSkipTaskbar(true)
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
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true
    },
  })

  // win.maximize()
  win.show()
  win.setMenu(null)

  // 不明原因，第一次启动窗口不能正确加载js
  setTimeout(() => {
    win.loadURL(getUrl())
  }, 0)

  win.on('close', e => {
    hide()
    e.preventDefault()
  })

  win.on('closed', () => {
    win = null
  })

  const selectionMenu = Menu.buildFromTemplate([
    { role: 'copy', label: '复制' },
  ])

  const inputMenu = Menu.buildFromTemplate([
    { role: 'copy', label: '复制' },
    { role: 'paste', label: '粘贴' },
    { role: 'cut', label: '剪切' },
    { type: 'separator' },
    { role: 'undo' , label: '撤销' },
    { role: 'redo', label: '重做'},
    { type: 'separator' },
    { role: 'selectAll', label: '全选' },
  ])

  win.webContents.on('context-menu', (e, props) => {
    const { selectionText, isEditable } = props
    if (isEditable) {
      inputMenu.popup({ window: win })
    } else if (selectionText && selectionText.trim() !== '') {
      selectionMenu.popup({ window: win })
    }
  })
}

const showWindow = () => {
  if (win) {
    const show = () => {
      win.setSkipTaskbar(false)
      win.show()
    }

    if (win.isVisible() && win.isFocused()) {
      hide()
    } else {
      // 先隐藏再显示，以便在 windows 10 当前虚拟窗口展示
      hide()
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
      if (val === false) {
        dialog.showMessageBox(win, {
          type: 'question',
          buttons: ['取消', '放弃保存并退出'],
          title: '提示',
          message: '有文档未保存，是否要退出？'
        }).then(choice => {
          if (choice.response === 1) {
            win.destroy()
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

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.exit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    showWindow()
  })

  app.on('ready', () => {
    // 打开后端服务器
    try {
      server(backendPort)
    } catch (error) {
      app.exit(-1)
    }

    showWindow()

    // 注册快捷键
    registerShortcut({
      'show-main-window': () => showWindow(),
      'open-in-browser': () => opn(getUrl())
    })

    const contextMenu = Menu.buildFromTemplate([
      {
        type: 'normal',
        label: '打开主界面',
        accelerator: getAccelerator('show-main-window'),
        click: () => {
          showWindow()
        }
      },
      {
        type: 'normal',
        label: '浏览器中打开',
        accelerator: getAccelerator('open-in-browser'),
        click: () => {
          opn(getUrl())
        }
      },
      {
        type: 'normal',
        label: '打开主目录',
        click: () => {
          opn(USER_DIR)
        }
      },
      { type: 'separator' },
      {
        type: 'submenu',
        label: '开发',
        submenu: [
          {
            type: 'radio',
            checked: !isDev,
            label: `正式端口（${backendPort}）`,
            click: () => {
              isDev = false
              reload()
            }
          },
          {
            type: 'radio',
            checked: isDev,
            label: `开发端口（${devFrontendPort}）`,
            click: () => {
              isDev = true
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
        label: `检查更新 ${app.getVersion()}`,
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

    tray = new Tray(path.join(__dirname, './assets/icon.png'))
    tray.setToolTip('Yank Note 一款面向程序员的 Markdown 编辑器')
    tray.on('click', showWindow)
    tray.setContextMenu(contextMenu)

    updater.init(() => {
      // 立即升级，退出程序
      app.exit(0)
    })
    setTimeout(() => {
      updater.autoCheckForUpdates()
    }, 1000)
  })

  app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (win === null) {
      createWindow()
    }
  })
}
