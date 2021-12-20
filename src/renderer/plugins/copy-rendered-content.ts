import type { Plugin } from '@fe/context'

export default {
  name: 'copy-rendered-content',
  register: (ctx) => {
    function copyHTML () {
      const html = ctx.view.getContentHtml()
      ctx.utils.copyText(html)
    }

    async function copyRTF () {
      try {
        const html = ctx.view.getContentHtml()
        await ctx.base.writeToClipboard('text/html', html)
        ctx.ui.useToast().show('info', ctx.i18n.t('copied'))
      } catch (error: any) {
        console.error(error)
        ctx.ui.useToast().show('warning', error.message)
      }
    }

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.push(
        {
          id: 'plugin.copy-rendered-content.copy-rtf',
          type: 'normal',
          title: ctx.i18n.t('status-bar.tool.copy-rtf'),
          onClick: copyRTF
        },
        {
          id: 'plugin.copy-rendered-content.copy-html',
          type: 'normal',
          title: ctx.i18n.t('status-bar.tool.copy-html'),
          onClick: copyHTML
        }
      )
    })
  }
} as Plugin
