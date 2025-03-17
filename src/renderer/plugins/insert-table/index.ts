import type { Plugin } from '@fe/context'
import InsertTable from './InsertTable.vue'
import { SimpleCompletionItem } from '@fe/services/editor'

export default {
  name: 'insert-table',
  register: ctx => {
    const actionName = 'plugin.insert-table'
    const editorInsertCommand = 'vs.editor.ICodeEditor:1:' + actionName

    function when () {
      return !!(ctx.store.state.currentFile && ctx.doc.isMarkdownFile(ctx.store.state.currentFile))
    }

    function buildTableCompletionItems (): SimpleCompletionItem[] | false {
      if (!when()) {
        return []
      }

      const editor = ctx.editor.getEditor()
      const position = editor.getPosition()
      const prev2Lines = ((position && position.lineNumber > 2) ? ctx.editor.getLinesContent(position.lineNumber - 2, position.lineNumber - 1) : '').split('\n')
      const tableCols = prev2Lines.reduce((acc: number, line: string) => {
        const cols = line.split('|').length
        return acc > 0 ? (acc === cols ? cols : -1) : cols
      }, 0)

      const currentLine = position ? ctx.editor.getLineContent(position.lineNumber) : ''

      let i = 1
      return /\|[^|]+/.test(currentLine) ? false : tableCols > 1
        ? [
            { language: 'markdown', label: '/ ||| Table Row', insertText: prev2Lines[0].replaceAll('\r', '').replace(/[^|]+/g, () => ` \${${i++}:--} `).trim() + '\n', block: true }
          ]
        : [
            { language: 'markdown', label: '/ ||| Table', insertText: '', command: { id: editorInsertCommand, title: ctx.i18n.t('insert-table.insert-table') }, block: true },
          ]
    }

    function canInsertTable () {
      const tableItems = buildTableCompletionItems()
      return Array.isArray(tableItems) && tableItems[0].command?.id === editorInsertCommand
    }

    ctx.editor.whenEditorReady().then(({ editor }) => {
      editor.addAction({
        id: actionName,
        contextMenuGroupId: 'modification',
        label: ctx.i18n.t('insert-table.insert-table'),
        keybindings: [],
        run: () => {
          ctx.action.getActionHandler(actionName)()
        },
      })

      ctx.editor.tapSimpleCompletionItems(items => {
        const tableItems = buildTableCompletionItems()
        if (tableItems === false) {
          return
        }

        items.push(...tableItems)
      })
    })

    function insertTable (params: { rows: number, cols: number, compact: boolean }) {
      ctx.editor.getEditor().focus()

      if (!canInsertTable()) {
        return
      }

      let text = ''

      const position = ctx.editor.getEditor().getPosition()
      const lineNumber = position?.lineNumber
      if (lineNumber && lineNumber > 2) {
        const prevLineIsEmpty = !!(ctx.editor.getLineContent(lineNumber - 1))
        if (prevLineIsEmpty) {
          text += '\n'
        }
      }

      // table head
      for (let i = 0; i < params.cols; i++) {
        text += `| TH_${i + 1} `
      }
      text += '|\n'

      // table separator
      for (let i = 0; i < params.cols; i++) {
        text += '| -- '
      }
      text += '|\n'

      // table body
      for (let i = 0; i < params.rows; i++) {
        for (let j = 0; j < params.cols; j++) {
          text += `| TD_${i + 1}_${j + 1} `
        }
        text += '|\n'
      }

      if (params.compact) {
        text += '{.small}\n'
      }

      ctx.editor.insert(text)
    }

    ctx.action.registerAction({
      name: actionName,
      forUser: true,
      description: ctx.i18n.t('insert-table.insert-table'),
      handler: () => {
        if (canInsertTable()) {
          const params = ctx.lib.vue.ref({ rows: 2, cols: 2, compact: false })

          ctx.ui.useModal().confirm({
            title: ctx.i18n.t('insert-table.insert-table'),
            component: () => ctx.lib.vue.h(InsertTable, {
              onConfirm: () => {
                ctx.ui.useModal().ok()
              },
              onChange: (val: any) => { params.value = val }
            }),
            okText: ctx.i18n.t('insert-table.insert'),
          }).then(val => {
            if (val) {
              insertTable(params.value)
            }
          })
        } else {
          ctx.ui.useToast().show('warning', 'Cannot insert table here')
        }
      },
      when,
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-insert']?.list?.push({
        id: actionName,
        type: 'normal',
        title: ctx.i18n.t('insert-table.insert-table'),
        hidden: !when(),
        onClick: () => {
          ctx.action.getActionHandler(actionName)()
        },
      })
    })
  }
} as Plugin
