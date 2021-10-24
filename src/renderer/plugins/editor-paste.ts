import TurndownService from 'turndown'
import { getEditor, insert } from '@fe/context/editor'
import { Plugin, triggerHook } from '@fe/context/plugin'
import { refreshTree } from '@fe/context/tree'
import * as api from '@fe/support/api'
import store from '@fe/support/store'
import { encodeMarkdownLink, fileToBase64URL } from '@fe/utils'

const IMAGE_REG = /^image\/(png|jpg|jpeg|gif)$/i
const HTML_REG = /^text\/html$/i

let keys: Record<string, boolean> = {}

function recordKeys (e: KeyboardEvent) {
  if (e.type === 'keydown') {
    keys[e.key] = true
  } else {
    keys = {}
  }
}

async function pasteHtml (html: string) {
  const md = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '+' }).turndown(html)
  insert(md + '\n')
}

async function pasteImage (file: File, asBase64: boolean) {
  if (asBase64) {
    const uri = await fileToBase64URL(file)
    insert(`![图片](${uri})\n`)
  } else {
    if (!store.state.currentFile) {
      throw new Error('当前未打开文件')
    }

    if (!(await triggerHook('ON_PASTE_IMAGE', file))) {
      const { repo, path } = store.state.currentFile
      const { relativePath } = await api.upload(repo, path, file)
      insert(`![图片](${encodeMarkdownLink(relativePath)})\n`)
    }

    refreshTree()
  }
}

function paste (e: ClipboardEvent) {
  if (!getEditor().hasTextFocus()) {
    return
  }

  const items = e.clipboardData!.items
  if (keys.d || keys.D) { // 粘贴 HTML 转为 markdown
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.match(HTML_REG)) {
        items[i].getAsString(pasteHtml)
      }
    }

    e.preventDefault()
    e.stopPropagation()
  } else {
    for (let i = 0; i < items.length; i++) {
      const fileType = items[i].type
      if (fileType.match(IMAGE_REG)) {
        const asBase64 = keys.b || keys.B // 粘贴的同时 按下了 B 键，就粘贴 base64 图像
        pasteImage(items[i].getAsFile()!, asBase64)
      }
    }
  }
}

export default {
  name: 'editor-paste',
  register: (ctx) => {
    window.addEventListener('paste', paste as any, true)
    window.addEventListener('keydown', recordKeys, true)
    window.addEventListener('keyup', recordKeys, true)

    const pasteImageAsBase64ActionId = 'plugin.editor-paste.insert-image-base64'
    const pasteRtfActionId = 'plugin.editor-paste.insert-rtf'

    const getClipboardContent = async (callback: (type: string, getType: (type: string) => Promise<Blob>) => Promise<void>) => {
      const result = await navigator.permissions.query({ name: 'clipboard-read' })

      if (result.state === 'denied') {
        ctx.ui.useToast().show('warning', '请授予剪切板权限')
        return
      }

      const items: any = await (navigator.clipboard as any).read()
      for (const item of items) {
        for (const type of (item.types as string[])) {
          await callback(type, item.getType.bind(item))
        }
      }
    }

    const pasteImageFromClipboard = async (asBase64: boolean) => {
      getClipboardContent(async (type, getType) => {
        const match = type.match(IMAGE_REG)
        if (match) {
          const file = new File([await getType(type)], 'image.' + match[1], { type })
          await pasteImage(file, asBase64)
          const { editor } = await ctx.editor.whenEditorReady()
          editor.focus()
        }
      })
    }

    const pasteRtf = () => {
      getClipboardContent(async (type, getType) => {
        if (type.match(HTML_REG)) {
          const html = await (await getType(type)).text()
          await pasteHtml(html)
          const { editor } = await ctx.editor.whenEditorReady()
          editor.focus()
        }
      })
    }

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.push(
        {
          id: pasteRtfActionId,
          type: 'normal',
          title: '粘贴富文本',
          subTitle: 'Markdown',
          onClick: pasteRtf
        },
        {
          id: pasteImageAsBase64ActionId,
          type: 'normal',
          title: '粘贴图片',
          subTitle: 'Base64',
          onClick: () => {
            pasteImageFromClipboard(true)
          }
        },
      )
    })

    ctx.editor.whenEditorReady().then(({ editor }) => {
      editor.addAction({
        id: 'plugin.editor-paste.insert-image',
        label: '粘贴图片',
        contextMenuGroupId: 'clipboard',
        contextMenuOrder: 1,
        run: async () => {
          pasteImageFromClipboard(false)
        }
      })

      editor.addAction({
        id: pasteImageAsBase64ActionId,
        label: '粘贴图片为 Base64',
        contextMenuGroupId: 'clipboard',
        contextMenuOrder: 2,
        run: () => {
          pasteImageFromClipboard(true)
        }
      })

      editor.addAction({
        id: pasteRtfActionId,
        label: '粘贴富文本为 Markdown',
        contextMenuGroupId: 'clipboard',
        contextMenuOrder: 3,
        run: pasteRtf,
      })
    })
  }
} as Plugin
