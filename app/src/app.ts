import { app, BrowserWindow } from 'electron'
import server from './server/main'
import { dialog } from 'electron'

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

  // 打开后端服务器
  server(3044)

  // 加载页面
  setTimeout(() => {
    win.loadURL('http://localhost:3044')
    win.maximize()
  }, 1000)

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

// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.on('ready', createWindow)

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // 在macOS上，当单击dock图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口。
  if (win === null) {
    createWindow()
  }
})
