import { upperFirst } from 'lodash-es'
import { getLogger } from '@fe/utils'
import type { BuildInActions, BuildInActionName } from '@fe/types'
import { isMacOS } from '@fe/support/env'
import { FLAG_DISABLE_SHORTCUTS } from '@fe/support/args'
import { triggerHook } from './hook'

export namespace Keys {
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
  export const Tab = 'Tab'
}

export type ActionHandler<T extends string> = T extends BuildInActionName ? BuildInActions[T] : (...args: any[]) => any
export type HookType = 'before-run' | 'after-run'

export interface Action<T extends string> {
  /**
   * Name
   */
  name: T,

  /**
   * Associate shortcuts
   */
  keys?: null | (string | number)[]

  /**
   * Handler
   */
  handler: ActionHandler<T>

  /**
   * When should execute handler
   */
  when?: () => boolean
}

const logger = getLogger('action')

const actions: { [id: string]: Action<string> } = {}

type XKey = typeof Keys.Ctrl | typeof Keys.CtrlCmd | typeof Keys.Alt | typeof Keys.Shift

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
 * Register an action.
 * @param action
 * @returns action
 */
export function registerAction<T extends string> (action: Action<T>) {
  logger.debug('registerAction', action.name)

  if (actions[action.name]) {
    throw new Error(`Action ${action.name} has been registered.`)
  }

  actions[action.name] = action
  return action
}

/**
 * Get an action handler.
 * @param action
 */
export function getActionHandler <T extends BuildInActionName> (action: Action<T>): ActionHandler<T>
export function getActionHandler <T extends BuildInActionName> (action: Action<string>): ActionHandler<T>
export function getActionHandler <T extends BuildInActionName> (action: T): ActionHandler<T>
export function getActionHandler <T extends string> (action: T): ActionHandler<T>
export function getActionHandler <T extends string> (action: T | Action<T>): ActionHandler<T> {
  const _action = typeof action === 'string' ? getAction(action) : action
  const name = typeof action === 'string' ? action : action.name

  logger.debug('getActionHandler', name)
  return ((...args: any[]) => {
    triggerHook('ACTION_BEFORE_RUN', { name }, { breakable: true })

    let result: any

    if (_action) {
      if (!(_action.when && !_action.when())) {
        result = (_action.handler)?.(...args)
      }
    }

    triggerHook('ACTION_AFTER_RUN', { name }, { breakable: true })
    return result
  }) as ActionHandler<T>
}

/**
 * Get an action.
 * @param name
 */
export function getAction <T extends BuildInActionName> (name: T): Action<T> | undefined
export function getAction <T extends string>(name: T): Action<T> | undefined
export function getAction (name: string) {
  logger.debug('getAction', name)
  return actions[name]
}

/**
 * Remove an action.
 * @param name
 */
export function removeAction (name: BuildInActionName): void
export function removeAction (name: string): void
export function removeAction (name: string) {
  logger.debug('removeAction', name)
  const action = getAction(name)
  if (action) {
    delete actions[name]
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
    Period: '.',
    Tab: 'Tab',
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
      case Keys.CtrlCmd:
        if (isMacOS) {
          modifiers.metaKey = true
        } else {
          modifiers.ctrlKey = true
        }
        if (!hasCtrlCmd(e)) return false
        break
      case Keys.Alt:
        modifiers.altKey = true
        if (!e.altKey) return false
        break
      case Keys.Ctrl:
        modifiers.ctrlKey = true
        if (!e.ctrlKey) return false
        break
      case Keys.Meta:
        modifiers.metaKey = true
        if (!e.ctrlKey) return false
        break
      case Keys.Shift:
        modifiers.shiftKey = true
        if (!e.shiftKey) return false
        break
      default:
        // if the event from iframe, it not instance of KeyboardEvent.
        if (e instanceof KeyboardEvent || '' + e === '[object KeyboardEvent]') {
          e = e as KeyboardEvent
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
 * Determine whether the event shortcut key combination matches a action.
 * @param e
 * @param action
 * @returns
 */
export function isAction (e: KeyboardEvent | MouseEvent, action: string | Action<any>) {
  const _action = typeof action === 'string' ? getAction(action) : action
  return !!(_action && _action.keys && matchKeys(e, _action.keys))
}

/**
 * Get shortcuts label.
 * @param nameOrKeys action name or keys
 * @returns
 */
export function getKeysLabel (name: string): string
export function getKeysLabel (keys: (string | number)[]): string
export function getKeysLabel (nameOrKeys: (string | number)[] | string): string {
  let keys = []

  if (typeof nameOrKeys === 'string') {
    const action = getAction(nameOrKeys)
    if (!action || !action.keys) {
      return ''
    }

    keys = action.keys
  } else {
    keys = nameOrKeys
  }

  return keys.map(getKeyLabel).join(isMacOS ? ' ' : '+')
}

export function keydownHandler (e: KeyboardEvent) {
  recordKeys(e)

  if (FLAG_DISABLE_SHORTCUTS) {
    logger.warn('shortcut disabled')
    return
  }

  triggerHook('GLOBAL_KEYDOWN', e)

  for (const action of Object.values(actions)) {
    if (isAction(e, action)) {
      if (action.when && !action.when()) {
        continue
      }

      e.stopPropagation()
      e.preventDefault()
      getActionHandler(action.name)()
      break
    }
  }
}

export function keyupHandler (e: KeyboardEvent) {
  recordKeys(e)
  triggerHook('GLOBAL_KEYUP', e)
}

window.addEventListener('keydown', keydownHandler, true)
window.addEventListener('keyup', keyupHandler, true)
