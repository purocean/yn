import { app, Menu, shell } from 'electron'
import { getAction } from './action'
import { FLAG_DISABLE_DEVTOOL, FLAG_DISABLE_SERVER, GITHUB_URL, USER_DIR } from './constant'
import { getAccelerator } from './shortcut'
import { checkForUpdates } from './updater'
import { $t } from './i18n'

export const getMainMenus = () => process.platform === 'darwin' ? Menu.buildFromTemplate([
  {
    label: 'Application',
    submenu: [
      { type: 'normal', label: $t('app.preferences'), click: () => getAction('show-main-window-setting')() },
      { type: 'normal', label: $t('app.toggle-fullscreen'), accelerator: 'Ctrl+command+F', click: () => getAction('toggle-fullscreen')() },
      { type: 'normal', label: $t('app.quit'), accelerator: 'Command+Q', click: () => getAction('quit')() }
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
  },
  // support multiple window
  {
    role: 'window',
    submenu: [{ role: 'minimize' }, { role: 'close' }]
  },
]) : null

export const getTrayMenus = () => Menu.buildFromTemplate([
  {
    type: 'normal',
    label: $t('app.tray.open-main-window'),
    accelerator: getAccelerator('show-main-window'),
    click: () => getAction('show-main-window')()
  },
  {
    type: 'normal',
    label: $t('app.tray.open-in-browser'),
    accelerator: getAccelerator('open-in-browser'),
    visible: !FLAG_DISABLE_SERVER,
    click: () => getAction('open-in-browser')()
  },
  {
    type: 'normal',
    label: $t('app.tray.open-main-dir'),
    click: () => {
      shell.openPath(USER_DIR)
    }
  },
  {
    type: 'normal',
    label: $t('app.tray.preferences'),
    click: () => getAction('show-main-window-setting')()
  },
  {
    type: 'checkbox',
    label: $t('app.tray.start-at-login'),
    checked: app.getLoginItemSettings().openAtLogin,
    click: x => {
      app.setLoginItemSettings({ openAtLogin: x.checked })
      x.checked = app.getLoginItemSettings().openAtLogin
    }
  },
  { type: 'separator' },
  {
    type: 'submenu',
    label: $t('app.tray.dev.dev'),
    visible: !FLAG_DISABLE_DEVTOOL,
    submenu: [
      {
        type: 'radio',
        checked: getAction('get-url-mode')() === 'scheme',
        label: $t('app.tray.dev.port-prod', 'Scheme'),
        click: () => {
          getAction('set-url-mode')('scheme')
          getAction('reload-main-window')()
        }
      },
      {
        type: 'radio',
        checked: getAction('get-url-mode')() === 'prod',
        label: $t('app.tray.dev.port-prod', getAction('get-backend-port')()),
        click: () => {
          getAction('set-url-mode')('prod')
          getAction('reload-main-window')()
        }
      },
      {
        type: 'radio',
        checked: getAction('get-url-mode')() === 'dev',
        label: $t('app.tray.dev.port-dev', getAction('get-dev-frontend-port')()),
        click: () => {
          getAction('set-url-mode')('dev')
          getAction('reload-main-window')()
        }
      },
      { type: 'separator' },
      {
        type: 'normal',
        label: $t('app.tray.dev.reload'),
        click: () => {
          getAction('reload-main-window')()
        }
      },
      {
        type: 'normal',
        label: $t('app.tray.dev.dev-tool'),
        click: () => {
          const win = getAction('get-main-widow')()
          win && win.webContents.openDevTools()
        }
      },
      { type: 'separator' },
      {
        type: 'normal',
        label: $t('app.tray.dev.restart'),
        click: () => {
          app.relaunch()
          app.exit(1)
        }
      },
      {
        type: 'normal',
        label: $t('app.tray.dev.force-quit'),
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
      shell.openExternal(GITHUB_URL)
    }
  },
  {
    type: 'normal',
    label: `${$t('app.tray.version', app.getVersion())}`,
    click: () => {
      checkForUpdates()
    }
  },
  { type: 'separator' },
  {
    type: 'normal',
    label: $t('app.tray.quit'),
    click: () => {
      setTimeout(() => {
        getAction('quit')()
      }, 200)
    }
  },
])
