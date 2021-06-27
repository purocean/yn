import mime from 'mime-types'
import file from '@fe/useful/file'
import { Plugin, Ctx } from '@fe/useful/plugin'
import { CtrlCmd, getActionLabel, isAction, LeftClick, Shift } from '@fe/useful/shortcut'
import { encodeMarkdownLink } from '@fe/useful/utils'
import { useBus } from '@fe/useful/bus'
import env from '@fe/useful/env'
import { useToast } from '@fe/useful/toast'
import store from '@fe/store'

async function transformImgOutLink (img: HTMLImageElement) {
  const { currentFile } = store.state
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
          const { relativePath } = await file.upload(repo, path, imgFile)
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
    const { relativePath } = await file.upload(repo, path, imgFile)
    replacedLink = relativePath
  }

  if (replacedLink) {
    return { oldLink: img.src, replacedLink: encodeMarkdownLink(replacedLink) }
  }

  return null
}

const actionKeydown = 'transform-img-link'
const actionClick = 'transform-img-link-by-click'
let refView: HTMLElement

async function transformAll () {
  if (!refView) {
    return
  }

  const toast = useToast()
  const bus = useBus()

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
  result.forEach(data => bus.emit('editor-replace-value', { search: data.oldLink, replace: data.replacedLink }))
  bus.emit('tree-refresh')
}

async function handleKeydown (e: KeyboardEvent) {
  if (isAction(e, actionKeydown)) {
    e.preventDefault()
    e.stopPropagation()
    transformAll()
  }
}

async function handleClick (e: MouseEvent) {
  const bus = useBus()
  const target = e.target as HTMLElement
  if (target.tagName !== 'IMG') {
    return false
  }

  const img = target as HTMLImageElement
  if (isAction(e, actionClick)) { // 转换外链图片到本地
    const data = await transformImgOutLink(img)
    if (data) {
      bus.emit('tree-refresh')
      bus.emit('editor-replace-value', { search: data.oldLink, replace: data.replacedLink })
    }
  } else {
    env.openAlwaysOnTopWindow(img.src)
  }

  e.stopPropagation()
  e.preventDefault()

  return true
}

export default {
  name: 'transform-img-out-link',
  register: (ctx: Ctx) => {
    ctx.shortcut.addAction(actionKeydown, [CtrlCmd, Shift, 'l'])
    ctx.shortcut.addAction(actionClick, [CtrlCmd, Shift, LeftClick])

    ctx.registerHook('ON_VIEW_KEY_DOWN', handleKeydown)
    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', handleClick )
    ctx.registerHook('ON_VIEW_RENDERED', ({ getViewDom }) => {
      refView = getViewDom()
    })

    ctx.statusBar.tapMenu('status-bar-tool', menu => {
      menu.list?.push({
        id: actionKeydown,
        type: 'normal',
        title: '转换外链图片',
        tips: getActionLabel(actionKeydown),
        onClick: transformAll
      })
      return menu
    })
  }
} as Plugin
