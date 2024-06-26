import type { Plugin } from '@fe/context'

export default {
  name: 'view-image-context-menus',
  register: (ctx) => {
    ctx.view.tapContextMenus((menus, e) => {
      const target = e.target as HTMLImageElement
      if (target.tagName !== 'IMG') {
        return
      }

      if (!ctx.env.isElectron && !target.getAttribute(ctx.args.DOM_ATTR_NAME.LOCAL_IMAGE)) {
        return
      }

      menus.push({
        id: 'view-image-context-menus-copy-image',
        label: '复制图片',
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
    })
  }
} as Plugin
