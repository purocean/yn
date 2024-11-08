import mime from 'mime'
import * as api from '@fe/support/api'
import { encodeMarkdownLink, removeQuery } from '@fe/utils'
import { useToast } from '@fe/support/ui/toast'
import store from '@fe/support/store'
import { replaceValue } from '@fe/services/editor'
import { refreshTree } from '@fe/services/tree'
import { upload } from '@fe/services/base'
import { getViewDom } from '@fe/services/view'
import type { Plugin } from '@fe/context'
import type { BuildInActionName } from '@fe/types'

async function transformImgOutLink (img: HTMLImageElement) {
  const { currentFile } = store.state
  if (!currentFile) {
    return
  }

  const transform = (ximg: HTMLImageElement): Promise<string> => {
    const canvas = document.createElement('canvas')
    canvas.width = ximg.naturalWidth
    canvas.height = ximg.naturalHeight
    canvas.getContext('2d')!.drawImage(ximg, 0, 0)
    return new Promise((resolve, reject) => {
      canvas.toBlob(async blob => {
        try {
          const imgFile = new File([blob!], 'file.png')
          const assetPath = await upload(imgFile, currentFile)
          resolve(assetPath)
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  let replacedLink = ''
  const imgAttrSrc = img.getAttribute('src') || ''
  if (img.src.startsWith('data:')) {
    replacedLink = await transform(img)
  } else if (imgAttrSrc.startsWith('http://') || imgAttrSrc.startsWith('https://')) {
    const headers = JSON.parse(img.getAttribute('headers') || '{}')
    const res = await api.proxyFetch(img.src, { headers })
    const blob = await res.blob()
    const contentType = res.headers.get('content-type') || ''

    if (!contentType.startsWith('image/')) {
      throw new Error('Not an image')
    }

    const ext = mime.getExtension(contentType) || ''
    const imgFile = new File([blob!], 'file.' + ext)
    const name = removeQuery(img.src).split('/').pop() // get file name from url
    const assetPath = await upload(
      imgFile,
      currentFile,
      ext === name?.split('.').pop() ? name : undefined // if ext is not same as file name, use file name
    )
    replacedLink = assetPath
  }

  if (replacedLink) {
    return { oldLink: img.src, replacedLink: encodeMarkdownLink(replacedLink) }
  }

  return null
}

const actionKeydown: BuildInActionName = 'plugin.image-localization.download-all'
const commandClick = 'plugin.image-localization.single-by-click'

async function transformAll () {
  const refView = getViewDom()
  if (!refView) {
    return
  }

  const toast = useToast()

  const result = []
  const imgList = refView.querySelectorAll('img')
  for (let i = 0; i < imgList.length; i++) {
    toast.show('info', `${i + 1}/${imgList.length}`)

    const img = imgList[i]
    const data = await transformImgOutLink(img)
    if (data) {
      result.push(data)
    }
  }
  result.forEach(data => replaceValue(data.oldLink, data.replacedLink))
  refreshTree()
}

export default {
  name: 'image-localization',
  register: (ctx) => {
    ctx.action.registerAction({
      name: actionKeydown,
      handler: transformAll,
      description: ctx.i18n.t('command-desc.plugin_image-localization_all'),
      forUser: true,
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.push(
        {
          id: actionKeydown,
          type: 'normal',
          title: ctx.i18n.t('status-bar.tool.convert-img-link'),
          onClick: ctx.action.getActionHandler(actionKeydown)
        },
      )
    })

    ctx.view.tapContextMenus((items, e) => {
      const el = e.target as HTMLElement

      if (
        el.tagName === 'IMG' &&
        /^https:\/\/|^http:\/\/|^data:/.test(el.getAttribute('src') || '')
      ) {
        items.push({
          id: commandClick,
          type: 'normal',
          label: ctx.i18n.t('status-bar.tool.convert-img-link'),
          onClick: async () => {
            try {
              ctx.ui.useToast().show('info', 'Loading……', 0)
              const data = await transformImgOutLink(el as HTMLImageElement)
              if (data) {
                replaceValue(data.oldLink, data.replacedLink)
                refreshTree()
              }
              ctx.ui.useToast().hide()
            } catch (error: any) {
              ctx.ui.useToast().show('warning', error.message)
            }
          }
        })
      }
    })
  }
} as Plugin
