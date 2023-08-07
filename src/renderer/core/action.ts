import { cloneDeep, orderBy } from 'lodash-es'
import { getLogger } from '@fe/utils'
import type { Action, ActionHandler, BuildInActionName } from '@fe/types'
import { triggerHook } from './hook'
import * as ioc from './ioc'

const logger = getLogger('action')

export type HookType = 'before-run' | 'after-run'

const actions: { [id: string]: Action<string> } = {}

/**
 * Get all actions
 * @returns all actions
 */
export function getRawActions (): Action[] {
  return orderBy(cloneDeep(Object.values(actions)), 'name')
}

/**
 * Register a action tapper.
 * @param tapper
 */
export function tapAction (tapper: (action: Action) => void) {
  ioc.register('ACTION_TAPPERS', tapper)
}

/**
 * Remove a action tapper.
 * @param tapper
 */
export function removeActionTapper (tapper: (action: Action) => void) {
  ioc.remove('ACTION_TAPPERS', tapper)
}

/**
 * Register an action.
 * @param action
 * @returns action
 */
export function registerAction<T extends string> (action: Action<T>) {
  logger.debug('registerAction', action.name)
  actions[action.name] = action
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
  const action = cloneDeep(actions[name])
  if (action) {
    const tappers = ioc.get('ACTION_TAPPERS')
    tappers.forEach(tap => tap(action))
  }

  return action
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
