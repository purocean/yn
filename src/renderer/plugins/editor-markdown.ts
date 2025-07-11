/* eslint-disable no-template-curly-in-string */
import dayjs from 'dayjs'
import { getEditor, getOneIndent, insert, whenEditorReady } from '@fe/services/editor'
import type { Plugin } from '@fe/context'
import { t } from '@fe/services/i18n'
import type { IMarkdownString } from 'monaco-editor'

export default {
  name: 'editor-markdown',
  register: (ctx) => {
    function insertDate () {
      insert(dayjs().format('YYYY-MM-DD'))
    }

    function insertTime () {
      insert(dayjs().format('HH:mm:ss'))
    }

    function revealLineInPreview () {
      const line = getEditor().getPosition()?.lineNumber
      if (line && ctx.doc.isSameFile(ctx.view.getRenderEnv()?.file, ctx.store.state.currentFile)) {
        ctx.view.highlightLine(line, true, 1000)
      }
    }

    function focusEditor () {
      const line = getEditor().getPosition()?.lineNumber
      if (line) {
        ctx.view.disableSyncScrollAwhile(() => {
          getEditor().revealLineInCenter(line)
          getEditor().focus()
        })
      }
    }

    const idInsertTime = 'plugin.editor.insert-time'
    const idInsertDate = 'plugin.editor.insert-date'
    const idRevealLineInPreview = 'plugin.editor.reveal-line-in-preview'
    const idForceInsertNewLine = 'plugin.editor.force-insert-new-line'
    const idForceInsertIndent = 'plugin.editor.force-insert-indent'
    const idRevealCurrentFileInOS = 'plugin.editor.reveal-current-file-in-os'
    const idRefreshCurrentDoc = 'plugin.editor.refresh-current-document'

    whenEditorReady().then(({ editor, monaco }) => {
      const KM = monaco.KeyMod
      const KC = monaco.KeyCode

      editor.addAction({
        id: idInsertDate,
        label: t('editor.context-menu.insert-date'),
        contextMenuGroupId: 'modification',
        keybindings: [
          KM.Shift | KM.Alt | KC.KeyD
        ],
        run: insertDate
      })

      editor.addAction({
        id: idInsertTime,
        label: t('editor.context-menu.insert-time'),
        contextMenuGroupId: 'modification',
        keybindings: [
          KM.Shift | KM.Alt | KC.KeyT
        ],
        run: insertTime
      })

      editor.addAction({
        id: idRevealLineInPreview,
        label: t('editor.context-menu.reveal-line-in-preview'),
        contextMenuGroupId: 'other',
        keybindings: [KM.Alt | KC.KeyL],
        run: revealLineInPreview
      })

      editor.addAction({
        id: idForceInsertNewLine,
        label: t('editor.context-menu.force-insert-new-line'),
        contextMenuGroupId: 'modification',
        keybindings: [KM.Alt | KC.Enter],
        run: () => {
          insert(editor.getModel()!.getEOL())
        }
      })

      editor.addAction({
        id: idForceInsertIndent,
        label: t('editor.context-menu.force-insert-indent'),
        contextMenuGroupId: 'modification',
        keybindings: [KM.Shift | KC.Enter],
        run: () => {
          insert(getOneIndent())
        }
      })

      monaco.editor.addKeybindingRules([
        {
          command: 'editor.action.transformToUppercase',
          keybinding: KM.chord(KM.CtrlCmd | KC.KeyK, KM.CtrlCmd | KC.KeyU),
          when: 'editorTextFocus'
        },
        {
          command: 'editor.action.transformToLowercase',
          keybinding: KM.chord(KM.CtrlCmd | KC.KeyK, KM.CtrlCmd | KC.KeyL),
          when: 'editorTextFocus'
        }
      ])

      editor.onDidCompositionStart(() => {
        ctx.store.state.inComposition = true
      })

      editor.onDidCompositionEnd(() => {
        ctx.store.state.inComposition = false
      })

      const messageContribution: any = editor.getContribution('editor.contrib.messageController')
      editor.onDidAttemptReadOnlyEdit(() => {
        const currentFile = ctx.store.state.currentFile
        const cmdRevealCurrentFile = `command:vs.editor.ICodeEditor:1:${idRevealCurrentFileInOS}`
        const cmdRefreshCurrentDoc = `command:vs.editor.ICodeEditor:1:${idRefreshCurrentDoc}`
        const message =
          ctx.args.FLAG_READONLY
            ? ctx.i18n.t('read-only-mode-desc')
            : !currentFile
                ? ctx.i18n.t('file-status.no-file')
                : currentFile.writeable === false
                  ? {
                    value: ctx.i18n.t('file-readonly-desc', cmdRevealCurrentFile, cmdRefreshCurrentDoc),
                    isTrusted: true,
                  } as IMarkdownString
                  : ctx.i18n.t('can-not-edit-this-file-type')
        messageContribution.showMessage(message, editor.getPosition())
      })

      editor.addAction({
        id: idRevealCurrentFileInOS,
        label: ctx.i18n.t('editor.action-label.reveal-current-file-in-os'),
        run () {
          const filePath = ctx.store.state.currentFile?.absolutePath
          if (filePath) {
            ctx.base.showItemInFolder(filePath)
          }
        }
      })

      editor.addAction({
        id: idRefreshCurrentDoc,
        label: ctx.i18n.t('editor.action-label.refresh-current-document'),
        run () {
          ctx.view.refresh()
        }
      })

      // Add a double-click event to reveal the line in preview
      let lastMouseDownTime = 0
      editor.onMouseDown(() => {
        const currentTime = Date.now()

        if (currentTime - lastMouseDownTime < 300) {
          revealLineInPreview()
        }

        lastMouseDownTime = currentTime
      })
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-insert']?.list?.push(
        {
          id: idInsertTime,
          type: 'normal',
          title: ctx.i18n.t('editor.context-menu.insert-time'),
          subTitle: ctx.keybinding.getKeysLabel(ctx.editor.lookupKeybindingKeys(idInsertTime) || []),
          onClick: insertTime,
        },
        {
          id: idInsertDate,
          type: 'normal',
          title: ctx.i18n.t('editor.context-menu.insert-date'),
          subTitle: ctx.keybinding.getKeysLabel(ctx.editor.lookupKeybindingKeys(idInsertDate) || []),
          onClick: insertDate,
        },
      )
    })

    ctx.action.registerAction({
      name: 'plugin.editor.focus-editor',
      description: ctx.i18n.t('command-desc.plugin_editor_focus-editor'),
      handler: focusEditor,
      forUser: true,
      keys: [ctx.keybinding.Shift, ctx.keybinding.Alt, 'x']
    })
  }
} as Plugin
