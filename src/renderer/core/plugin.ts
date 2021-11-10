import { getLogger } from '@fe/utils'

const logger = getLogger('plugin')

export interface Plugin<Ctx = any> {
  name: string;
  register?: (ctx: Ctx) => void;
}

const plugins: {[name: string]: Plugin} = {}

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
