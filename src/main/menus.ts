import { app, Menu } from 'electron'
import { getAction } from './action'
import { FLAG_DISABLE_DEVTOOL, FLAG_DISABLE_SERVER, GITHUB_URL, USER_DIR } from './constant'
import { getAccelerator } from './shortcut'
import opn from 'opn'
import { checkForUpdates } from './updater'

export const selectionMenu = Menu.buildFromTemplate([
  { role: 'copy' },
])

export const inputMenu = Menu.buildFromTemplate([
  { role: 'copy' },
  { role: 'paste' },
  { role: 'cut' },
  { type: 'separator' },
  { role: 'undo' },
  { role: 'redo' },
  { type: 'separator' },
  { role: 'selectAll' },
])

export const mainMenus = process.platform === 'darwin' ? Menu.buildFromTemplate([
  {
    label: 'Application',
    submenu: [
      { type: 'normal', label: '偏好设置', click: () => getAction('show-main-window-setting')() },
      { type: 'normal', label: '关闭窗口', accelerator: 'Command+W', click: () => getAction('hide-main-window')() },
      { type: 'normal', label: '退出', accelerator: 'Command+Q', click: () => getAction('quit')() }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo', accelerator: 'CmdOrCtrl+Z', },
      { role: 'redo', accelerator: 'Shift+CmdOrCtrl+Z', },
      { type: 'separator' },
      { role: 'cut', accelerator: 'CmdOrCtrl+X', },
      { role: 'copy', accelerator: 'CmdOrCtrl+C', },
      { role: 'paste', accelerator: 'CmdOrCtrl+V', },
      { role: 'selectAll', accelerator: 'CmdOrCtrl+A' }
    ]
  }
]) : null

export const getTrayMenus = () => Menu.buildFromTemplate([
  {
    type: 'normal',
    label: '打开主界面',
    accelerator: getAccelerator('show-main-window'),
    click: () => getAction('show-main-window')()
  },
  {
    type: 'normal',
    label: '浏览器中打开',
    accelerator: getAccelerator('open-in-browser'),
    visible: !FLAG_DISABLE_SERVER,
    click: () => getAction('open-in-browser')()
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
    click: () => getAction('show-main-window-setting')()
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
        checked: getAction('get-url-mode')() === 'scheme',
        label: '正式端口（Scheme）',
        click: () => {
          getAction('set-url-mode')('scheme')
          getAction('reload-main-window')()
        }
      },
      {
        type: 'radio',
        checked: getAction('get-url-mode')() === 'prod',
        label: `正式端口（${getAction('get-backend-port')()}）`,
        click: () => {
          getAction('set-url-mode')('prod')
          getAction('reload-main-window')()
        }
      },
      {
        type: 'radio',
        checked: getAction('get-url-mode')() === 'dev',
        label: `开发端口（${getAction('get-dev-frontend-port')()}）`,
        click: () => {
          getAction('set-url-mode')('dev')
          getAction('reload-main-window')()
        }
      },
      { type: 'separator' },
      {
        type: 'normal',
        label: '重载页面',
        click: () => {
          getAction('reload-main-window')()
        }
      },
      {
        type: 'normal',
        label: '主窗口开发工具',
        click: () => {
          const win = getAction('get-main-widow')()
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
      opn(GITHUB_URL)
    }
  },
  {
    type: 'normal',
    label: `版本 ${app.getVersion()}`,
    click: () => {
      checkForUpdates()
    }
  },
  { type: 'separator' },
  {
    type: 'normal',
    label: '退出',
    click: () => {
      setTimeout(() => {
        getAction('quit')()
      }, 200)
    }
  },
])
