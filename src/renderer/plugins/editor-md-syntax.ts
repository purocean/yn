/* eslint-disable no-template-curly-in-string */
import type * as Monaco from 'monaco-editor'
import type { Ctx, Plugin } from '@fe/context'

const surroundingPairs = [
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
]

class MdSyntaxCompletionProvider implements Monaco.languages.CompletionItemProvider {
  triggerCharacters = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'.split('')

  private readonly monaco: typeof Monaco
  private readonly ctx: Ctx

  private readonly list = [
    { name: '/ ![]() Image', insertText: '![${2:Img}]($1)' },
    { name: '/ []() Link', insertText: '[${2:Link}]($1)' },
    { name: '/ # Head 1', insertText: '# $1' },
    { name: '/ ## Head 2', insertText: '## $1' },
    { name: '/ ### Head 3', insertText: '### $1' },
    { name: '/ #### Head 4', insertText: '#### $1' },
    { name: '/ ##### Head 5', insertText: '##### $1' },
    { name: '/ ###### Head 6', insertText: '###### $1' },
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
    { name: '/ [toc]', insertText: '[toc]{type: "${1|ul,ol|}", level: [2,3]}' },
    { name: '/ + MindMap', insertText: '+ ${1:Subject}{.mindmap}\n    + ${2:Topic}' },
    { name: '/ $ Inline KaTeX', insertText: '$$1$' },
    { name: '/ $$ Block KaTeX', insertText: '$$$1$$\n' },
    { name: '/ ``` ECharts', insertText: '```js\n// --echarts-- \nchart => chart.setOption({\n  xAxis: {\n    type: "category",\n    data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]\n  },\n  yAxis: {\n    type: "value"\n  },\n  series: [\n    {\n      data: [150, 230, 224, 218, 135, 147, 260],\n      type: "line"\n    }\n  ]\n}, true)\n```\n' },
    { name: '/ ``` Run Code', insertText: '```js\n// --run--\n${1:await new Promise(r => setTimeout(r, 500))\nctx.ui.useToast().show("info", "HELLOWORLD!")\nconsole.log("hello world!")}\n```\n' },
    { name: '/ ``` Applet', insertText: '```html\n<!-- --applet-- ${1:DEMO} -->\n<button onclick="ctx.ui.useToast().show(`info`, `HELLOWORLD!`)">TEST</button>\n```\n' },
    { name: '/ ``` Mermaid', insertText: '```mermaid\ngraph LR\n${1:A[Hard] --> |Text| B(Round)}\n```\n' },
    { name: '/ @startuml PlantUML', insertText: '@startuml\n${1:a -> b}\n@enduml\n' },
    { name: '/ []() Drawio Link', insertText: '[${2:Drawio}]($1){link-type="drawio"}' },
    { name: '/ []() Luckysheet Link', insertText: '[${2:Luckysheet}]($1){link-type="luckysheet"}' },
    { name: '/ ||| Table', insertText: '| ${1:--} | ${2:--} | ${3:--} |\n| -- | -- | -- |\n| -- | -- | -- |' },
    { name: '/ ||| Small Table', insertText: '| ${1:--} | ${2:--} | ${3:--} |\n| -- | -- | -- |\n| -- | -- | -- |\n{.small}' },
    { name: '/ [= Macro', insertText: '[= ${1:1+1} =]' },
    { name: '/ --- Horizontal Line', insertText: '---\n' },
    { name: '/ --- Front Matter', insertText: '---\nheadingNumber: true\nenableMacro: true\nmdOptions: { linkify: true, breaks: true }\ndefine:\n    APP_NAME: Yank Note\n---\n' },
    { name: '/ ::: Container', insertText: '${1|:::,::::,:::::|} ${2|tip,warning,danger,details,group,group-item|} ${3:Title}\n${4:Content}\n${1|:::,::::,:::::|}\n' },
    { name: '/ ::: Group Container', insertText: ':::: group ${1:Title}\n::: group-item Tab 1\ntest 1\n:::\n::: group-item *Tab 2\ntest 2\n:::\n::: group-item Tab 3\ntest 3\n:::\n::::\n' },
  ]

  private readonly pairsMap = new Map(surroundingPairs.map(x => [x.open, x.close]))

  constructor (monaco: typeof Monaco, ctx: Ctx) {
    this.monaco = monaco
    this.ctx = ctx
  }

  public async provideCompletionItems (model: Monaco.editor.IModel, position: Monaco.Position): Promise<Monaco.languages.CompletionList | undefined> {
    const line = model.getLineContent(position.lineNumber)
    const cursor = position.column - 1
    const linePrefixText = line.slice(0, cursor)

    let startColumn = linePrefixText.lastIndexOf(' ') + 1
    if (startColumn === position.column) {
      startColumn = 0
    }

    const range = new this.monaco.Range(
      position.lineNumber,
      startColumn,
      position.lineNumber,
      // remove auto surrounding pairs
      this.pairsMap.get(line.charAt(cursor - 1)) === line.charAt(cursor)
        ? position.column + 1
        : position.column,
    )

    const result: Monaco.languages.CompletionItem[] = this.list.map((item, i) => (
      {
        label: { label: item.name },
        kind: this.monaco.languages.CompletionItemKind.Keyword,
        insertText: item.insertText,
        insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        sortText: i.toString().padStart(7),
      }
    ))

    return { suggestions: result }
  }
}

export default {
  name: 'editor-md-syntax',
  register: (ctx) => {
    ctx.editor.whenEditorReady().then(({ monaco }) => {
      monaco.languages.registerCompletionItemProvider(
        'markdown',
        new MdSyntaxCompletionProvider(monaco, ctx)
      )

      monaco.languages.setLanguageConfiguration('markdown', {
        surroundingPairs,
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
          { beforeText: /^\s*\d+\. .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '1. ' } },
          { beforeText: /^\s*\d+\) .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '1) ' } },
        ]
      })
    })
  }
} as Plugin
