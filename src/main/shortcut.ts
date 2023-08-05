import * as os from 'os'
import { dialog, globalShortcut } from 'electron'
import { FLAG_DISABLE_SERVER } from './constant'
import { getAction, registerAction } from './action'
import config from './config'
import { getDefaultApplicationAccelerators } from '../share/misc'

const platform = os.platform()

const accelerators = getDefaultApplicationAccelerators(platform)
type AcceleratorCommand = (typeof accelerators)[0]['command']

let currentCommands: {[key in AcceleratorCommand]?: () => void}

export const getAccelerator = (command: AcceleratorCommand) => {
  const customKeybinding = config.get('keybindings', [])
    .filter((item: any) => item.type === 'application' && item.command === command)[0]
  return customKeybinding?.keys || accelerators.find(a => a.command === command)!.accelerator
}

export const registerShortcut = (commands: typeof currentCommands) => {
  currentCommands = { ...commands }

  if (FLAG_DISABLE_SERVER) {
    delete commands['open-in-browser']
  }

  globalShortcut.unregisterAll()

  ;(Object.keys(commands) as AcceleratorCommand[]).forEach(key => {
    const accelerator = getAccelerator(key)
    if (!accelerator || !commands[key]) {
      return
    }

    try {
      console.log('register shortcut', accelerator, key)
      globalShortcut.register(accelerator, commands[key]!)
      if (!globalShortcut.isRegistered(accelerator)) {
        throw new Error('Failed to register shortcut')
      }
    } catch (error) {
      console.error(error)
      dialog.showErrorBox('Error', `Failed to register shortcut: ${accelerator}`)
    }
  })

  getAction('refresh-menus')()
}

function reload (config: any, changedKeys: string[]) {
  if (changedKeys.includes('keybindings')) {
    console.log('reload keybindings')
    registerShortcut(currentCommands)
  }
}

registerAction('shortcuts.reload', reload)
