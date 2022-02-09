import type { Plugin } from '@fe/context'

export default {
  name: 'copy-rendered-content',
  register: (ctx) => {
    const options = ctx.lib.vue.reactive({
      inlineStyle: false,
      inlineLocalImage: false,
      highlightCode: false,
      type: 'rtf' as 'html' | 'rtf',
    })

    const panel = ctx.lib.vue.defineComponent({
      setup () {
        return () => <div class="copy-rendered-content">
          <div>
            <div class="label">{ctx.i18n.t('copy-rendered-content.options')}</div>
            <div>
              <label><input v-model={options.inlineStyle} type="checkbox" /> {ctx.i18n.t('copy-rendered-content.inline-style')} </label>
              <label><input v-model={options.inlineLocalImage} type="checkbox" /> {ctx.i18n.t('copy-rendered-content.inline-image')} </label>
              <label><input v-model={options.highlightCode} type="checkbox" /> {ctx.i18n.t('copy-rendered-content.highlight-code')} </label>
            </div>
          </div>
          <div>
            <div class="label">{ctx.i18n.t('copy-rendered-content.type')}</div>
            <div>
              <label><input v-model={options.type} type="radio" value="rtf" /> {ctx.i18n.t('copy-rendered-content.rtf')}</label>
              <label><input v-model={options.type} type="radio" value="html" /> HTML </label>
            </div>
          </div>
        </div>
      }
    })

    async function copyContent () {
      if (await ctx.ui.useModal().confirm({
        title: ctx.i18n.t('status-bar.tool.copy-content'),
        component: panel,
      })) {
        try {
          const html = await ctx.view.getContentHtml(options)

          if (options.type === 'rtf') {
            await ctx.base.writeToClipboard('text/html', html)
            ctx.ui.useToast().show('info', ctx.i18n.t('copied'))
          } else {
            ctx.utils.copyText(html)
          }
        } catch (error: any) {
          console.error(error)
          ctx.ui.useToast().show('warning', error.message)
        }
      }
    }

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.push(
        { type: 'separator' },
        {
          id: 'plugin.copy-rendered-content.copy-content',
          type: 'normal',
          title: ctx.i18n.t('status-bar.tool.copy-content'),
          onClick: () => copyContent()
        },
      )
    })

    ctx.theme.addStyles(`
      .copy-rendered-content {
        margin-top: 20px;
      }

      .copy-rendered-content > div {
        padding: 4px 12px;
        display: flex;
      }

      .copy-rendered-content > div > div {
        display: flex;
        flex-wrap: wrap;
      }

      .copy-rendered-content .label {
        width: 100px;
        flex: none;
      }

      .copy-rendered-content label {
        margin-left: 12px;
        white-space: nowrap;
        margin-bottom: 8px;
      }
    `)
  }
} as Plugin
