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
        title: 'PicGo 接口',
        description: 'PicGo 默认接口地址：http://127.0.0.1:36677/upload',
        type: 'string',
        defaultValue: '',
        pattern: '^(http://|https://|$)',
        options: {
          patternmessage: '必须以 http:// 开头',
          inputAttributes: { placeholder: 'http://127.0.0.1:36677/upload' }
        },
      }

      schema.properties[settingKeyPaste] = {
        title: '粘贴图片使用 PicGo 图床',
        type: 'boolean',
        format: 'checkbox',
        defaultValue: false,
      }
    })

    ctx.action.registerAction({
      name: uploadActionName,
      handler: async (file: File) => {
        if (FLAG_DEMO) {
          ctx.ui.useToast().show('warning', 'DEMO 模式下此功能不可用')
          return URL.createObjectURL(file)
        }

        const url = ctx.setting.getSettings()[settingKeyUrl]

        if (!url) {
          ctx.ui.useToast().show('warning', '请先配置 PicGo 图床接口地址')
          ctx.setting.showSettingPanel()
          throw new Error('未配置 PicGo 图床上传地址')
        }

        ctx.ui.useToast().show('info', '上传中……')

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
          ctx.ui.useToast().show('warning', '上传失败')
          throw new Error('上传失败')
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
        throw new Error('当前未打开文件')
      }
      const url = await ctx.action.getActionHandler(uploadActionName)(file)
      ctx.editor.insert(`![图片](${url})\n`)
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
        label: '添加图片（PicGo）',
        run: addImage,
      })
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.push({
        id: addImageActionId,
        type: 'normal',
        title: '添加图片',
        subTitle: 'PicGo',
        onClick: addImage
      })
    })
  }
} as Plugin
