import * as os from 'os'
import { globalShortcut, dialog } from 'electron'
import { FLAG_DISABLE_SERVER } from './constant'
const platform = os.platform()

type AcceleratorType = 'show-main-window' | 'open-in-browser'
export const getAccelerator = (type: AcceleratorType) => {
  return {
    'show-main-window': platform === 'darwin' ? undefined : 'Super+N',
    'open-in-browser': 'Super+Shift+B'
  }[type]
}

export const registerShortcut = (shortcuts: {[key in AcceleratorType]?: () => void}) => {
  if (FLAG_DISABLE_SERVER) {
    delete shortcuts['open-in-browser']
  }

  (Object.keys(shortcuts) as AcceleratorType[]).forEach(key => {
    const accelerator = getAccelerator(key)
    if (!accelerator || !shortcuts[key]) {
      return
    }

    globalShortcut.register(accelerator, shortcuts[key]!)

    if (!globalShortcut.isRegistered(accelerator)) {
      dialog.showMessageBox({
        type: 'error',
        title: 'Yank Note 注册快捷键失败',
        message: `[${accelerator}] 快捷键有冲突`,
      })
    }
  })
}
