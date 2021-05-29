import { Menu } from 'electron'

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
      { role: "quit", accelerator: "Command+Q" }
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
