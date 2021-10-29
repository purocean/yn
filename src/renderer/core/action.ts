import { getLogger } from '@fe/utils'
import { useBus } from '@fe/core/bus'
import { BuildInActionName } from '@fe/types'
import { registerCommand, removeCommand } from './command'

const logger = getLogger('action')
const bus = useBus()

export type ActionHandler = ((...args: any[]) => any)
export type ActionName = BuildInActionName
export type HookType = 'before-run' | 'after-run'

export interface Action {
  /**
   * 名称
   */
  name: string,

  /**
   * 绑定快捷键
   */
  keys?: null | (string | number)[]

  /**
   * 执行方法
   */
  handler: ((this: Action, ...args: any[]) => any)

  /**
   * 执行前判断方法，什么时候执行
   */
  when?: () => boolean
}

const actions: { [id: string]: Action } = {}

/**
 * Hook 一个 Action
 * @param type 钩子类型
 * @param name Action 名
 * @param handler 处理方法
 */
export function hookAction (type: HookType, name: ActionName, handler: (payload: any) => void): () => void
export function hookAction (type: HookType, name: string, handler: (payload: any) => void): () => void
export function hookAction (type: HookType, name: string, handler: (payload: any) => void) {
  bus.on(`action.${type}.${name}` as any, handler)
  return () => bus.off(`action.${type}.${name}` as any, handler)
}

/**
 * 注册一个 Action
 * @param action Action
 * @returns Action
 */
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

/**
 * 获取一个 Action 的执行方法，调用执行时候会触发相关的钩子
 * @param name Action 名称
 */
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

/**
 * 获取一个 Action
 * @param name Action 名称
 */
export function getAction (name: ActionName): Action | undefined
export function getAction (name: string): Action | undefined
export function getAction (name: string) {
  logger.debug('getAction', name)
  return actions[name]
}

/**
 * 移除一个方法
 * @param name Actin 名称
 */
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
