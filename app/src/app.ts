import { app, BrowserWindow, Menu, Tray } from 'electron'
import * as path from 'path'
import server from './server/main'
import { dialog } from 'electron'
const opn = require('opn')

let isDev = false

const backendPort = 3044
const devFrontendPort = 8066
const getFrontendProt = () => isDev ? devFrontendPort : backendPort
const getUrl = () => `http://localhost:${isDev ? devFrontendPort : backendPort}`

let win: BrowserWindow | null = null

const createWindow = () => {
  win = new BrowserWindow({
    maximizable: true,
    show: false,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true
    }
  })

  win.maximize()
  win.show()
  win.setMenu(null)

  // 不明原因，第一次启动窗口不能正确加载js
  setTimeout(() => {
    win.loadURL(getUrl())
  }, 0)

  win.on('close', e => {
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
            }
          })
        } else {
          win.destroy()
        }
      })
      e.preventDefault()
    }
  })

  // 当 window 被关闭，这个事件会被触发。
  win.on('closed', () => {
    // 取消引用 window 对象，如果你的应用支持多窗口的话，
    // 通常会把多个 window 对象存放在一个数组里面，
    // 与此同时，你应该删除相应的元素。
    win = null
  })
}

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
  // 不处理，点击托盘退出
})

app.on('activate', () => {
  // 在macOS上，当单击dock图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口。
  if (win === null) {
    createWindow()
  }
})

const showWindow = () => {
  if (win) {
    win.show()
  } else {
    createWindow()
  }
}

const reload = () => {
  win && win.loadURL(getUrl())
}

// 系统托盘
let tray = null
app.on('ready', () => {
  // 打开后端服务器

  try {
    server(backendPort)
  } catch (error) {
    app.exit(-1)
  }

  showWindow()

  const contextMenu = Menu.buildFromTemplate([
    {
      type: 'normal',
      label: '打开主界面',
      click: () => {
        showWindow()
      }
    },
    {
      type: 'normal',
      label: '浏览器中打开',
      click: () => {
        opn(getUrl())
      }
    },
    { type: 'separator' },
    {
      type: 'normal',
      label: 'GitHub 地址',
      click: () => {
        opn('https://github.com/purocean/yn')
      }
    },
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
    { type: 'separator' },
    {
      type: 'normal',
      label: '退出',
      click: () => {
        win && win.close()
        setTimeout(() => {
          app.quit()
        }, 200)
      }
    },
  ])

  tray = new Tray(path.join(__dirname, './assets/icon.png'))
  tray.setToolTip('Yank Note')
  tray.on('click', showWindow)
  tray.setContextMenu(contextMenu)
})
