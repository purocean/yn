import * as shortcut from '@/useful/shortcut'
import { getLogger } from '@/useful/utils'
import { useBus } from '@/useful/bus'
import buildInPlugins from './build-in'
import store from '@/store'
import * as tree from './tree'
import * as statusBar from './status-bar'
import * as view from './view'
import * as markdown from './markdown'

export type HookType = 'ON_STARTUP' | tree.HookType | view.HookType

export interface Plugin {
  name: string;
  register?: (ctx: Ctx) => void;
}

export type HookFun = (...args: any[]) => boolean | void | Promise<boolean | void>

const logger = getLogger('plugin')
const bus = useBus()

const plugins: {[name: string]: Plugin} = {}
const hooks: { [key in HookType]?: {fun: HookFun; once: boolean}[] } = {}

const ctx = {
  bus,
  store,
  shortcut,
  registerHook: (type: HookType, fun: HookFun, once = false) => {
    if (Array.isArray(hooks[type])) {
      hooks[type] = [...hooks[type]!!, { fun, once }]
    } else {
      hooks[type] = [{ fun, once }]
    }
  },
  removeHook: (type: HookType, fun: HookFun) => {
    if (Array.isArray(hooks[type])) {
      hooks[type] = hooks[type]!!.filter(x => x.fun !== fun)
    }
  },
  triggerHook: async (type: HookType, ...args: any[]) => {
    logger.debug('triggerHook', type, args)
    for (const { fun, once } of (hooks[type] || [])) {
      once && ctx.removeHook(type, fun)
      if (await fun(...args)) {
        return true
      }
    }

    return false
  },
  markdown: markdown.ctx,
  statusBar: statusBar.ctx
}

export type Ctx = typeof ctx;

export const register = (plugin: Plugin) => {
  logger.debug('register', plugin)
  plugins[plugin.name] = plugin
  plugin.register && plugin.register(ctx)
}

export const init = () => {
  logger.debug('init')

  buildInPlugins.forEach((plugin) => {
    if (plugin.__esModule && plugin.default) {
      register(plugin.default)
    } else {
      register(plugin)
    }
  })
}

export const triggerHook = ctx.triggerHook

init()
