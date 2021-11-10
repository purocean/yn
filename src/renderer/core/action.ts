import { getLogger } from '@fe/utils'
import { BuildInActions, BuildInActionName } from '@fe/types'
import { registerCommand, removeCommand } from './command'
import { triggerHook } from './hook'

const logger = getLogger('action')

export type ActionHandler<T extends string> = T extends BuildInActionName ? BuildInActions[T] : (...args: any[]) => any
export type HookType = 'before-run' | 'after-run'

export interface Action<T extends string> {
  /**
   * 名称
   */
  name: T,

  /**
   * 绑定快捷键
   */
  keys?: null | (string | number)[]

  /**
   * 执行方法
   */
  handler: ActionHandler<T>

  /**
   * 执行前判断方法，什么时候执行
   */
  when?: () => boolean
}

const actions: { [id: string]: Action<string> } = {}

/**
 * 注册一个 Action
 * @param action Action
 * @returns Action
 */
export function registerAction<T extends string> (action: Action<T>) {
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
 * 获取一个 Action
 * @param name Action 名称
 */
export function getAction <T extends BuildInActionName> (name: T): Action<T> | undefined
export function getAction <T extends string>(name: T): Action<T> | undefined
export function getAction (name: string) {
  logger.debug('getAction', name)
  return actions[name]
}

/**
 * 移除一个方法
 * @param name Actin 名称
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
