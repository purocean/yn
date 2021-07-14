import TurndownService from 'turndown'
import { getEditor, insert } from '@fe/context/editor'
import type { Plugin } from '@fe/context/plugin'
import { refreshTree } from '@fe/context/tree'
import * as api from '@fe/support/api'
import store from '@fe/support/store'
import { encodeMarkdownLink, fileToBase64URL } from '@fe/utils'

let keys: {[key: string]: boolean} = {}

function recordKeys (e: KeyboardEvent) {
  if (e.type === 'keydown') {
    keys[e.key] = true
  } else {
    keys = {}
  }
}

async function pasteHtml (html: string) {
  const md = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '+' }).turndown(html)
  insert(md)
}

async function pasteImage (file: any, asBase64: boolean) {
  if (asBase64) {
    const uri = await fileToBase64URL(file)
    insert(`![图片](${uri})\n`)
  } else {
    if (!store.state.currentFile) {
      throw new Error('当前未打开文件')
    }

    const { repo, path } = store.state.currentFile
    const { relativePath } = await api.upload(repo, path, file)
    insert(`![图片](${encodeMarkdownLink(relativePath)})\n`)
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
      if (items[i].type.match(/^text\/html$/i)) {
        items[i].getAsString(pasteHtml)
      }
    }

    e.preventDefault()
    e.stopPropagation()
  } else {
    for (let i = 0; i < items.length; i++) {
      const fileType = items[i].type
      if (fileType.match(/^image\/(png|jpg|jpeg|gif)$/i)) {
        const asBase64 = keys.b || keys.B // 粘贴的同时 按下了 B 键，就粘贴 base64 图像
        pasteImage(items[i].getAsFile(), asBase64)
      }
    }
  }
}

export default {
  name: 'editor-paste',
  register: () => {
    window.addEventListener('paste', paste as any, true)
    window.addEventListener('keydown', recordKeys, true)
    window.addEventListener('keyup', recordKeys, true)
  }
} as Plugin
