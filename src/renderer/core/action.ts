import { getLogger } from '@fe/utils'
import { BuildInActions, BuildInActionName } from '@fe/types'
import { registerCommand, removeCommand } from './command'
import { triggerHook } from './hook'

const logger = getLogger('action')

export type ActionHandler<T extends string> = T extends BuildInActionName ? BuildInActions[T] : (...args: any[]) => any
export type HookType = 'before-run' | 'after-run'

export interface Action<T extends string> {
  /**
   * Name
   */
  name: T,

  /**
   * Description
   */
  description?: string

  /**
   * user can config it
   */
  configurable?: boolean

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

const actions: { [id: string]: Action<string> } = {}

/**
 * Register an action.
 * @param action
 * @returns action
 */
export function registerAction<T extends string> (action: Action<T>) {
  logger.debug('registerAction', action.name)
  actions[action.name] = action
  if (action.keys) {
    registerCommand({
      id: action.name,
      description: action.description,
      configurable: typeof action.configurable === 'boolean' ? action.configurable : true,
      keys: action.keys,
      handler: getActionHandler(action.name),
      when: action.when,
    })
  }
  return action
}

/**
 * Get an action handler.
 * @param name
 */
export function getActionHandler <T extends BuildInActionName> (name: T): ActionHandler<T>
export function getActionHandler <T extends string> (name: T): ActionHandler<T>
export function getActionHandler <T extends string> (name: T): ActionHandler<T> {
  logger.debug('getActionHandler', name)
  return ((...args: any[]) => {
    triggerHook('ACTION_BEFORE_RUN', { name }, { breakable: true })

    let result: any

    const action = getAction(name)
    if (action) {
      if (!(action.when && !action.when())) {
        result = (action.handler)?.(...args)
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
    if (action.keys) {
      removeCommand(name)
    }

    delete actions[name]
  }
}
