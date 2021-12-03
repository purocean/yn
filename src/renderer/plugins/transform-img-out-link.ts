import mime from 'mime-types'
import * as api from '@fe/support/api'
import { encodeMarkdownLink } from '@fe/utils'
import { useToast } from '@fe/support/ui/toast'
import store from '@fe/support/store'
import { CtrlCmd, isCommand, LeftClick, Shift } from '@fe/core/command'
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
    const res = await api.proxyRequest(img.src, { method: 'get', headers })
    const blob = await res.blob()
    const imgFile = new File([blob!], 'file.' + mime.extension(res.headers.get('content-type')!))
    const assetPath = await upload(imgFile, currentFile)
    replacedLink = assetPath
  }

  if (replacedLink) {
    return { oldLink: img.src, replacedLink: encodeMarkdownLink(replacedLink) }
  }

  return null
}

const actionKeydown: BuildInActionName = 'plugin.transform-img-link.all'
const commandClick = 'plugin.transform-img-link.single-by-click'

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

async function handleClick ({ e }: { e: MouseEvent }) {
  const target = e.target as HTMLElement
  if (target.tagName !== 'IMG') {
    return false
  }

  const img = target as HTMLImageElement
  if (isCommand(e, commandClick)) { // download image to local
    const data = await transformImgOutLink(img)
    if (data) {
      replaceValue(data.oldLink, data.replacedLink)
      refreshTree()
    }
  } else {
    return false
  }

  e.stopPropagation()
  e.preventDefault()

  return true
}

export default {
  name: 'transform-img-out-link',
  register: (ctx) => {
    ctx.action.registerAction({
      name: actionKeydown,
      handler: transformAll
    })

    ctx.command.registerCommand({
      id: commandClick,
      keys: [CtrlCmd, Shift, LeftClick],
      handler: null
    })

    ctx.registerHook('VIEW_ELEMENT_CLICK', handleClick)

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.push({
        id: actionKeydown,
        type: 'normal',
        title: ctx.i18n.t('status-bar.tool.convert-img-link'),
        onClick: ctx.action.getActionHandler(actionKeydown)
      })
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
            const data = await transformImgOutLink(el as HTMLImageElement)
            if (data) {
              replaceValue(data.oldLink, data.replacedLink)
              refreshTree()
            }
          }
        })
      }
    })
  }
} as Plugin
