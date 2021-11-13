import { Plugin, Ctx } from '@fe/context'
import { FLAG_DEMO } from '@fe/support/args'

export default {
  name: 'image-hosting-picgo',
  register: (ctx: Ctx) => {
    const logger = ctx.utils.getLogger('plugin.image-hosting-picgo')
    const uploadActionName = 'plugin.image-hosting-picgo.upload'
    const settingKeyUrl = 'plugin.image-hosting-picgo.server-url'
    const settingKeyPaste = 'plugin.image-hosting-picgo.enable-paste-image'

    ctx.setting.tapSchema((schema) => {
      schema.properties[settingKeyUrl] = {
        title: 'T_picgo.setting.api-title',
        description: 'T_picgo.setting.api-desc',
        type: 'string',
        defaultValue: '',
        pattern: '^(http://|https://|$)',
        options: {
          patternmessage: 'T_picgo.setting.api-msg',
          inputAttributes: { placeholder: 'http://127.0.0.1:36677/upload' }
        },
      }

      schema.properties[settingKeyPaste] = {
        title: 'T_picgo.setting.paste-title',
        type: 'boolean',
        format: 'checkbox',
        defaultValue: false,
      }
    })

    ctx.action.registerAction({
      name: uploadActionName,
      handler: async (file: File) => {
        if (FLAG_DEMO) {
          ctx.ui.useToast().show('warning', ctx.i18n.t('demo-tips'))
          return URL.createObjectURL(file)
        }

        const url = ctx.setting.getSettings()[settingKeyUrl]

        if (!url) {
          const msg = ctx.i18n.t('picgo.need-api')
          ctx.ui.useToast().show('warning', msg)
          ctx.setting.showSettingPanel()
          throw new Error(msg)
        }

        ctx.ui.useToast().show('info', ctx.i18n.t('picgo.uploading'))

        logger.debug('upload', url, file)

        const tmpFileName = 'picgo-tmp-file-' + file.name

        try {
          const { data: { path } } = await ctx.api.writeTmpFile(tmpFileName, await ctx.utils.fileToBase64URL(file), true)
          logger.debug('tmp file', path)

          const { result } = await ctx.api.proxyRequest(
            url,
            {
              method: 'post',
              body: JSON.stringify({ list: [path] }),
              headers: { 'Content-Type': 'application/json' }
            },
          ).then(r => r.json())

          if (result.length > 0) {
            return result[0]
          }
        } catch (error) {
          const msg = ctx.i18n.t('picgo.upload-failed')
          ctx.ui.useToast().show('warning', msg)
          throw new Error(msg)
        } finally {
          ctx.api.deleteTmpFile(tmpFileName)
        }
      }
    })

    ctx.registerHook('EDITOR_PASTE_IMAGE', async ({ file }) => {
      if (!ctx.setting.getSettings()[settingKeyPaste]) {
        return false
      }

      await insertImage(file)

      return true
    })

    async function insertImage (file: File) {
      if (!ctx.store.state.currentFile) {
        throw new Error('No file opened.')
      }
      const url = await ctx.action.getActionHandler(uploadActionName)(file)
      ctx.editor.insert(`![Img](${url})\n`)
    }

    function addImage () {
      const input = window.document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.onchange = async () => {
        for (let i = 0; i < input.files!.length; i++) {
          await insertImage(input.files![i])
        }
      }
      input.click()
    }

    const addImageActionId = 'plugin.image-hosting-picgo.add-image'

    ctx.editor.whenEditorReady().then(({ editor }) => {
      editor.addAction({
        id: addImageActionId,
        contextMenuGroupId: 'modification',
        label: ctx.i18n.t('add-image') + ' (PicGo)',
        run: addImage,
      })
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.push({
        id: addImageActionId,
        type: 'normal',
        title: ctx.i18n.t('add-image'),
        subTitle: 'PicGo',
        onClick: addImage
      })
    })
  }
} as Plugin
