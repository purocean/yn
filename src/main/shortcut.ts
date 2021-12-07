import * as os from 'os'
import { globalShortcut } from 'electron'
import { FLAG_DISABLE_SERVER } from './constant'
import { getAction } from './action'

const platform = os.platform()

type AcceleratorType = 'show-main-window' | 'open-in-browser'

const accelerators: Record<AcceleratorType, string> = {
  'show-main-window': platform === 'darwin' ? 'Shift+Alt+M' : 'Super+N',
  'open-in-browser': 'Super+Shift+B'
}

export const getAccelerator = (type: AcceleratorType) => {
  return accelerators[type]
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
      delete accelerators[key]
      getAction('refresh-menus')()
    }
  })
}
