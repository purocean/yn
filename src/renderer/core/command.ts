import { upperFirst } from 'lodash-es'
import { getLogger } from '@fe/utils'
import { isMacOS } from '@fe/support/env'
import { getActionHandler } from './action'
import { FLAG_DISABLE_SHORTCUTS } from '@fe/support/args'

const logger = getLogger('command')

export const Escape = 'Escape'
export const Ctrl = 'Ctrl'
export const Meta = 'Meta'
export const CtrlCmd = 'CtrlCmd'
export const Alt = 'Alt'
export const Space = 'Space'
export const Shift = 'Shift'
export const BracketLeft = 'BracketLeft'
export const BracketRight = 'BracketRight'
export const LeftClick = 0

type XKey = typeof Ctrl | typeof CtrlCmd | typeof Alt | typeof Shift

export interface Command {
  /**
   * Command Id
   */
  id: string,

  /**
   * Associate shortcuts
   */
  keys: null | (string | number)[]

  /**
   * Handler
   */
  handler: null | string | (() => void),

  /**
   * When should execute handler
   */
  when?: () => boolean
}

const commands: { [key: string]: Command } = {}

let keys: Record<string, boolean> = {}

function recordKeys (e: KeyboardEvent) {
  if (e.type === 'keydown') {
    keys[e.key.toUpperCase()] = true
  } else {
    // keyup event not fired some times such as in key combination.
    keys = {}
  }
}

/**
 * Determine whether the user has pressed the key
 * @param key upper case.
 */
export function isKeydown (key: string) {
  return !!keys[key]
}

/**
 * Determine whether the user has pressed the Cmd key (macOS) or Ctrl key.
 * @param e
 * @returns
 */
export function hasCtrlCmd (e: KeyboardEvent | MouseEvent) {
  return isMacOS ? e.metaKey : e.ctrlKey
}

/**
 * Get key label.
 * @param key
 * @returns
 */
export function getKeyLabel (key: XKey | string | number) {
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

/**
 * Determine whether the event matches the shortcut key combination.
 * @param e
 * @param keys
 * @returns
 */
export function matchKeys (e: KeyboardEvent | MouseEvent, keys: (string | number)[]) {
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

/**
 * Get a command
 * @param id
 * @returns
 */
export function getCommand (id: string): Command | undefined {
  return commands[id]
}

/**
 * Determine whether the event shortcut key combination matches a command.
 * @param e
 * @param id
 * @returns
 */
export function isCommand (e: KeyboardEvent | MouseEvent, id: string) {
  const command = getCommand(id)
  return !!(command && command.keys && matchKeys(e, command.keys))
}

/**
 * Run a command
 * @param command
 * @returns
 */
export function runCommand (command: Command) {
  if (typeof command.handler === 'string') {
    return getActionHandler(command.handler)()
  } else {
    return command.handler?.()
  }
}

/**
 * Get shortcuts label.
 * @param idOrKeys command id or keys
 * @returns
 */
export function getKeysLabel (id: string): string
export function getKeysLabel (keys: (string | number)[]): string
export function getKeysLabel (idOrKeys: (string | number)[] | string): string {
  let keys = []

  if (typeof idOrKeys === 'string') {
    const command = getCommand(idOrKeys)
    if (!command || !command.keys) {
      return ''
    }

    keys = command.keys
  } else {
    keys = idOrKeys
  }

  return keys.map(getKeyLabel).join(isMacOS ? ' ' : '+')
}

/**
 * Register a command.
 * @param command
 * @returns
 */
export function registerCommand (command: Command) {
  logger.debug('registerCommand', command)
  commands[command.id] = command
  return command
}

/**
 * Remove a command
 * @param id
 */
export function removeCommand (id: string) {
  logger.debug('removeCommand', id)
  delete commands[id]
}

function keydownHandler (e: KeyboardEvent) {
  recordKeys(e)

  if (FLAG_DISABLE_SHORTCUTS) {
    logger.warn('shortcut disabled')
    return
  }

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
window.addEventListener('keyup', recordKeys, true)
