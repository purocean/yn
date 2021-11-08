import type { BuildInHookTypes } from '@fe/types'
import { getLogger } from '@fe/utils'

export type HookType = keyof BuildInHookTypes
export type HookFun<T extends any[]> = (...args: T) => boolean | void | Promise<boolean | void>

const logger = getLogger('hook')

const hooks: { [key in HookType]?: ({fun: HookFun<any>; once: boolean})[] } = {}

/**
 * 注册一个插件钩子
 * @param type 钩子类型
 * @param fun 执行方法
 * @param once 是否只执行一次
 */
export function registerHook<T extends HookType> (type: T, fun: HookFun<BuildInHookTypes[T]>, once = false) {
  if (Array.isArray(hooks[type])) {
    hooks[type] = [...hooks[type]!, { fun, once }]
  } else {
    hooks[type] = [{ fun, once }]
  }
}

/**
 * 移除一个插件钩子
 * @param type 钩子类型
 * @param fun 执行方法
 */
export function removeHook<T extends HookType> (type: T, fun: HookFun<BuildInHookTypes[T]>) {
  if (Array.isArray(hooks[type])) {
    hooks[type] = hooks[type]!.filter(x => x.fun !== fun)
  }
}

/**
 * 触发一个钩子
 * @param type 钩子类型
 * @param args 参数
 * @returns 所有钩子执行结果
 */
export async function triggerHook<T extends HookType> (type: T, ...args: BuildInHookTypes[T]) {
  logger.debug('triggerHook', type, args)
  for (const { fun, once } of (hooks[type] || ([] as any))) {
    once && removeHook(type, fun)
    if (await fun(...args)) {
      return true
    }
  }

  return false
}
