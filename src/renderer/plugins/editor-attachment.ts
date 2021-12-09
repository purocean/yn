import dayjs from 'dayjs'
import { insert, whenEditorReady } from '@fe/services/editor'
import type { Plugin } from '@fe/context'
import type { Doc } from '@fe/types'
import { encodeMarkdownLink } from '@fe/utils'
import { basename, dirname, isBelongTo, join, relative } from '@fe/utils/path'
import { getActionHandler } from '@fe/core/action'
import store from '@fe/support/store'
import * as api from '@fe/support/api'
import { refreshTree } from '@fe/services/tree'
import { upload } from '@fe/services/base'
import { isSameRepo } from '@fe/services/document'
import { useToast } from '@fe/support/ui/toast'
import { t } from '@fe/services/i18n'

async function uploadFile (file: any, asImage: boolean) {
  if (!store.state.currentFile) {
    throw new Error('No file opened.')
  }

  const filename = file.name
  const assetPath = await upload(file, store.state.currentFile, filename)

  if (asImage) {
    insert(`![Img](${encodeMarkdownLink(assetPath)})\n`)
  } else {
    insert(`[${dayjs().format('YYYY-MM-DD HH:mm')}] [${file.name} (${(file.size / 1024).toFixed(2)}KiB)](${encodeMarkdownLink(assetPath)}){class=open target=_blank}\n`)
  }

  refreshTree()
}

function addAttachment (asImage = false) {
  const input = window.document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.onchange = async () => {
    for (let i = 0; i < input.files!.length; i++) {
      await uploadFile(input.files![i], asImage)
    }
  }
  input.click()
}

async function linkFile () {
  const { filePaths } = await api.choosePath({ properties: ['openFile', 'multiSelections'] })
  const useList = filePaths.length > 1
  for (const path of filePaths) {
    const filename = basename(path).replace(/[[\]]/g, '')
    insert(`${useList ? '- ' : ''}[${filename}](file://${encodeMarkdownLink(path)})\n`)
  }
}

function addDocument (doc: Doc) {
  const file = store.state.currentFile
  if (file) {
    if (!isSameRepo(file, doc)) {
      useToast().show('warning', t('insert-different-repo-doc'))
      return
    }

    const cwd = dirname(file.path)
    const filePath = isBelongTo(cwd, doc.path)
      ? relative(cwd, doc.path)
      : join('/', doc.path)
    const fileName = doc.name.replace(/\.[^.]*$/, '')
    insert(`[${fileName}](${encodeMarkdownLink(filePath)})`)
  } else {
    throw new Error('No file opened.')
  }
}

export default {
  name: 'editor-attachment',
  register: (ctx) => {
    whenEditorReady().then(({ editor, monaco }) => {
      editor.addAction({
        id: 'plugin.editor.add-image',
        contextMenuGroupId: 'modification',
        label: t('add-image'),
        keybindings: [
          monaco.KeyMod.Alt | monaco.KeyCode.KEY_I
        ],
        run: () => addAttachment(true),
      })
      editor.addAction({
        id: 'plugin.editor.add-file',
        contextMenuGroupId: 'modification',
        label: t('editor.context-menu.add-attachment'),
        keybindings: [
          monaco.KeyMod.Alt | monaco.KeyCode.KEY_F
        ],
        run: () => addAttachment(false),
      })
      editor.addAction({
        id: 'plugin.editor.add-document',
        contextMenuGroupId: 'modification',
        label: t('editor.context-menu.add-doc'),
        keybindings: [
          monaco.KeyMod.Alt | monaco.KeyCode.KEY_D
        ],
        run: () => getActionHandler('filter.choose-document')().then(addDocument),
      })
      editor.addAction({
        id: 'plugin.editor.link-file',
        contextMenuGroupId: 'modification',
        label: t('editor.context-menu.link-file'),
        keybindings: [
          monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KEY_F
        ],
        run: () => linkFile(),
      })
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-insert']?.list?.push(
        {
          id: 'plugin.editor.add-image',
          type: 'normal',
          title: ctx.i18n.t('add-image'),
          subTitle: ctx.command.getKeysLabel([ctx.command.Alt, 'i']),
          onClick: () => addAttachment(true),
        },
        {
          id: 'plugin.editor.add-file',
          type: 'normal',
          title: ctx.i18n.t('editor.context-menu.add-attachment'),
          subTitle: ctx.command.getKeysLabel([ctx.command.Alt, 'f']),
          onClick: () => addAttachment(false),
        },
        {
          id: 'plugin.editor.add-document',
          type: 'normal',
          title: ctx.i18n.t('editor.context-menu.add-doc'),
          subTitle: ctx.command.getKeysLabel([ctx.command.Alt, 'd']),
          onClick: () => getActionHandler('filter.choose-document')().then(addDocument),
        },
        {
          id: 'plugin.editor.link-file',
          type: 'normal',
          title: ctx.i18n.t('editor.context-menu.link-file'),
          subTitle: ctx.command.getKeysLabel([ctx.command.Alt, ctx.command.Shift, 'f']),
          onClick: () => linkFile(),
        },
      )
    })
  }
} as Plugin
