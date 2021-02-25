import { addAction } from './shortcut'
import { getLogger } from './utils'

export type HookType = 'ON_VIEW_ELEMENT_CLICK'
  | 'ON_VIEW_KEY_DOWN'

export interface Plugin {
  name: string;
  register?: (ctx: Ctx) => void;
}

const logger = getLogger('plugin')

const plugins: {[name: string]: Plugin} = {}

const hooks: { [key in HookType]?: ((...args: any[]) => boolean | void | Promise<boolean | void>)[] } = {}

const ctx = {
  registerShortcutAction (name: string, keys: (string | number)[]) {
    addAction(name, keys)
  },
  registerHook: (type: HookType, fun: (...args: any[]) => void) => {
    if (Array.isArray(hooks[type])) {
      hooks[type] = [...hooks[type]!!, fun]
    } else {
      hooks[type] = [fun]
    }
  }
}

export type Ctx = typeof ctx;

export const register = (plugin: Plugin) => {
  logger.debug('register', plugin)
  plugins[plugin.name] = plugin
  plugin.register && plugin.register(ctx)
}

export const init = () => {
  logger.debug('init')

  const localPlugins = [
    require('@/plugins/TransformImgOutLink').plugin
  ]

  localPlugins.forEach(register)
}

export const triggerHook = async (type: HookType, ...args: any[]) => {
  logger.debug('triggerHook', type, hooks, args)
  for (const fun of (hooks[type] || [])) {
    if (await fun(...args)) {
      break
    }
  }
}

init()
