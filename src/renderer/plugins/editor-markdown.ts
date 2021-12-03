/* eslint-disable no-template-curly-in-string */
import dayjs from 'dayjs'
import type { Position } from 'monaco-editor'
import { getEditor, getLineContent, getMonaco, getOneIndent, insert, replaceLine, whenEditorReady } from '@fe/services/editor'
import type { Plugin } from '@fe/context'
import { t } from '@fe/services/i18n'

function createDependencyProposals (range: any) {
  const monaco = getMonaco()

  return [
    { name: '![]() Image', insertText: '![${2:Img}]($1)' },
    { name: '[]() Link', insertText: '[${2:Link}]($1)' },
    { name: '# Head', insertText: '# $1' },
    { name: '## Head', insertText: '## $1' },
    { name: '### Head', insertText: '### $1' },
    { name: '#### Head', insertText: '#### $1' },
    { name: '##### Head', insertText: '##### $1' },
    { name: '###### Head', insertText: '###### $1' },
    { name: '+ List', insertText: '+ ' },
    { name: '- List', insertText: '- ' },
    { name: '` Code', insertText: '`$1`' },
    { name: '* Italic', insertText: '*$1*' },
    { name: '_ Italic', insertText: '_$1_' },
    { name: '** Bold', insertText: '**$1**' },
    { name: '__ Bold', insertText: '__$1__' },
    { name: '~~ Delete', insertText: '~~$1~~' },
    { name: '+ [ ] TODO List', insertText: '+ [ ] ' },
    { name: '- [ ] TODO List', insertText: '- [ ] ' },
    { name: '```', insertText: '```$1\n```\n' },
    { name: '[toc]', insertText: '[toc]{type: "${ul}", level: [1,2,3]}' },
    { name: '+ MindMap', insertText: '+ ${1:Subject}{.mindmap}\n    + ${2:Topic}' },
    { name: '$ Inline KaTeX', insertText: '$$1$' },
    { name: '$$ Block KaTeX', insertText: '$$$1$$\n' },
    { name: '``` ECharts', insertText: '```js\n// --echarts-- \nchart => chart.setOption({\n  xAxis: {\n    type: "category",\n    data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]\n  },\n  yAxis: {\n    type: "value"\n  },\n  series: [\n    {\n      data: [150, 230, 224, 218, 135, 147, 260],\n      type: "line"\n    }\n  ]\n})\n```\n' },
    { name: '``` Run Code', insertText: '```js\n// --run--\n${1:await new Promise(r => setTimeout(r, 500))\nctx.ui.useToast().show("info", "HELLOWORLD!")\nconsole.log("hello world!")}\n```\n' },
    { name: '``` Applet', insertText: '```html\n<!-- --applet-- ${1:DEMO} -->\n<button onclick="ctx.ui.useToast().show(`info`, `HELLOWORLD!`)">TEST</button>\n```\n' },
    { name: '``` Drawio', insertText: '```xml\n<!-- --drawio-- -->\n${1:<!-- mxfile -->}\n```\n' },
    { name: '``` Mermaid', insertText: '```mermaid\ngraph LR\n${1:A[Hard] --> |Text| B(Round)}\n```\n' },
    { name: '@startuml Plantuml', insertText: '@startuml\n${1:a -> b}\n@enduml\n' },
    { name: '[]() Drawio Link', insertText: '[${2:Link}]($1){link-type="drawio"}' },
    { name: '[]() Luckysheet Link', insertText: '[${2:Link}]($1){link-type="luckysheet"}' },
    { name: '||| Table', insertText: '${1:A} | ${2:B} | ${3:C}\n-- | -- | --\na | b | c' },
    { name: '[= Macro', insertText: '[= $1 =]' },
  ].map((x, i) => ({
    label: { name: x.name },
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: x.insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range: range,
    sortText: i.toString()
  }))
}

function processCursorChange (source: string, position: Position) {
  const isTab = source === 'tab'

  if (!isTab) {
    return
  }

  const content = getLineContent(position.lineNumber)
  if (!content) {
    return
  }

  const eolNumber = getEditor().getModel()?.getLineMaxColumn(position.lineNumber)

  if (
    eolNumber === position.column &&
    /\s*(?:[*+-]|\d+\.)/.test(content)
  ) {
    const indent = getOneIndent()
    replaceLine(position.lineNumber, indent + content.trimEnd() + ' ')
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
          KM.Shift | KM.Alt | KC.KEY_D
        ],
        run: insertDate
      })

      editor.addAction({
        id: 'plugin.editor.insert-time',
        label: t('editor.context-menu.insert-time'),
        contextMenuGroupId: 'modification',
        keybindings: [
          KM.Shift | KM.Alt | KC.KEY_T
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

      editor.addCommand(KM.chord(KM.CtrlCmd | KC.KEY_K, KM.CtrlCmd | KC.KEY_U), () => {
        editor.getAction('editor.action.transformToUppercase').run()
      })

      editor.addCommand(KM.chord(KM.CtrlCmd | KC.KEY_K, KM.CtrlCmd | KC.KEY_L), () => {
        editor.getAction('editor.action.transformToLowercase').run()
      })

      editor.onDidCompositionStart(() => {
        ctx.store.commit('setInComposition', true)
      })

      editor.onDidCompositionEnd(() => {
        ctx.store.commit('setInComposition', false)
      })

      monaco.languages.setLanguageConfiguration('markdown', {
        onEnterRules: [
          { beforeText: /^\s*> .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '> ' } },
          { beforeText: /^\s*\+ \[ \] .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '+ [ ] ' } },
          { beforeText: /^\s*- \[ \] .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '- [ ] ' } },
          { beforeText: /^\s*\* \[ \] .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '* [ ] ' } },
          { beforeText: /^\s*\+ \[x\] .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '+ [ ] ' } },
          { beforeText: /^\s*- \[x\] .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '- [ ] ' } },
          { beforeText: /^\s*\* \[x\] .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '* [ ] ' } },
          { beforeText: /^\s*\+ .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '+ ' } },
          { beforeText: /^\s*- .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '- ' } },
          { beforeText: /^\s*\* .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '* ' } },
          { beforeText: /^\s*1. .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '1. ' } }
        ]
      })

      monaco.languages.registerCompletionItemProvider('markdown', {
        triggerCharacters: Array(93).fill(undefined).map((_, i) => String.fromCharCode(i + 33)).concat(['~']),
        provideCompletionItems: (model, position) => {
          const lineContent = model.getLineContent(position.lineNumber)
          let startColumn = lineContent.substring(0, position.column).lastIndexOf(' ') + 1
          if (startColumn === position.column) {
            startColumn = 0
          }

          let endColumn = lineContent.substring(position.column - 1).indexOf(' ') + position.column
          if (endColumn < position.column) {
            endColumn = lineContent.length + 1
          }

          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: startColumn + 1,
            endColumn: endColumn
          }

          return {
            suggestions: createDependencyProposals(range)
          }
        }
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
