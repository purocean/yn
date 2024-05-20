import dayjs from 'dayjs'
import TurndownService from 'turndown'
import { gfm } from 'joplin-turndown-plugin-gfm'
import { getEditor, insert } from '@fe/services/editor'
import { Plugin } from '@fe/context'
import { triggerHook } from '@fe/core/hook'
import { refreshTree } from '@fe/services/tree'
import { upload } from '@fe/services/base'
import store from '@fe/support/store'
import { encodeMarkdownLink, fileToBase64URL, path } from '@fe/utils'
import { isKeydown } from '@fe/core/keybinding'

const IMAGE_REG = /^image\/(png|jpg|jpeg|gif)$/i
const HTML_REG = /^text\/html$/i

async function pasteHtml (html: string) {
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '+' })
  td.use(gfm)
  const md = td.turndown(html)
  insert(md + '\n')
}

async function pasteImage (file: File, asBase64: boolean) {
  if (asBase64) {
    const uri = await fileToBase64URL(file)
    insert(`![Img](${uri})\n`)
  } else {
    if (!store.state.currentFile) {
      throw new Error('No file opened.')
    }

    const ext = path.extname(file.name)
    const filename = `img-${dayjs().format('YYYYMMDDHHmmss')}${ext}`

    file = new File([file], filename, { type: file.type })

    if (!(await triggerHook('EDITOR_PASTE_IMAGE', { file }, { breakable: true }))) {
      const assetPath = await upload(file, store.state.currentFile, file.name)
      insert(`![Img](${encodeMarkdownLink(assetPath)})\n`)
    }

    refreshTree()
  }
}

let selectedTextBeforePaste = ''

function paste (e: ClipboardEvent) {
  selectedTextBeforePaste = ''
  const editor = getEditor()
  if (!editor.hasTextFocus()) {
    return
  }

  if (e.clipboardData === null) {
    return
  }

  const items = e.clipboardData.items
  if (isKeydown('D')) { // covert RFT to markdown
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
        e.preventDefault()
        e.stopPropagation()
        const asBase64 = isKeydown('B') // press key b, paste image as base64
        pasteImage(items[i].getAsFile()!, asBase64)
      }
    }
  }

  // normal paste
  // only one selection
  if (editor.getSelections()?.length === 1) {
    const selection = editor.getSelection()
    if (selection && !selection.isEmpty()) {
      selectedTextBeforePaste = editor.getModel()?.getValueInRange(selection) || ''
    }
  }
}

export default {
  name: 'editor-paste',
  register: (ctx) => {
    window.addEventListener('paste', paste as any, true)

    const pasteImageAsBase64ActionId = 'plugin.editor-paste.insert-image-base64'
    const pasteRtfActionId = 'plugin.editor-paste.insert-rt'

    const pasteImageFromClipboard = async (asBase64: boolean) => {
      ctx.base.readFromClipboard(async (type, getType) => {
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
      ctx.base.readFromClipboard(async (type, getType) => {
        if (type.match(HTML_REG)) {
          const html = await (await getType(type)).text()
          await pasteHtml(html)
          const { editor } = await ctx.editor.whenEditorReady()
          editor.focus()
        }
      })
    }

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-insert']?.list?.push(
        {
          id: pasteImageAsBase64ActionId,
          type: 'normal',
          title: ctx.i18n.t('status-bar.insert.paste-img-base64'),
          subTitle: 'Base64',
          onClick: () => {
            pasteImageFromClipboard(true)
          }
        },
        {
          id: pasteRtfActionId,
          type: 'normal',
          title: ctx.i18n.t('status-bar.insert.paste-rt'),
          subTitle: 'Markdown',
          onClick: pasteRtf
        },
        { type: 'separator' },
      )
    })

    ctx.editor.whenEditorReady().then(({ editor }) => {
      editor.addAction({
        id: 'plugin.editor-paste.insert-image',
        label: ctx.i18n.t('editor.context-menu.paste-image'),
        contextMenuGroupId: 'clipboard',
        contextMenuOrder: 1,
        run: async () => {
          pasteImageFromClipboard(false)
        }
      })

      editor.addAction({
        id: pasteImageAsBase64ActionId,
        label: ctx.i18n.t('editor.context-menu.paste-image-as-base64'),
        contextMenuGroupId: 'clipboard',
        contextMenuOrder: 2,
        run: () => {
          pasteImageFromClipboard(true)
        }
      })

      editor.addAction({
        id: pasteRtfActionId,
        label: ctx.i18n.t('editor.context-menu.paste-rt-as-markdown'),
        contextMenuGroupId: 'clipboard',
        contextMenuOrder: 3,
        run: pasteRtf,
      })

      editor.onDidPaste(({ range }) => {
        const model = editor.getModel()
        const languageId = model?.getLanguageId()
        const parsedText = model?.getValueInRange(range) || ''

        // paste link as markdown link
        if (selectedTextBeforePaste && languageId === 'markdown' && !selectedTextBeforePaste.includes('\n')) {
          const isLink = (str: string) => {
            if (!/^https?:\/\//i.test(str)) {
              return false
            }

            try {
              // eslint-disable-next-line no-new
              new URL(str)
              return true
            } catch (_) {
              return false
            }
          }

          const parsedTextIsLink = isLink(parsedText)
          const selectedTextBeforePasteIsLink = isLink(selectedTextBeforePaste)

          // both are link, do nothing
          if (parsedTextIsLink && selectedTextBeforePasteIsLink) {
            return
          }

          // is link
          if (parsedText && parsedTextIsLink) {
            const text = `[${
              selectedTextBeforePaste.replace(/([[\]])/g, '\\$1')
            }](${encodeMarkdownLink(parsedText)})`
            editor.executeEdits('paste', [{ range, text }])
            return
          } else if (selectedTextBeforePasteIsLink) {
            const text = `[${
              parsedText.replace(/([[\]])/g, '\\$1').trim()
            }](${encodeMarkdownLink(selectedTextBeforePaste)})`
            editor.executeEdits('paste', [{ range, text }])
            return
          }
        }

        // paste splitted by tab as table
        if (languageId === 'markdown') {
          const lines = parsedText.replace(/^\n+|\n+$/g, '').split('\n')
          if (lines.length > 2) {
            let rows = []
            for (const line of lines) {
              const columns = line.split('\t')
              if (columns.length >= 2) {
                rows.push(`| ${columns.join(' | ')} |`)
              } else {
                rows = []
                break
              }
            }

            if (rows.length > 1) {
              // add header
              rows.splice(1, 0, rows[0].replace(/[^|]+/g, ' -- '))
              editor.executeEdits('paste', [{ range, text: rows.join('\n') }])
            }
          }
        }

        selectedTextBeforePaste = ''
      })
    })
  }
} as Plugin
