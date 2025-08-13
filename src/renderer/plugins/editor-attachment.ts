import dayjs from 'dayjs'
import { insert, whenEditorReady } from '@fe/services/editor'
import type { Plugin } from '@fe/context'
import type { BaseDoc } from '@fe/types'
import { encodeMarkdownLink, escapeMd } from '@fe/utils'
import { basename, dirname, isBelongTo, join, normalizeSep, relative } from '@fe/utils/path'
import store from '@fe/support/store'
import * as api from '@fe/support/api'
import { refreshTree } from '@fe/services/tree'
import { upload } from '@fe/services/base'
import { isSameRepo } from '@fe/services/document'
import { useToast } from '@fe/support/ui/toast'
import { DOM_CLASS_NAME } from '@fe/support/args'
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
    insert(`[${dayjs().format('YYYY-MM-DD HH:mm')}] [${escapeMd(file.name)} (${(file.size / 1024).toFixed(2)}KiB)](${encodeMarkdownLink(assetPath)}){.${DOM_CLASS_NAME.MARK_OPEN}}\n`)
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
  for (let path of filePaths) {
    path = normalizeSep(path)
    const filename = basename(path)
    insert(`${useList ? '- ' : ''}[${escapeMd(filename)}](file://${encodeMarkdownLink(path)})\n`)
  }
}

function addDocument (doc?: BaseDoc | null) {
  if (!doc) return

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
    const fileName = doc.name!.replace(/\.[^.]*$/, '')
    insert(`[${fileName}](${encodeMarkdownLink(filePath)})`)
  } else {
    throw new Error('No file opened.')
  }
}

export default {
  name: 'editor-attachment',
  register: (ctx) => {
    const idAddImage = 'plugin.editor.add-image'
    const idAddFile = 'plugin.editor.add-file'
    const idLinkDoc = 'plugin.editor.link-doc'
    const idLinkFile = 'plugin.editor.link-file'

    whenEditorReady().then(({ editor, monaco }) => {
      editor.addAction({
        id: idAddImage,
        contextMenuGroupId: 'modification',
        label: t('add-image'),
        keybindings: [
          monaco.KeyMod.Alt | monaco.KeyCode.KeyI
        ],
        run: () => addAttachment(true),
      })
      editor.addAction({
        id: idAddFile,
        contextMenuGroupId: 'modification',
        label: t('editor.context-menu.add-attachment'),
        keybindings: [
          monaco.KeyMod.Alt | monaco.KeyCode.KeyF
        ],
        run: () => addAttachment(false),
      })
      editor.addAction({
        id: idLinkDoc,
        contextMenuGroupId: 'modification',
        label: t('editor.context-menu.link-doc'),
        keybindings: [
          monaco.KeyMod.Alt | monaco.KeyCode.KeyD
        ],
        run: () => ctx.routines.chooseDocument().then(addDocument),
      })
      editor.addAction({
        id: idLinkFile,
        contextMenuGroupId: 'modification',
        label: t('editor.context-menu.link-file'),
        keybindings: [
          monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF
        ],
        run: () => linkFile(),
      })
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-insert']?.list?.push(
        {
          id: idAddImage,
          type: 'normal',
          title: ctx.i18n.t('add-image'),
          subTitle: ctx.keybinding.getKeysLabel(ctx.editor.lookupKeybindingKeys(idAddImage) || []),
          ellipsis: true,
          onClick: () => addAttachment(true),
        },
        {
          id: idAddFile,
          type: 'normal',
          title: ctx.i18n.t('editor.context-menu.add-attachment'),
          subTitle: ctx.keybinding.getKeysLabel(ctx.editor.lookupKeybindingKeys(idAddFile) || []),
          ellipsis: true,
          onClick: () => addAttachment(false),
        },
        {
          id: idLinkDoc,
          type: 'normal',
          title: ctx.i18n.t('editor.context-menu.link-doc'),
          subTitle: ctx.keybinding.getKeysLabel(ctx.editor.lookupKeybindingKeys(idLinkDoc) || []),
          ellipsis: true,
          onClick: () => ctx.routines.chooseDocument().then(addDocument),
        },
        {
          id: idLinkFile,
          type: 'normal',
          title: ctx.i18n.t('editor.context-menu.link-file'),
          subTitle: ctx.keybinding.getKeysLabel(ctx.editor.lookupKeybindingKeys(idLinkFile) || []),
          ellipsis: true,
          onClick: () => linkFile(),
        },
        { type: 'separator' },
      )
    })
  }
} as Plugin
