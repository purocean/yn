import type { Plugin } from '@fe/context'
import type Token from 'markdown-it/lib/token'

export default {
  name: 'copy-content',
  register: (ctx) => {
    const options = ctx.lib.vue.reactive({
      type: 'rt' as 'html' | 'rt' | 'markdown',
      inlineLocalImage: false,
      uploadLocalImage: false,
      inlineStyle: true,
      highlightCode: true,
    })

    const panel = ctx.lib.vue.defineComponent({
      setup () {
        ctx.lib.vue.watch(() => ({ ...options }), (val, prev) => {
          if (val.uploadLocalImage && val.inlineLocalImage) {
            if (!prev.uploadLocalImage) {
              options.inlineLocalImage = false
            } else {
              options.uploadLocalImage = false
            }
          }
        })

        return () => <div class="copy-content">
          <div>
            <div class="label">{ctx.i18n.t('copy-content.type')}</div>
            <div>
              <label><input v-model={options.type} type="radio" value="rt" /> {ctx.i18n.t('copy-content.rt')}</label>
              <label><input v-model={options.type} type="radio" value="html" /> HTML </label>
              <label><input v-model={options.type} type="radio" value="markdown" /> Markdown </label>
            </div>
          </div>
          <div>
            <div class="label">{ctx.i18n.t('copy-content.options')}</div>
            <div>
              <label><input v-model={options.inlineLocalImage} type="checkbox" /> {ctx.i18n.t('copy-content.inline-image')} </label>
              <label><input v-model={options.uploadLocalImage} type="checkbox" /> {ctx.i18n.t('copy-content.upload-image')} </label>
              {options.type !== 'markdown' && <label><input v-model={options.inlineStyle} type="checkbox" /> {ctx.i18n.t('copy-content.inline-style')} </label>}
              {options.type !== 'markdown' && <label><input v-model={options.highlightCode} type="checkbox" /> {ctx.i18n.t('copy-content.highlight-code')} </label>}
            </div>
          </div>
        </div>
      }
    })

    async function transformMarkdown () {
      let markdown = ctx.store.state.currentContent
      const tokens = ctx.view.getRenderEnv()?.tokens
      if (!markdown || !tokens) {
        return
      }

      const processImg = async (tokens: Token[]) => {
        for (const token of tokens) {
          if (token.children) {
            await processImg(token.children)
          }

          if (token.tag === 'img' && token.attrGet(ctx.constant.DOM_ATTR_NAME.LOCAL_IMAGE)) {
            const srcAttr = token.attrGet('src')
            const originSrc = token.attrGet(ctx.constant.DOM_ATTR_NAME.ORIGIN_SRC)
            if (srcAttr && originSrc) {
              const res: Response = await ctx.api.fetchHttp(srcAttr)
              const fileName = ctx.utils.path.basename(ctx.utils.removeQuery(originSrc))
              const file = new File(
                [await res.blob()],
                fileName,
                { type: ctx.lib.mime.getType(fileName) || undefined }
              )

              let url: string | undefined
              if (options.inlineLocalImage) {
                url = await ctx.utils.fileToBase64URL(file)
              } else if (options.uploadLocalImage) {
                url = await ctx.action.getActionHandler('plugin.image-hosting-picgo.upload')(file)
              }

              if (url) {
                markdown = markdown.replaceAll(
                  ctx.utils.encodeMarkdownLink(originSrc),
                  ctx.utils.encodeMarkdownLink(url)
                )
              }
            }
          }
        }
      }

      await processImg(tokens)

      return markdown
    }

    async function copyContent () {
      if (await ctx.ui.useModal().confirm({
        title: ctx.i18n.t('status-bar.tool.copy-content'),
        component: panel,
      })) {
        try {
          const startedAt = Date.now()
          ctx.ui.useToast().show('info', ctx.i18n.t('loading'), 10000)
          const content = options.type === 'markdown'
            ? await transformMarkdown()
            : await ctx.view.getContentHtml(options)

          if (Date.now() - startedAt > 3000) {
            await ctx.ui.useModal().alert({ content: ctx.i18n.t('copy-content.complete') })
          }

          if (options.type === 'rt') {
            await ctx.base.writeToClipboard('text/html', content)
            ctx.ui.useToast().show('info', ctx.i18n.t('copied'))
          } else {
            ctx.utils.copyText(content)
          }
        } catch (error: any) {
          console.error(error)
          ctx.ui.useToast().show('warning', error.message)
        }
      }
    }

    const id = 'plugin.copy-content.copy-content'

    ctx.action.registerAction({
      name: id,
      handler: copyContent,
      keys: [ctx.command.CtrlCmd, ctx.command.Shift, 'c'],
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.push(
        {
          id,
          type: 'normal',
          title: ctx.i18n.t('status-bar.tool.copy-content'),
          subTitle: ctx.command.getKeysLabel(id),
          onClick: () => copyContent(),
          order: 100,
        },
      )
    })

    ctx.theme.addStyles(`
      .copy-content {
        margin-top: 20px;
      }

      .copy-content > div {
        padding: 4px 12px;
        display: flex;
      }

      .copy-content > div > div {
        display: flex;
        flex-wrap: wrap;
      }

      .copy-content .label {
        width: 100px;
        flex: none;
      }

      .copy-content label {
        margin-left: 12px;
        white-space: nowrap;
        margin-bottom: 8px;
      }
    `)
  }
} as Plugin
