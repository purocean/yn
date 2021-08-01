import mime from 'mime-types'
import * as api from '@fe/support/api'
import { encodeMarkdownLink } from '@fe/utils'
import { useToast } from '@fe/support/toast'
import store from '@fe/support/store'
import { CtrlCmd, getKeysLabel, isCommand, LeftClick, Shift } from '@fe/context/shortcut'
import { replaceValue } from '@fe/context/editor'
import { Plugin, Ctx } from '@fe/context/plugin'
import { refreshTree } from '@fe/context/tree'

async function transformImgOutLink (img: HTMLImageElement) {
  const { currentFile } = store.state
  if (!currentFile) {
    return
  }

  const { repo, path } = currentFile

  const transform = (ximg: HTMLImageElement): Promise<string> => {
    const canvas = document.createElement('canvas')
    canvas.width = ximg.naturalWidth
    canvas.height = ximg.naturalHeight
    canvas.getContext('2d')!.drawImage(ximg, 0, 0)
    return new Promise((resolve, reject) => {
      canvas.toBlob(async blob => {
        try {
          const imgFile = new File([blob!], 'file.png')
          const { relativePath } = await api.upload(repo, path, imgFile)
          resolve(relativePath)
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
    const res = await window.fetch(`api/proxy?url=${encodeURIComponent(img.src)}&headers=${img.getAttribute('headers') || ''}`)
    const blob = await res.blob()
    const imgFile = new File([blob!], 'file.' + mime.extension(res.headers.get('content-type')!))
    const { relativePath } = await api.upload(repo, path, imgFile)
    replacedLink = relativePath
  }

  if (replacedLink) {
    return { oldLink: img.src, replacedLink: encodeMarkdownLink(replacedLink) }
  }

  return null
}

const actionKeydown = 'plugin.transform-img-link'
const actionClick = 'plugin.transform-img-link-by-click'
let refView: HTMLElement

async function transformAll () {
  if (!refView) {
    return
  }

  const toast = useToast()

  const result = []
  const imgList = refView.querySelectorAll('img')
  for (let i = 0; i < imgList.length; i++) {
    toast.show('info', `正在转换外链图片 ${i + 1}/${imgList.length}`)

    const img = imgList[i]
    const data = await transformImgOutLink(img)
    if (data) {
      result.push(data)
    }
  }
  result.forEach(data => replaceValue(data.oldLink, data.replacedLink))
  refreshTree()
}

async function handleClick (e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName !== 'IMG') {
    return false
  }

  const img = target as HTMLImageElement
  if (isCommand(e, actionClick)) { // 转换外链图片到本地
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
  register: (ctx: Ctx) => {
    ctx.action.registerAction({
      name: actionKeydown,
      keys: [CtrlCmd, Shift, 'l'],
      handler: transformAll
    })

    ctx.shortcut.registerCommand({
      id: actionClick,
      keys: [CtrlCmd, Shift, LeftClick],
      handler: null
    })

    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', handleClick)
    ctx.registerHook('ON_VIEW_RENDERED', ({ getViewDom }) => {
      refView = getViewDom()
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.push({
        id: actionKeydown,
        type: 'normal',
        title: '转换外链图片',
        subTitle: getKeysLabel(actionKeydown),
        onClick: ctx.action.getActionHandler(actionKeydown)
      })
    })
  }
} as Plugin
