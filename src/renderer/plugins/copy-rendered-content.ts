import type { Plugin } from '@fe/context'

export default {
  name: 'copy-rendered-content',
  register: (ctx) => {
    async function copy () {
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
      menus['status-bar-tool']?.list?.push({
        id: 'plugin.copy-rendered-content.copy-rtf',
        type: 'normal',
        title: ctx.i18n.t('status-bar.tool.copy-rtf'),
        onClick: copy
      })
    })
  }
} as Plugin
