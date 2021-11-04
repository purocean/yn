import type { BuildInHookTypes } from '@fe/types'
import { getLogger } from '@fe/utils'

const logger = getLogger('plugin')

export type HookType = keyof BuildInHookTypes
export type HookFun<T extends any[]> = (...args: T) => boolean | void | Promise<boolean | void>
export interface Plugin<Ctx = any> {
  name: string;
  register?: (ctx: Ctx) => void;
}

const hooks: { [key in HookType]?: ({fun: HookFun<any>; once: boolean})[] } = {}
const plugins: {[name: string]: Plugin} = {}

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

/**
 * 注册一个插件
 * @param plugin 插件
 * @param ctx 上下文信息
 */
export function register <Ctx> (plugin: Plugin, ctx: Ctx) {
  logger.debug('register', plugin)
  plugins[plugin.name] = plugin
  plugin.register && plugin.register(ctx)
}

/**
 * 初始化插件体系，注册内置插件
 * @param plugins 内置插件列表
 * @param ctx 上下文信息
 */
export function init <Ctx> (plugins: Plugin[], ctx: Ctx) {
  logger.debug('init')

  plugins.forEach((plugin) => {
    register(plugin, ctx)
  })

  window.registerPlugin = (plugin: Plugin) => register(plugin, ctx)

  const script = window.document.createElement('script')
  script.src = '/api/plugins'
  window.document.body.appendChild(script)
}
