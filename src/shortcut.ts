import * as os from 'os'
import { globalShortcut, dialog } from 'electron'
const platform = os.platform()

type AcceleratorType = 'show-main-window' | 'open-in-browser'
export const getAccelerator = (type: AcceleratorType) => {
  return {
    'show-main-window': platform === 'darwin' ? null : 'Super+N',
    'open-in-browser': 'Super+Shift+B'
  }[type]
}

export const registerShortcut = (shortcuts: {[key in AcceleratorType]: () => void}) => {
  Object.keys(shortcuts).forEach((key: AcceleratorType) => {
    const accelerator = getAccelerator(key)
    if (!accelerator) {
      return
    }

    globalShortcut.register(accelerator, shortcuts[key])

    if (!globalShortcut.isRegistered(accelerator)) {
      dialog.showMessageBox({
        type: 'error',
        title: `Yank Note 注册快捷键失败`,
        message: `[${accelerator}] 快捷键有冲突`,
      })
    }
  })
}
