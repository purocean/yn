import { Menu } from 'electron'
import { bus } from './bus'

export const selectionMenu = Menu.buildFromTemplate([
  { role: 'copy' },
])

export const inputMenu = Menu.buildFromTemplate([
  { role: 'copy' },
  { role: 'paste' },
  { role: 'cut' },
  { type: 'separator' },
  { role: 'undo'  },
  { role: 'redo'},
  { type: 'separator' },
  { role: 'selectAll' },
])

export const mainMenus = Menu.buildFromTemplate([
  {
    label: "Application",
    submenu: [
      { type: 'normal', label: '偏好设置', click: () => bus.emit('show-setting', false) },
      { type: 'normal', label: '关闭窗口', accelerator: "Command+W", click: () => bus.emit('show-main-window', false) },
      { type: 'normal', label: '退出', accelerator: "Command+Q", click: () => bus.emit('quit-app') }
    ]
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo", accelerator: "CmdOrCtrl+Z", },
      { role: "redo", accelerator: "Shift+CmdOrCtrl+Z", },
      { type: "separator" },
      { role: "cut", accelerator: "CmdOrCtrl+X", },
      { role: "copy", accelerator: "CmdOrCtrl+C", },
      { role: "paste", accelerator: "CmdOrCtrl+V", },
      { role: "selectAll", accelerator: "CmdOrCtrl+A" }
    ]
  }
]);
