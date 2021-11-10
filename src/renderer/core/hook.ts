import type { BuildInHookTypes } from '@fe/types'
import { getLogger } from '@fe/utils'

export type HookType = keyof BuildInHookTypes
export type HookFun<T> = (arg: T) => boolean | void | Promise<boolean | void>

export type HookTypeWithoutPayload = { [K in keyof BuildInHookTypes]: BuildInHookTypes[K] extends never ? K : never }[keyof BuildInHookTypes]
export type HookTypeWithPayload = keyof Omit<BuildInHookTypes, HookTypeWithoutPayload>

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
 * @param arg 参数
 * @returns 所有钩子执行结果
 */
export async function triggerHook<T extends HookTypeWithoutPayload> (type: T): Promise<void>
export async function triggerHook<T extends HookTypeWithPayload> (type: T, arg: BuildInHookTypes[T], options?: { breakable?: boolean }): Promise<boolean>
export async function triggerHook<T extends HookType> (type: T, arg?: BuildInHookTypes[T], options?: { breakable?: boolean }): Promise<boolean | void> {
  logger.debug('triggerHook', type, arg)
  for (const { fun, once } of (hooks[type] || ([] as any))) {
    once && removeHook(type, fun)
    if (options?.breakable) {
      if (await fun(arg)) {
        logger.debug('triggerHook', 'break', fun)
        return true
      }
    } else {
      fun(arg)
    }
  }

  if (options?.breakable) {
    return false
  }
}
