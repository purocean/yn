/* eslint-disable no-template-curly-in-string */
import dayjs from 'dayjs'
import { getMonaco, insert, whenEditorReady } from '@fe/context/editor'
import type { Plugin } from '@fe/context/plugin'

function createDependencyProposals (range: any) {
  const monaco = getMonaco()

  return [
    { name: '![]() Image', type: '插入图片', insertText: '![${2:图片}]($1)' },
    { name: '[]() Link', type: '插入链接', insertText: '[${2:链接}]($1)' },
    { name: '[toc]', type: '目录', insertText: '[toc]{type: "${ul}", level: [1,2,3]}' },
    { name: '# Head', type: '一级标题', insertText: '# $1' },
    { name: '## Head', type: '二级标题', insertText: '## $1' },
    { name: '### Head', type: '三级标题', insertText: '### $1' },
    { name: '#### Head', type: '四级标题', insertText: '#### $1' },
    { name: '##### Head', type: '五级标题', insertText: '##### $1' },
    { name: '###### Head', type: '六级标题', insertText: '###### $1' },
    { name: '+ List', type: '无序列表', insertText: '+ ' },
    { name: '- List', type: '无序列表', insertText: '- ' },
    { name: '+ [ ] TODO List', type: '待办列表', insertText: '+ [ ] ' },
    { name: '- [ ] TODO List', type: '待办列表', insertText: '- [ ] ' },
    { name: '+ MindMap', type: '脑图', insertText: '+ ${1:中心主题}{.mindmap}\n    + ${2:子主题}' },
    { name: '- MindMap', type: '脑图', insertText: '- ${1:中心主题}{.mindmap}\n    - ${2:子主题}' },
    { name: '` Code', type: '代码', insertText: '`$1`' },
    { name: '* Italic', type: '斜体', insertText: '*$1*' },
    { name: '_ Italic', type: '斜体', insertText: '_$1_' },
    { name: '** Bold', type: '加粗', insertText: '**$1**' },
    { name: '__ Bold', type: '加粗', insertText: '__$1__' },
    { name: '~~ Delete', type: '删除线', insertText: '~~$1~~' },
    { name: '$ Inline KaTeX', type: '行内公式', insertText: '$$1$' },
    { name: '$$ Block KaTeX', type: '块公式', insertText: '$$$1$$\n' },
    { name: '``` Code', type: '代码块', insertText: '```$1\n```\n' },
    { name: '``` Run Code', type: '运行代码块', insertText: '```js\n// --run--\n${1:await new Promise(r => setTimeout(r, 500))\nctx.ui.useToast().show("info", "HELLOWORLD!")\nconsole.log("hello world!")}\n```\n' },
    { name: '``` Applet', type: 'HTML 小工具', insertText: '```html\n<!-- --applet-- ${1:DEMO} -->\n<button onclick="ctx.ui.useToast().show(`info`, `HELLOWORLD!`)">TEST</button>\n```\n' },
    { name: '``` Drawio', type: 'Drawio 图形', insertText: '```xml\n<!-- --drawio-- -->\n${1:<!-- mxfile -->}\n```\n' },
    { name: '[]() Drawio Link', type: 'Drawio 图形链接', insertText: '[${2:链接}]($1){link-type="drawio"}' },
    { name: '[]() Luckysheet Link', type: 'Luckysheet 链接', insertText: '[${2:链接}]($1){link-type="luckysheet"}' },
    { name: '```mermaid Mermaid', type: 'Mermaid 图形', insertText: '```mermaid\ngraph LR\n${1:A[Hard] -->|Text| B(Round)}\n```\n' },
    { name: '@startuml Plantuml', type: 'Plantuml 图形', insertText: '@startuml\n${1:a -> b}\n@enduml\n' },
  ].map(x => ({
    label: { name: x.name, type: x.type },
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
        label: '插入当前日期',
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
        label: '插入当前时间',
        contextMenuGroupId: 'modification',
        keybindings: [
          KM.Shift | KM.Alt | KC.KEY_T
        ],
        run: () => {
          insert(dayjs().format('HH:mm:ss'))
        }
      })

      editor.addCommand(KM.CtrlCmd | KC.Enter, () => {
        insert(editor.getModel()!.getEOL())
      })

      editor.addCommand(KM.Shift | KC.Enter, () => {
        // getOneIndent 接口被移除了 https://github.com/microsoft/monaco-editor/issues/1565
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
