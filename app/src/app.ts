import { app, BrowserWindow, Menu, Tray } from 'electron'
import * as path from 'path'
import server from './server/main'
import { dialog } from 'electron'
const opn = require('opn')

const port = 3044
const url = `http://localhost:${port}`

let win: BrowserWindow | null = null

const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // 加载index.html文件
  // win.loadFile('../../static/index.html')

  // 加载页面
  win.loadURL(url)
  // win.maximize()

  // 打开开发者工具
  win.webContents.openDevTools()

  win.on('close', e => {
    const contents = win.webContents

    if (contents) {
      contents.executeJavaScript('window.documentSaved', true).then(val => {
        if (val) {
          win.destroy()
        } else {
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

// 系统托盘
let tray = null
app.on('ready', () => {
  // 打开后端服务器
  server(port)

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
        opn(url)
      }
    },
    {
      type: 'normal',
      label: '退出',
      click: () => {
        app.exit()
      }
    },
  ])

  tray = new Tray(path.join(__dirname, './assets/icon.png'))
  tray.setToolTip('Yank-Note')
  tray.on('click', showWindow)
  tray.setContextMenu(contextMenu)
})
