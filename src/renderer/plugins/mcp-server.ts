import type { Ctx, Plugin } from '@fe/context'

const settingKey = 'mcp.enabled'
const copyEndpointAction = 'plugin.mcp-server.copy-endpoint'
const endpointPath = '/api/mcp/message'

function getMcpEndpointUrl (ctx: Ctx) {
  let port = ''

  try {
    const url = new URL(window.location.href)
    port = url.searchParams.get('port') || ''

    if (!port && /^https?:$/.test(url.protocol) && url.port && url.port !== '8066') {
      port = url.port
    }
  } catch (error) {
    // Ignore invalid URLs from non-standard runtime environments.
  }

  if (!port) {
    port = String(ctx.setting.getSetting('server.port', 3044))
  }

  return `http://127.0.0.1:${port}${endpointPath}`
}

function appendEndpointLink (ctx: Ctx, editor: any) {
  const field = editor.getEditor(`root.${settingKey}`)
  const label = field?.label as HTMLLabelElement | undefined
  if (!label || label.querySelector('.setting-mcp-endpoint')) {
    return
  }

  const endpointUrl = getMcpEndpointUrl(ctx)
  const wrapper = document.createElement('span')
  const link = document.createElement('a')
  link.href = `javascript:ctx.action.getActionHandler('${copyEndpointAction}')()`
  link.className = 'setting-mcp-endpoint'
  wrapper.style.cssText = 'display:inline-block;font-size:13px;line-height:1.35;word-break:break-all;'
  wrapper.appendChild(document.createTextNode(endpointUrl + ' '))
  link.textContent = ctx.i18n.t('copy')
  link.title = ctx.i18n.t('click-to-copy')
  wrapper.appendChild(link)
  label.appendChild(wrapper)
}

export default {
  name: 'mcp-server',
  register: (ctx) => {
    ctx.action.registerAction({
      name: copyEndpointAction,
      description: ctx.i18n.t('copy'),
      handler: () => {
        ctx.utils.copyText(getMcpEndpointUrl(ctx))
      },
    })

    ctx.registerHook('SETTING_PANEL_BEFORE_SHOW', () => {
      ctx.setting.changeSchema((schema) => {
        ;(schema.properties as any)[settingKey] = {
          defaultValue: false,
          title: ctx.i18n.t('plugin-mcp-server.enable' as any) as any,
          type: 'boolean',
          group: 'other',
          format: 'checkbox',
          required: true,
        }
      })
    })

    ctx.registerHook('SETTING_PANEL_AFTER_SHOW', ({ editor }) => {
      appendEndpointLink(ctx, editor)
    })
  }
} as Plugin
