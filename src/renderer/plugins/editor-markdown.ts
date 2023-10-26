/* eslint-disable no-template-curly-in-string */
import dayjs from 'dayjs'
import type * as Monaco from 'monaco-editor'
import { deleteLine, getEditor, getLineContent, getOneIndent, insert, replaceLine, whenEditorReady } from '@fe/services/editor'
import type { Plugin } from '@fe/context'
import { t } from '@fe/services/i18n'
import { getSetting } from '@fe/services/setting'
import { isKeydown } from '@fe/core/keybinding'

function processCursorChange (source: string, position: Monaco.Position) {
  const isEnter = source === 'keyboard' && isKeydown('ENTER')
  const isTab = source === 'tab'
  if (isTab || isEnter) {
    const line = position.lineNumber
    if (line < 2) {
      return
    }

    const orderedListCompletion = getSetting('editor.ordered-list-completion', 'auto')

    const content = getLineContent(line)
    const prevContent = getLineContent(line - 1)

    // auto increase order list item number
    const reg = /^\s*(\d+)[.)]/
    const match = prevContent.match(reg)
    if (match && reg.test(content)) {
      const num = isTab ? 0 : parseInt(match[0] || '0')
      let newNum = num
      if (orderedListCompletion === 'increase') {
        newNum = num + 1
      } else if (orderedListCompletion === 'one') {
        newNum = 1
      } else {
        if (num > 1 || isTab) {
          newNum = num + 1
        }
      }

      if (num !== newNum) {
        replaceLine(line, content.replace(/\d+/, `${newNum}`))
      }
    }
  }

  if (isTab) {
    const content = getLineContent(position.lineNumber)
    if (!content) {
      return
    }

    const eolNumber = getEditor().getModel()?.getLineMaxColumn(position.lineNumber)

    if (
      eolNumber === position.column &&
      /^\s*(?:[*+\->]|\d+[.)])/.test(content)
    ) {
      const indent = getOneIndent()
      const val = content.trimEnd()
      const end = /[-+*\].>)]$/.test(val) ? ' ' : ''
      replaceLine(position.lineNumber, indent + val + end)
    }
  } else if (isEnter) {
    const line = position.lineNumber - 1
    if (line < 2) {
      return
    }

    const content = getLineContent(line)
    const prevContent = getLineContent(line - 1)
    const nextContent = getLineContent(line + 1)
    const emptyItemReg = /^\s*(?:[*+\->]|\d+[.)]|[*+-] \[ \])\s*$/
    if (
      /^\s*(?:[*+\->]|\d+[.)])/.test(prevContent) && // previous content must a item
      emptyItemReg.test(content) && // current line content must a empty item
      emptyItemReg.test(nextContent) // next line content must a empty item
    ) {
      deleteLine(line) // remove empty item, now the line is the next line.
      replaceLine(line, '') // remove auto completion
    }
  }
}

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

      editor.onDidChangeCursorPosition(e => {
        processCursorChange(e.source, e.position)
        e.secondaryPositions.forEach(processCursorChange.bind(null, e.source))
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
