import { getLogger } from '@fe/utils'
import buildInPlugins from './build-in-plugins'
import context, { CtxHookType } from './index'

const logger = getLogger('plugin')

const ctx = { ...context, registerHook, removeHook, triggerHook }

export type Ctx = typeof ctx;
export type HookType = 'ON_STARTUP' | 'ON_PASTE_IMAGE' | CtxHookType
export type HookFun = (...args: any[]) => boolean | void | Promise<boolean | void>
export interface Plugin {
  name: string;
  register?: (ctx: Ctx) => void;
}

const hooks: { [key in HookType]?: {fun: HookFun; once: boolean}[] } = {}
const plugins: {[name: string]: Plugin} = {}

export function registerHook (type: HookType, fun: HookFun, once = false) {
  if (Array.isArray(hooks[type])) {
    hooks[type] = [...hooks[type]!, { fun, once }]
  } else {
    hooks[type] = [{ fun, once }]
  }
}

export function removeHook (type: HookType, fun: HookFun) {
  if (Array.isArray(hooks[type])) {
    hooks[type] = hooks[type]!.filter(x => x.fun !== fun)
  }
}

export async function triggerHook (type: HookType, ...args: any[]) {
  logger.debug('triggerHook', type, args)
  for (const { fun, once } of (hooks[type] || [])) {
    once && ctx.removeHook(type, fun)
    if (await fun(...args)) {
      return true
    }
  }

  return false
}

export function register (plugin: Plugin) {
  logger.debug('register', plugin)
  plugins[plugin.name] = plugin
  plugin.register && plugin.register(ctx)
}

function init () {
  logger.debug('init')

  buildInPlugins.forEach((plugin) => {
    register(plugin)
  })

  window.registerPlugin = register

  const script = window.document.createElement('script')
  script.src = '/api/plugins'
  window.document.body.appendChild(script)
}

init()
