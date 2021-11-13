/* eslint-disable no-template-curly-in-string */
import dayjs from 'dayjs'
import { getMonaco, insert, whenEditorReady } from '@fe/services/editor'
import type { Plugin } from '@fe/context'
import { t } from '@fe/services/i18n'

function createDependencyProposals (range: any) {
  const monaco = getMonaco()

  return [
    { name: '![]() Image', insertText: '![${2:Img}]($1)' },
    { name: '[]() Link', insertText: '[${2:Link}]($1)' },
    { name: '[toc]', insertText: '[toc]{type: "${ul}", level: [1,2,3]}' },
    { name: '# Head', insertText: '# $1' },
    { name: '## Head', insertText: '## $1' },
    { name: '### Head', insertText: '### $1' },
    { name: '#### Head', insertText: '#### $1' },
    { name: '##### Head', insertText: '##### $1' },
    { name: '###### Head', insertText: '###### $1' },
    { name: '+ List', insertText: '+ ' },
    { name: '- List', insertText: '- ' },
    { name: '+ [ ] TODO List', insertText: '+ [ ] ' },
    { name: '- [ ] TODO List', insertText: '- [ ] ' },
    { name: '+ MindMap', insertText: '+ ${1:Subject}{.mindmap}\n    + ${2:Topic}' },
    { name: '` Code', insertText: '`$1`' },
    { name: '* Italic', insertText: '*$1*' },
    { name: '_ Italic', insertText: '_$1_' },
    { name: '** Bold', insertText: '**$1**' },
    { name: '__ Bold', insertText: '__$1__' },
    { name: '~~ Delete', insertText: '~~$1~~' },
    { name: '$ Inline KaTeX', insertText: '$$1$' },
    { name: '$$ Block KaTeX', insertText: '$$$1$$\n' },
    { name: '``` Code', insertText: '```$1\n```\n' },
    { name: '``` Run Code', insertText: '```js\n// --run--\n${1:await new Promise(r => setTimeout(r, 500))\nctx.ui.useToast().show("info", "HELLOWORLD!")\nconsole.log("hello world!")}\n```\n' },
    { name: '``` Applet', insertText: '```html\n<!-- --applet-- ${1:DEMO} -->\n<button onclick="ctx.ui.useToast().show(`info`, `HELLOWORLD!`)">TEST</button>\n```\n' },
    { name: '``` Drawio', insertText: '```xml\n<!-- --drawio-- -->\n${1:<!-- mxfile -->}\n```\n' },
    { name: '[]() Drawio Link', insertText: '[${2:Link}]($1){link-type="drawio"}' },
    { name: '[]() Luckysheet Link', insertText: '[${2:Link}]($1){link-type="luckysheet"}' },
    { name: '```mermaid Mermaid', insertText: '```mermaid\ngraph LR\n${1:A[Hard] -->|Text| B(Round)}\n```\n' },
    { name: '@startuml Plantuml', insertText: '@startuml\n${1:a -> b}\n@enduml\n' },
    { name: '||| Table', insertText: '${1:A} | ${2:B} | ${3:C}\n-- | -- | --\na | b | c' },
  ].map(x => ({
    label: { name: x.name },
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: x.insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range: range
  }))
}

export default {
  name: 'editor-markdown',
  register: () => {
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
        run: () => {
          insert(dayjs().format('YYYY-MM-DD'))
        }
      })

      editor.addAction({
        id: 'plugin.editor.insert-time',
        label: t('editor.context-menu.insert-time'),
        contextMenuGroupId: 'modification',
        keybindings: [
          KM.Shift | KM.Alt | KC.KEY_T
        ],
        run: () => {
          insert(dayjs().format('HH:mm:ss'))
        }
      })

      editor.addCommand(KM.Alt | KC.Enter, () => {
        insert(editor.getModel()!.getEOL())
      })

      editor.addCommand(KM.Shift | KC.Enter, () => {
        // getOneIndent removed https://github.com/microsoft/monaco-editor/issues/1565
        const getOneIndent = () => {
          const options = editor.getModel()!.getOptions()
          return options.insertSpaces ? ' '.repeat(options.tabSize) : '\t'
        }

        insert(getOneIndent())
      })

      editor.addCommand(KM.CtrlCmd | KM.Shift | KC.UpArrow, () => {
        editor.getAction('editor.action.moveLinesUpAction').run()
      })

      editor.addCommand(KM.CtrlCmd | KM.Shift | KC.DownArrow, () => {
        editor.getAction('editor.action.moveLinesDownAction').run()
      })

      editor.addCommand(KM.CtrlCmd | KM.Shift | KC.KEY_D, () => {
        editor.getAction('editor.action.copyLinesDownAction').run()
      })

      editor.addCommand(KM.CtrlCmd | KC.KEY_J, () => {
        editor.getAction('editor.action.joinLines').run()
      })

      editor.addCommand(KM.chord(KM.CtrlCmd | KC.KEY_K, KM.CtrlCmd | KC.KEY_U), () => {
        editor.getAction('editor.action.transformToUppercase').run()
      })

      editor.addCommand(KM.chord(KM.CtrlCmd | KC.KEY_K, KM.CtrlCmd | KC.KEY_L), () => {
        editor.getAction('editor.action.transformToLowercase').run()
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
  }
} as Plugin
