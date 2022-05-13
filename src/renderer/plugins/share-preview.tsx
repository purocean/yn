import type { Plugin } from '@fe/context'
import { FLAG_MAS } from '@fe/support/args'

export default {
  name: 'share-preview',
  register: (ctx) => {
    ctx.registerHook('STARTUP', () => {
      if (ctx.args.MODE === 'share-preview') {
        ctx.store.watch(state => state.presentation, val => {
          if (!val) {
            ctx.store.commit('setPresentation', true)
          }
        }, { immediate: true })
      }
    })

    if (FLAG_MAS) {
      return
    }

    const link = ctx.lib.vue.ref('')
    const ip = ctx.lib.vue.ref('')

    const panel = ctx.lib.vue.defineComponent({
      setup () {
        const expire = ctx.lib.vue.ref('2h')
        const ips = ctx.lib.vue.ref([] as string[])

        ctx.lib.vue.onMounted(async () => {
          ips.value = await ctx.api.rpc(`
            const ip = require('ip')
            const os = require('os')
            return Object.values(os.networkInterfaces())
              .flat()
              .map(x => x.address)
              .filter(x => ip.isV4Format(x) && !ip.isLoopback(x))
          `)
          if (!ips.value.includes(ip.value)) {
            ip.value = ips.value[0]
          }
        })

        ctx.lib.vue.watch([expire, ip], async ([expire, ip]) => {
          link.value = ''
          const currentFile = ctx.store.state.currentFile
          if (!currentFile) {
            return
          }

          if (!expire || !ip) {
            return
          }

          const token = await ctx.api.rpc(`return require('./jwt').getToken({ role: 'guest' }, '${expire}')`)
          const port = location.port || ctx.args.$args().get('port') || '80'
          const url = new URL(`http://${ip}:${port}`)
          url.searchParams.set('mode', 'share-preview')
          url.searchParams.set('token', token)
          url.searchParams.set('init-repo', currentFile.repo)
          url.searchParams.set('init-file', currentFile.path)
          link.value = url.toString()
        }, { immediate: true })

        return () => <div class="share-preview-options-wrapper">
          <div class="share-preview-options">
            <div>
              <div>IP: </div>
              <select v-model={ip.value}>
                {ips.value.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <div>{ctx.i18n.t('share-preview.expire')}: </div>
              <select v-model={expire.value}>
                <option value="2h">2 Hours</option>
                <option value="6h">6 Hours</option>
                <option value="12h">12 Hours</option>
                <option value="1d">1 Day</option>
                <option value="3d">3 Days</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
              </select>
            </div>
          </div>
          <textarea readonly v-model={link.value} onClick={() => ctx.utils.copyText(link.value)} />
        </div>
      }
    })

    async function showOptionsPanel () {
      await ctx.utils.sleep(100)

      if (ctx.setting.getSetting('server.host') !== '0.0.0.0') {
        ctx.ui.useModal().alert({
          title: ctx.i18n.t('status-bar.tool.share-preview'),
          content: ctx.i18n.t('share-preview.tips')
        })
        return
      }

      if (await ctx.ui.useModal().confirm({
        title: ctx.i18n.t('status-bar.tool.share-preview'),
        component: panel,
      })) {
        try {
          ctx.utils.copyText(link.value)
        } catch (error: any) {
          console.error(error)
          ctx.ui.useToast().show('warning', error.message)
        }
      }
    }

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.push(
        {
          id: 'plugin.share-preview',
          type: 'normal',
          title: ctx.i18n.t('status-bar.tool.share-preview'),
          onClick: () => showOptionsPanel()
        },
      )
    })

    ctx.theme.addStyles(`
      .share-preview-options-wrapper {
        padding: 10px;
      }

      .share-preview-options {
        display: flex;
        justify-content: space-between;
      }

      .share-preview-options > div {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
        justify-content: flex-start;
        width: fit-content;
      }

      .share-preview-options > div > select {
        margin-left: 10px;
      }
    `)
  }
} as Plugin
