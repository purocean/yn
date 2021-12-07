/* eslint-disable no-template-curly-in-string */
import dayjs from 'dayjs'
import type * as Monaco from 'monaco-editor'
import { deleteLine, getEditor, getLineContent, getMonaco, getOneIndent, getValue, insert, replaceLine, whenEditorReady } from '@fe/services/editor'
import type { Plugin } from '@fe/context'
import { t } from '@fe/services/i18n'
import { isKeydown } from '@fe/core/command'

function getWords (content: string) {
  const words = new Set<string>()

  if (content.length > 50000) {
    return words
  }

  const identifier = /[a-zA-Z_]+\w/g

  while (true) {
    if (words.size > 1000) {
      break
    }

    const res = identifier.exec(content)
    if (!res) {
      break
    }

    words.add(res[0])
  }

  return words
}

function createDependencyProposals (range: any, currentWord: string): Monaco.languages.CompletionItem[] {
  const monaco = getMonaco()

  const result: Monaco.languages.CompletionItem[] = [
    { name: '/ ![]() Image', insertText: '![${2:Img}]($1)' },
    { name: '/ []() Link', insertText: '[${2:Link}]($1)' },
    { name: '/ # Head', insertText: '# $1' },
    { name: '/ ## Head', insertText: '## $1' },
    { name: '/ ### Head', insertText: '### $1' },
    { name: '/ #### Head', insertText: '#### $1' },
    { name: '/ ##### Head', insertText: '##### $1' },
    { name: '/ ###### Head', insertText: '###### $1' },
    { name: '/ + List', insertText: '+ ' },
    { name: '/ - List', insertText: '- ' },
    { name: '/ ` Code', insertText: '`$1`' },
    { name: '/ * Italic', insertText: '*$1*' },
    { name: '/ _ Italic', insertText: '_$1_' },
    { name: '/ ~ Sub', insertText: '~$1~' },
    { name: '/ ^ Sup', insertText: '^$1^' },
    { name: '/ ** Bold', insertText: '**$1**' },
    { name: '/ __ Bold', insertText: '__$1__' },
    { name: '/ ~~ Delete', insertText: '~~$1~~' },
    { name: '/ == Mark', insertText: '==$1==' },
    { name: '/ + [ ] TODO List', insertText: '+ [ ] ' },
    { name: '/ - [ ] TODO List', insertText: '- [ ] ' },
    { name: '/ ```', insertText: '```$1\n```\n' },
    { name: '/ [toc]', insertText: '[toc]{type: "${ul}", level: [1,2,3]}' },
    { name: '/ + MindMap', insertText: '+ ${1:Subject}{.mindmap}\n    + ${2:Topic}' },
    { name: '/ $ Inline KaTeX', insertText: '$$1$' },
    { name: '/ $$ Block KaTeX', insertText: '$$$1$$\n' },
    { name: '/ ``` ECharts', insertText: '```js\n// --echarts-- \nchart => chart.setOption({\n  xAxis: {\n    type: "category",\n    data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]\n  },\n  yAxis: {\n    type: "value"\n  },\n  series: [\n    {\n      data: [150, 230, 224, 218, 135, 147, 260],\n      type: "line"\n    }\n  ]\n})\n```\n' },
    { name: '/ ``` Run Code', insertText: '```js\n// --run--\n${1:await new Promise(r => setTimeout(r, 500))\nctx.ui.useToast().show("info", "HELLOWORLD!")\nconsole.log("hello world!")}\n```\n' },
    { name: '/ ``` Applet', insertText: '```html\n<!-- --applet-- ${1:DEMO} -->\n<button onclick="ctx.ui.useToast().show(`info`, `HELLOWORLD!`)">TEST</button>\n```\n' },
    { name: '/ ``` Drawio', insertText: '```xml\n<!-- --drawio-- -->\n${1:<!-- mxfile -->}\n```\n' },
    { name: '/ ``` Mermaid', insertText: '```mermaid\ngraph LR\n${1:A[Hard] --> |Text| B(Round)}\n```\n' },
    { name: '/ @startuml Plantuml', insertText: '@startuml\n${1:a -> b}\n@enduml\n' },
    { name: '/ []() Drawio Link', insertText: '[${2:Link}]($1){link-type="drawio"}' },
    { name: '/ []() Luckysheet Link', insertText: '[${2:Link}]($1){link-type="luckysheet"}' },
    { name: '/ ||| Table', insertText: '${1:A} | ${2:B} | ${3:C}\n-- | -- | --\na | b | c' },
    { name: '/ [= Macro', insertText: '[= ${1:1+1} =]' },
    { name: '/ --- Horizontal Line', insertText: '---\n' },
    { name: '/ --- Front Matter', insertText: '---\nheadingNumber: true\nenableMacro: true\ndefine:\n    APP_NAME: Yank Note\n---\n' },
  ].map((x, i) => ({
    label: { name: x.name },
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: x.insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range: range,
    sortText: i.toString().padStart(3, '0')
  }))

  getWords(getValue()).forEach(word => {
    if (currentWord !== word) {
      result.push({
        label: { name: word },
        kind: monaco.languages.CompletionItemKind.Text,
        insertText: word,
        range: range
      })
    }
  })

  return result
}

function processCursorChange (source: string, position: Monaco.Position) {
  const isEnter = source === 'keyboard' && isKeydown('ENTER')
  const isTab = source === 'tab'
  if (isTab || isEnter) {
    const line = position.lineNumber
    const content = getLineContent(line)
    const prevContent = getLineContent(line - 1)

    // auto increase order list item number
    const reg = /^\s*(\d+)\./
    const match = prevContent.match(reg)
    if (match && reg.test(content)) {
      const num = parseInt(match[0] || '0')
      // only increase above 1
      if (num > 1) {
        replaceLine(line, content.replace(/\d+\./, `${num + 1}.`))
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
      /^\s*(?:[*+-]|\d+\.)/.test(content)
    ) {
      const indent = getOneIndent()
      const val = content.trimEnd()
      const end = /[-+*\].]$/.test(val) ? ' ' : ''
      replaceLine(position.lineNumber, indent + val + end)
    }
  } else if (isEnter) {
    const line = position.lineNumber - 1
    const content = getLineContent(line)
    const prevContent = getLineContent(line - 1)
    if (
      /^\s*(?:[*+-]|\d+\.)/.test(prevContent) && // previous content must a item
      /^\s*(?:[*+-]|\d+\.|[*+-] \[ \])\s*$/.test(content) // current content must a empty item
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
        surroundingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '<', close: '>' },
          { open: '`', close: '`' },
          { open: "'", close: "'" },
          { open: '"', close: '"' },
          { open: '*', close: '*' },
          { open: '_', close: '_' },
          { open: '=', close: '=' },
          { open: '~', close: '~' },
          { open: '^', close: '^' },
          { open: '#', close: '#' },
          { open: '$', close: '$' },
          { open: '《', close: '》' },
          { open: '【', close: '】' },
          { open: '「', close: '」' },
          { open: '（', close: '）' },
          { open: '“', close: '”' },
        ],
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
          { beforeText: /^\s*\d+\. .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '1. ' } }
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

          const word = model.getWordUntilPosition(position)

          return {
            suggestions: createDependencyProposals(range, word.word)
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
