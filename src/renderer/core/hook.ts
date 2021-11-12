import type { BuildInHookTypes } from '@fe/types'
import { getLogger } from '@fe/utils'

export type HookType = keyof BuildInHookTypes
export type HookFun<T> = (arg: T) => boolean | void | Promise<boolean | void>

export type HookTypeWithoutPayload = { [K in keyof BuildInHookTypes]: BuildInHookTypes[K] extends never ? K : never }[keyof BuildInHookTypes]
export type HookTypeWithPayload = keyof Omit<BuildInHookTypes, HookTypeWithoutPayload>

const logger = getLogger('hook')

const hooks: { [key in HookType]?: ({fun: HookFun<any>; once: boolean})[] } = {}

/**
 * Register a hook.
 * @param type
 * @param fun
 * @param once
 */
export function registerHook<T extends HookType> (type: T, fun: HookFun<BuildInHookTypes[T]>, once = false) {
  if (Array.isArray(hooks[type])) {
    hooks[type] = [...hooks[type]!, { fun, once }]
  } else {
    hooks[type] = [{ fun, once }]
  }
}

/**
 * Remove a hook.
 * @param type
 * @param fun
 */
export function removeHook<T extends HookType> (type: T, fun: HookFun<BuildInHookTypes[T]>) {
  if (Array.isArray(hooks[type])) {
    hooks[type] = hooks[type]!.filter(x => x.fun !== fun)
  }
}

/**
 * Trigger a hook.
 * @param type
 * @param arg
 * @returns
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
