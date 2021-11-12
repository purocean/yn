import { getLogger } from '@fe/utils'

const logger = getLogger('plugin')

export interface Plugin<Ctx = any> {
  name: string;
  register?: (ctx: Ctx) => void;
}

const plugins: {[name: string]: Plugin} = {}

/**
 * Register a plugin.
 * @param plugin
 * @param ctx
 */
export function register <Ctx> (plugin: Plugin, ctx: Ctx) {
  logger.debug('register', plugin)
  plugins[plugin.name] = plugin
  plugin.register && plugin.register(ctx)
}

/**
 * Initialization plugin system and register build-in plugins
 * @param plugins
 * @param ctx
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
