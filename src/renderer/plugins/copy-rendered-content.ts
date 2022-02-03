import type { Plugin } from '@fe/context'

export default {
  name: 'copy-rendered-content',
  register: (ctx) => {
    async function copyHTML (inlineStyle: boolean) {
      // TODO copy panel
      const html = await ctx.view.getContentHtml({ inlineStyle, highlightCode: inlineStyle })
      ctx.utils.copyText(html)
    }

    async function copyRTF (inlineStyle: boolean) {
      try {
        const html = await ctx.view.getContentHtml({ inlineStyle })
        await ctx.base.writeToClipboard('text/html', html)
        ctx.ui.useToast().show('info', ctx.i18n.t('copied'))
      } catch (error: any) {
        console.error(error)
        ctx.ui.useToast().show('warning', error.message)
      }
    }

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.push(
        { type: 'separator' },
        {
          id: 'plugin.copy-rendered-content.copy-rtf',
          type: 'normal',
          title: ctx.i18n.t('status-bar.tool.copy-rtf'),
          subTitle: 'Bare',
          onClick: () => copyRTF(false)
        },
        {
          id: 'plugin.copy-rendered-content.copy-rtf',
          type: 'normal',
          title: ctx.i18n.t('status-bar.tool.copy-rtf'),
          subTitle: 'Styled',
          onClick: () => copyRTF(true)
        },
        { type: 'separator' },
        {
          id: 'plugin.copy-rendered-content.copy-html',
          type: 'normal',
          title: ctx.i18n.t('status-bar.tool.copy-html'),
          subTitle: 'Bare',
          onClick: () => copyHTML(false)
        },
        {
          id: 'plugin.copy-rendered-content.copy-html',
          type: 'normal',
          title: ctx.i18n.t('status-bar.tool.copy-html'),
          subTitle: 'Styled',
          onClick: () => copyHTML(true)
        },
      )
    })
  }
} as Plugin
