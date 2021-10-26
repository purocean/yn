import { getLogger } from '@fe/utils'
import { useBus } from '@fe/core/bus'
import { BuildInActionName } from '@fe/types'
import { registerCommand, removeCommand } from './shortcut'

const logger = getLogger('action')
const bus = useBus()

export type ActionHandler = ((...args: any[]) => any)
export type ActionName = BuildInActionName
export type HookType = 'before-run' | 'after-run'

export interface Action {
  name: string,
  keys?: null | (string | number)[]
  handler: ((this: Action, ...args: any[]) => any)
  when?: () => boolean
}

export const actions: { [id: string]: Action } = {}

export function hookAction (type: HookType, name: ActionName, handler: (payload: any) => void): () => void
export function hookAction (type: HookType, name: string, handler: (payload: any) => void): () => void
export function hookAction (type: HookType, name: string, handler: (payload: any) => void) {
  bus.on(`action.${type}.${name}` as any, handler)
  return () => bus.off(`action.${type}.${name}` as any, handler)
}

export function registerAction (action: Action) {
  logger.debug('registerAction', action.name)
  actions[action.name] = action
  if (action.keys) {
    registerCommand({
      id: action.name,
      keys: action.keys,
      handler: getActionHandler(action.name),
      when: action.when,
    })
  }
  return action
}

export function getActionHandler (name: ActionName): ActionHandler
export function getActionHandler (name: string): ActionHandler
export function getActionHandler (name: string) {
  logger.debug('getActionHandler', name)
  return (...args: any[]) => {
    bus.emit(`action.before-run.${name}` as any, args)

    let result: any

    const action = getAction(name)
    if (action) {
      if (!(action.when && !action.when())) {
        result = action.handler?.(...args)
      }
    }

    bus.emit(`action.after-run.${name}` as any, result)
    return result
  }
}

export function getAction (name: ActionName): Action | undefined
export function getAction (name: string): Action | undefined
export function getAction (name: string) {
  logger.debug('getAction', name)
  return actions[name]
}

export function removeAction (name: ActionName): void
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
