import { getLogger } from '@fe/utils'
import { useBus } from '@fe/support/bus'
import type { ActionName as ViewActionName } from './view'
import type { ActionName as LayoutActionName } from './layout'
import type { ActionName as StatusBarActionName } from './status-bar'
import type { ActionName as TreeActionName } from './tree'
import type { ActionName as DocActionName } from './document'

const logger = getLogger('action')
const bus = useBus()

export type ActionFun = (...args: any[]) => any
export type ActionName = ViewActionName | LayoutActionName | StatusBarActionName | TreeActionName | DocActionName
export type HookType = 'before-run' | 'after-run'

export const actions: { [key: string]: ActionFun } = {}

export function hookAction (type: HookType, name: ActionName, handler: (payload: any) => void): () => void
export function hookAction (type: HookType, name: string, handler: (payload: any) => void): () => void
export function hookAction (type: HookType, name: string, handler: (payload: any) => void) {
  bus.on(`action.${type}.${name}`, handler)
  return () => bus.off(`action.${type}.${name}`, handler)
}

export function registerAction (name: ActionName, handler: ActionFun): void
export function registerAction (name: string, handler: ActionFun): void
export function registerAction (name: string, handler: ActionFun) {
  logger.debug('registerAction', name)
  actions[name] = handler
}

export function getAction (name: ActionName): ActionFun
export function getAction (name: string): ActionFun
export function getAction (name: string) {
  logger.debug('getAction', name)
  return (...args: any[]) => {
    bus.emit(`action.before-run.${name}`, args)
    const result = actions[name]?.(...args)
    bus.emit(`action.after-run.${name}`, result)
    return result
  }
}

export function removeAction (name: ActionName): void
export function removeAction (name: string): void
export function removeAction (name: string) {
  logger.debug('removeAction', name)
  delete actions[name]
}
