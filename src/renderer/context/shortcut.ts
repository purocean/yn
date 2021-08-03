import { upperFirst } from 'lodash-es'
import { getLogger } from '@fe/utils'
import { isMacOS } from '@fe/utils/env'
import { getActionHandler } from './action'

const logger = getLogger('shortcut')

export const Escape = 'Escape'
export const Ctrl = 'Ctrl'
export const Meta = 'Meta'
export const CtrlCmd = 'CtrlCmd'
export const Alt = 'Alt'
export const Shift = 'Shift'
export const BracketLeft = 'BracketLeft'
export const BracketRight = 'BracketRight'
export const LeftClick = 0

type XKey = typeof Ctrl | typeof CtrlCmd | typeof Alt | typeof Shift

interface Command {
  id: string,
  keys: null | (string | number)[]
  handler: null | string | ((...args: any[]) => void),
  when?: () => boolean
}

const commands: { [key: string]: Command } = {}

export const hasCtrlCmd = (e: KeyboardEvent | MouseEvent) => isMacOS ? e.metaKey : e.ctrlKey

export const getKeyLabel = (key: XKey | string | number) => {
  const str = {
    CtrlCmd: isMacOS ? '⌘' : 'Ctrl',
    Alt: isMacOS ? '⌥' : 'Alt',
    Ctrl: isMacOS ? '⌃' : 'Ctrl',
    Shift: isMacOS ? '⇧' : 'Shift',
    BracketLeft: '[',
    BracketRight: ']',
  }[key]

  return str || upperFirst(key.toString())
}

export const matchKeys = (e: KeyboardEvent | MouseEvent, keys: (string | number)[]) => {
  const modifiers = { metaKey: false, ctrlKey: false, altKey: false, shiftKey: false }

  for (const key of keys) {
    switch (key) {
      case CtrlCmd:
        if (isMacOS) {
          modifiers.metaKey = true
        } else {
          modifiers.ctrlKey = true
        }
        if (!hasCtrlCmd(e)) return false
        break
      case Alt:
        modifiers.altKey = true
        if (!e.altKey) return false
        break
      case Ctrl:
        modifiers.ctrlKey = true
        if (!e.ctrlKey) return false
        break
      case Meta:
        modifiers.metaKey = true
        if (!e.ctrlKey) return false
        break
      case Shift:
        modifiers.shiftKey = true
        if (!e.shiftKey) return false
        break
      default:
        if (e instanceof KeyboardEvent) {
          if (
            key !== e.key &&
            key.toString().toUpperCase() !== e.code.toUpperCase() &&
            `Key${key}`.toUpperCase() !== e.code.toUpperCase()
          ) return false
        } else {
          if (key !== e.button) return false
        }
    }
  }

  return modifiers.altKey === e.altKey &&
    modifiers.ctrlKey === e.ctrlKey &&
    modifiers.metaKey === e.metaKey &&
    modifiers.shiftKey === e.shiftKey
}

export function getCommand (id: string): Command | undefined {
  return commands[id]
}

export function isCommand (e: KeyboardEvent | MouseEvent, id: string) {
  const command = getCommand(id)
  return !!(command && command.keys && matchKeys(e, command.keys))
}

export function runCommand (command: Command) {
  if (typeof command.handler === 'string') {
    return getActionHandler(command.handler)()
  } else {
    return command.handler?.()
  }
}

export function getKeysLabel (id: string): string {
  const command = getCommand(id)
  if (!command || !command.keys) {
    return ''
  }

  return command.keys.map(getKeyLabel).join(isMacOS ? ' ' : '+')
}

export function registerCommand (command: Command) {
  logger.debug('registerCommand', command)
  commands[command.id] = command
  return command
}

export function removeCommand (id: string) {
  logger.debug('removeCommand', id)
  delete commands[id]
}

function keydownHandler (e: KeyboardEvent) {
  for (const command of Object.values(commands)) {
    if (isCommand(e, command.id)) {
      if (command.when && !command.when()) {
        continue
      }

      e.stopPropagation()
      e.preventDefault()
      runCommand(command)
      break
    }
  }
}

window.addEventListener('keydown', keydownHandler, true)
