import { upperFirst } from 'lodash-es'
import { getLogger } from '@fe/utils'
import { isMacOS } from '@fe/support/env'
import { getActionHandler } from './action'

const logger = getLogger('command')

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

export interface Command {
  /**
   * 命令 ID
   */
  id: string,

  /**
   * 绑定的快捷键
   */
  keys: null | (string | number)[]

  /**
   * 命令执行方法
   */
  handler: null | string | ((...args: any[]) => void),

  /**
   * 执行前判断方法，什么时候执行
   */
  when?: () => boolean
}

const commands: { [key: string]: Command } = {}

/**
 * 判断用户是否按下了 Cmd 键（macOS）或 Ctrl 键
 * @param e 鼠标事件或键盘事件
 * @returns 是否按下
 */
export function hasCtrlCmd (e: KeyboardEvent | MouseEvent) {
  return isMacOS ? e.metaKey : e.ctrlKey
}

/**
 * 获取按键的名字标签
 * @param key 按键 Key
 * @returns 按键名
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
 * 判断事件是否匹配快捷键组合
 * @param e 鼠标事件或键盘事件
 * @param keys 快捷键
 * @returns 是否匹配
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
 * 获取一个命令
 * @param id 命令 ID
 * @returns 命令
 */
export function getCommand (id: string): Command | undefined {
  return commands[id]
}

/**
 * 判断事件快捷键组合是否匹配一个命令
 * @param e 鼠标事件或键盘事件
 * @param id 命令 ID
 * @returns 是否匹配
 */
export function isCommand (e: KeyboardEvent | MouseEvent, id: string) {
  const command = getCommand(id)
  return !!(command && command.keys && matchKeys(e, command.keys))
}

/**
 * 运行一个命令
 * @param command 命令
 * @returns 执行方法结果
 */
export function runCommand (command: Command) {
  if (typeof command.handler === 'string') {
    return getActionHandler(command.handler as any)()
  } else {
    return command.handler?.()
  }
}

/**
 * 获取一个命令的快捷键名
 * @param id 命令 ID
 * @returns 快捷键名
 */
export function getKeysLabel (id: string): string {
  const command = getCommand(id)
  if (!command || !command.keys) {
    return ''
  }

  return command.keys.map(getKeyLabel).join(isMacOS ? ' ' : '+')
}

/**
 * 注册一个命令
 * @param command 命令
 * @returns 命令
 */
export function registerCommand (command: Command) {
  logger.debug('registerCommand', command)
  commands[command.id] = command
  return command
}

/**
 * 移除一个命令
 * @param id 命令 ID
 */
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
