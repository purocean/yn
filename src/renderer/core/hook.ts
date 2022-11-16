import type { BuildInHookTypes } from '@fe/types'
import { getLogger } from '@fe/utils'
import * as ioc from './ioc'

export type HookType = keyof BuildInHookTypes
export type HookFun<T> = (arg: T) => (boolean | void | Promise<boolean | void>)

export type Hook<T> = {
  fun: HookFun<T>,
  once: boolean,
}

export type HookTypeWithoutPayload = { [K in keyof BuildInHookTypes]: BuildInHookTypes[K] extends never ? K : never }[keyof BuildInHookTypes]
export type HookTypeWithPayload = keyof Omit<BuildInHookTypes, HookTypeWithoutPayload>

const logger = getLogger('hook')

/**
 * Register a hook.
 * @param type
 * @param fun
 * @param once
 */
export function registerHook<T extends HookType> (type: T, fun: HookFun<BuildInHookTypes[T]>, once = false) {
  ioc.register(type, { fun, once })
}

/**
 * Remove a hook.
 * @param type
 * @param fun
 */
export function removeHook<T extends HookType> (type: T, fun: HookFun<BuildInHookTypes[T]>) {
  ioc.removeWhen(type, item => item.fun === fun)
}

/**
 * Trigger a hook.
 * @param type
 * @param arg
 * @returns
 */
export async function triggerHook<T extends HookTypeWithoutPayload> (type: T): Promise<void>
export async function triggerHook<T extends HookTypeWithPayload> (type: T, arg: BuildInHookTypes[T], options?: { breakable?: boolean, ignoreError?: boolean }): Promise<boolean>
export async function triggerHook<T extends HookType> (type: T, arg?: BuildInHookTypes[T], options?: { breakable?: boolean, ignoreError?: boolean }): Promise<boolean | void> {
  logger.debug('triggerHook', type, arg)
  const items: Hook<any>[] = ioc.get(type)
  for (const { fun, once } of items) {
    once && removeHook<any>(type, fun)
    try {
      if (options?.breakable) {
        if (await fun(arg)) {
          logger.debug('triggerHook', 'break', fun)
          return true
        }
      } else {
        fun(arg)
      }
    } catch (error) {
      if (options?.ignoreError) {
        console.warn('triggerHook', error)
      } else {
        throw error
      }
    }
  }

  if (options?.breakable) {
    return false
  }
}
