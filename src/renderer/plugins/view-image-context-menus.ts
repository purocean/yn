import type { Plugin } from '@fe/context'

export default {
  name: 'view-image-context-menus',
  register: (ctx) => {
    ctx.view.tapContextMenus((menus, e) => {
      const target = e.target as HTMLImageElement
      if (target.tagName !== 'IMG') {
        return
      }

      const isLocalImage = !!target.getAttribute(ctx.args.DOM_ATTR_NAME.LOCAL_IMAGE)
      const repo = target.getAttribute(ctx.args.DOM_ATTR_NAME.TARGET_REPO)
      const path = target.getAttribute(ctx.args.DOM_ATTR_NAME.TARGET_PATH)
      const originSrc = target.getAttribute(ctx.args.DOM_ATTR_NAME.ORIGIN_SRC)

      if (ctx.env.isElectron || isLocalImage) {
        menus.push({
          id: 'view-image-context-menus-copy-image',
          label: ctx.i18n.t('view-context-menu.copy-image'),
          type: 'normal',
          onClick: () => {
            if (ctx.env.isElectron) {
              setTimeout(() => {
                ctx.view.getRenderIframe().then((iframe) => {
                  const iframeRect = iframe.getBoundingClientRect()
                  const mouseX = Math.round(iframeRect.left + e.clientX)
                  const mouseY = Math.round(iframeRect.top + e.clientY)
                  const remote = ctx.env.getElectronRemote()
                  remote.getCurrentWebContents().copyImageAt(mouseX, mouseY)
                  console.log('xxx', [e.pageX, e.pageY], { mouseX, mouseY })
                })
              }, 500)
            } else {
              window.fetch(target.src).then(async (res) => {
                const blob = await res.blob()
                const reader = new FileReader()
                reader.onload = () => {
                  const dataUrl = reader.result as string
                  const img = new Image()
                  img.src = dataUrl
                  img.onload = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = img.width
                    canvas.height = img.height
                    const ctx = canvas.getContext('2d')!
                    ctx.drawImage(img, 0, 0)
                    canvas.toBlob((blob) => {
                      if (blob) {
                        navigator.clipboard.write([
                          new ClipboardItem({
                            'image/png': blob
                          })
                        ])
                      }
                    })
                  }
                }
                reader.readAsDataURL(blob)
              })
            }
          }
        })
      }

      if (repo === ctx.args.HELP_REPO_NAME) {
        return
      }

      if (isLocalImage && repo && path && originSrc) {
        menus.push(
          {
            id: 'view-image-context-menus-open-in-new-tab',
            label: ctx.i18n.t('view-context-menu.open-in-new-tab'),
            type: 'normal',
            onClick: () => {
              ctx.doc.switchDoc({ repo, path, type: 'file', name: ctx.utils.path.basename(path) })
            }
          },
          { type: 'separator' },
          {
            id: 'view-image-context-menus-delete-image',
            label: ctx.i18n.t('view-context-menu.delete-image'),
            ellipsis: true,
            type: 'normal',
            onClick: async () => {
              await ctx.doc.deleteDoc({ repo, path })
              ctx.editor.replaceValue(
                new RegExp(`!\\[[^\\]]*\\]\\(${ctx.lib.lodash.escapeRegExp(originSrc)}[^\\)\\]]*\\)`, 'g'),
                ''
              )
            }
          },
          { type: 'separator' },
          {
            id: 'view-image-context-menu-reveal-in-os',
            label: ctx.i18n.t('tree.context-menu.reveal-in-os'),
            type: 'normal',
            onClick: () => ctx.doc.openInOS({ repo, path }, true)
          },
          {
            id: 'view-image-context-menu-open-in-os',
            label: ctx.i18n.t('tree.context-menu.open-in-os'),
            type: 'normal',
            onClick: () => ctx.doc.openInOS({ repo, path })
          },
          { type: 'separator' },
        )
      }
    })
  }
} as Plugin
