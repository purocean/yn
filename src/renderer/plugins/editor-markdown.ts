/* eslint-disable no-template-curly-in-string */
import dayjs from 'dayjs'
import type * as Monaco from 'monaco-editor'
import { deleteLine, getEditor, getLineContent, getOneIndent, insert, replaceLine, whenEditorReady } from '@fe/services/editor'
import type { Plugin } from '@fe/context'
import { t } from '@fe/services/i18n'
import { getSetting } from '@fe/services/setting'
import { isKeydown } from '@fe/core/command'

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
      /^\s*(?:[*+->]|\d+[.)])/.test(content)
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
    const emptyItemReg = /^\s*(?:[*+->]|\d+[.)]|[*+-] \[ \])\s*$/
    if (
      /^\s*(?:[*+->]|\d+[.)])/.test(prevContent) && // previous content must a item
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

    whenEditorReady().then(({ editor, monaco }) => {
      const KM = monaco.KeyMod
      const KC = monaco.KeyCode

      editor.addAction({
        id: 'plugin.editor.insert-date',
        label: t('editor.context-menu.insert-date'),
        contextMenuGroupId: 'modification',
        keybindings: [
          KM.Shift | KM.Alt | KC.KeyD
        ],
        run: insertDate
      })

      editor.addAction({
        id: 'plugin.editor.insert-time',
        label: t('editor.context-menu.insert-time'),
        contextMenuGroupId: 'modification',
        keybindings: [
          KM.Shift | KM.Alt | KC.KeyT
        ],
        run: insertTime
      })

      editor.addCommand(KM.Alt | KC.Enter, () => {
        insert(editor.getModel()!.getEOL())
      })

      editor.addCommand(KM.Shift | KC.Enter, () => {
        insert(getOneIndent())
      })

      editor.onDidChangeCursorPosition(e => {
        processCursorChange(e.source, e.position)
        e.secondaryPositions.forEach(processCursorChange.bind(null, e.source))
      })

      editor.addCommand(KM.chord(KM.CtrlCmd | KC.KeyK, KM.CtrlCmd | KC.KeyU), () => {
        editor.getAction('editor.action.transformToUppercase').run()
      })

      editor.addCommand(KM.chord(KM.CtrlCmd | KC.KeyK, KM.CtrlCmd | KC.KeyL), () => {
        editor.getAction('editor.action.transformToLowercase').run()
      })

      editor.onDidCompositionStart(() => {
        ctx.store.commit('setInComposition', true)
      })

      editor.onDidCompositionEnd(() => {
        ctx.store.commit('setInComposition', false)
      })
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-insert']?.list?.push(
        {
          id: 'plugin.editor.insert-time',
          type: 'normal',
          title: ctx.i18n.t('editor.context-menu.insert-time'),
          subTitle: ctx.command.getKeysLabel([ctx.command.Shift, ctx.command.Alt, 't']),
          onClick: insertTime,
        },
        {
          id: 'plugin.editor.insert-date',
          type: 'normal',
          title: ctx.i18n.t('editor.context-menu.insert-date'),
          subTitle: ctx.command.getKeysLabel([ctx.command.Shift, ctx.command.Alt, 'd']),
          onClick: insertDate,
        },
      )
    })
  }
} as Plugin
