/* eslint-disable no-template-curly-in-string */
import type * as Monaco from 'monaco-editor'
import type { Ctx, Plugin } from '@fe/context'
import { language } from 'monaco-editor/esm/vs/basic-languages/markdown/markdown.js'

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
    { name: '/ \\begin KaTeX Environment', insertText: '\\begin{$1}\n\\end{$1}' },
    { name: '/ ``` ECharts', insertText: '```js\n// --echarts-- \nchart => chart.setOption({\n  xAxis: {\n    type: "category",\n    data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]\n  },\n  yAxis: {\n    type: "value"\n  },\n  series: [\n    {\n      data: [150, 230, 224, 218, 135, 147, 260],\n      type: "line"\n    }\n  ]\n}, true)\n```\n' },
    { name: '/ ``` Run Code', insertText: '```js\n// --run--\n${1:await new Promise(r => setTimeout(r, 500))\nctx.ui.useToast().show("info", "HELLOWORLD!")\nconsole.log("hello world!")}\n```\n' },
    { name: '/ ``` Applet', insertText: '```html\n<!-- --applet-- ${1:DEMO} -->\n<button onclick="ctx.ui.useToast().show(`info`, `HELLOWORLD!`)">TEST</button>\n```\n' },
    { name: '/ ``` Mermaid', insertText: '```mermaid\ngraph LR\n${1:A[Hard] --> |Text| B(Round)}\n```\n' },
    { name: '/ @startuml PlantUML', insertText: '@startuml\n${1:a -> b}\n@enduml\n' },
    { name: '/ @startsalt PlantUML Salt', insertText: '@startsalt\n{\n  Just plain text\n  [This is my button]\n  ()  Unchecked radio\n  (X) Checked radio\n  []  Unchecked box\n  [X] Checked box\n  "Enter text here   "\n  ^This is a droplist^\n}\n@endsalt\n' },
    { name: '/ @startmindmap PlantUML Mindmap', insertText: '@startmindmap\n* Debian\n** Ubuntu\n*** Linux Mint\n*** Kubuntu\n*** Lubuntu\n*** KDE Neon\n** LMDE\n** SolydXK\n** SteamOS\n** Raspbian with a very long name\n*** <s>Raspmbc</s> => OSMC\n*** <s>Raspyfi</s> => Volumio\n@endmindmap\n' },
    { name: '/ @startgantt PlantUML Gantt', insertText: '@startgantt\nProject starts 2020-07-01\n[Test prototype] lasts 10 days\n[Prototype completed] happens 2020-07-10\n[Setup assembly line] lasts 12 days\n[Setup assembly line] starts at [Test prototype]\'s end\n@endgantt\n' },
    { name: '/ @startwbs PlantUML Wbs', insertText: '@startwbs\n* Business Process Modelling WBS\n** Launch the project\n*** Complete Stakeholder Research\n*** Initial Implementation Plan\n** Design phase\n*** Model of AsIs Processes Completed\n****< Model of AsIs Processes Completed1\n****> Model of AsIs Processes Completed2\n***< Measure AsIs performance metrics\n***< Identify Quick Wins\n@endwbs\n' },
    { name: '/ @startjson PlantUML Json', insertText: '@startjson\n{\n   "fruit":"Apple",\n   "size":"Large",\n   "color": ["Red", "Green"]\n}\n@endjson\n' },
    { name: '/ @startyaml PlantUML Yaml', insertText: '@startyaml\nfruit: Apple\nsize: Large\ncolor: \n  - Red\n  - Green\n@endyaml\n' },
    { name: '/ []() Drawio Link', insertText: '[${2:Drawio}]($1){link-type="drawio"}' },
    { name: '/ []() Luckysheet Link', insertText: '[${2:Luckysheet}]($1){link-type="luckysheet"}' },
    { name: '/ ||| Table', insertText: '| ${1:TH} | ${2:TH} | ${3:TH} |\n| -- | -- | -- |\n| TD | TD | TD |' },
    { name: '/ ||| Small Table', insertText: '| ${1:TH} | ${2:TH} | ${3:TH} |\n| -- | -- | -- |\n| TD | TD | TD |\n{.small}' },
    { name: '/ [= Macro', insertText: '[= ${1:1+1} =]' },
    { name: '/ --- Horizontal Line', insertText: '---\n' },
    { name: '/ --- Front Matter', insertText: '---\nheadingNumber: true\nwrapCode: true\nenableMacro: true\nmdOptions: { linkify: true, breaks: true }\ndefine:\n    APP_NAME: Yank Note\n---\n' },
    { name: '/ ::: Container', insertText: '${3|:::,::::,:::::|} ${1|tip,warning,danger,details,group,group-item,row,col,section|} ${2:Title}\n${4:Content}\n${3|:::,::::,:::::|}\n' },
    { name: '/ ::: Group Container', insertText: ':::: group ${1:Title}\n::: group-item Tab 1\ntest 1\n:::\n::: group-item *Tab 2\ntest 2\n:::\n::: group-item Tab 3\ntest 3\n:::\n::::\n' },
    { name: '/ ::: Column Container', insertText: ':::: row ${1:Title}\n::: col\ntest 1\n:::\n::: col\ntest 2\n:::\n::::\n' },
  ]

  constructor (monaco: typeof Monaco, ctx: Ctx) {
    this.monaco = monaco
    this.ctx = ctx
  }

  private getRangeColumnOffset (type: 'suffix' | 'prefix', line: string, insertText: string) {
    if (!line || !insertText) {
      return 0
    }

    if (insertText.includes('\n')) {
      return 0
    }

    insertText = insertText.replace(/\$\{[0-9]+:([^}]+)?\}/g, '$1')
      .replace(/\$\[0-9]/g, '')

    const len = Math.min(line.length, insertText.length)

    if (type === 'suffix') {
      for (let i = len; i >= 0; i--) {
        if (line.startsWith(insertText.slice(insertText.length - i))) {
          return i
        }
      }
    } else {
      for (let i = len; i >= 0; i--) {
        if (line.endsWith(insertText.slice(0, i))) {
          return i
        }
      }
    }

    return 0
  }

  public async provideCompletionItems (model: Monaco.editor.IModel, position: Monaco.Position): Promise<Monaco.languages.CompletionList | undefined> {
    const line = model.getLineContent(position.lineNumber)
    const cursor = position.column - 1
    const linePrefixText = line.slice(0, cursor)
    const lineSuffixText = line.slice(cursor)

    let startColumn = linePrefixText.lastIndexOf(' ') + 2
    if (startColumn === position.column) {
      startColumn = 0
    }

    const result: Monaco.languages.CompletionItem[] = this.list.map((item, i) => {
      const range = new this.monaco.Range(
        position.lineNumber,
        startColumn,
        position.lineNumber,
        position.column + this.getRangeColumnOffset('suffix', lineSuffixText, item.insertText)
      )

      return {
        label: { label: item.name },
        kind: this.monaco.languages.CompletionItemKind.Keyword,
        insertText: item.insertText,
        insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        sortText: i.toString().padStart(7),
      }
    })

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

      const md = ctx.lib.lodash.cloneDeep(language)
      md.tokenizer.root.unshift(
        [/^:{3,}.*$/, 'tag'],
        [/==\S.*\S?==/, 'keyword'],
        [/~\S[^~]*\S?~/, 'string'],
        [/\^\S[^^]*\S?\^/, 'string'],
        [/^@@start(uml|salt|mindmap|gantt|wbs|json|yaml)$/, { token: 'string', next: '@plantuml' }],
        [/\[=/, { token: 'keyword', next: '@monacoEnd', nextEmbedded: 'text/javascript' }],
        [/\$\$/, { token: 'tag', next: '@latexBlockEnd', nextEmbedded: 'latex' }],
        [/\$(?=\S)/, { token: 'tag', next: '@latexInlineEnd', nextEmbedded: 'latex' }],
      )

      md.tokenizer.monacoEnd = [
        [/=\]/, { token: 'keyword', next: '@pop', nextEmbedded: '@pop' }]
      ]

      md.tokenizer.plantuml = [
        [/^@@end(uml|salt|mindmap|gantt|wbs|json|yaml)$/, { token: 'string', next: '@pop' }],
        [/.*$/, 'variable.source']
      ]

      md.tokenizer.latexBlockEnd = [
        [/\$\$/, { token: 'tag', next: '@pop', nextEmbedded: '@pop' }],
      ]

      md.tokenizer.latexInlineEnd = [
        [/\$/, { token: 'tag', next: '@pop', nextEmbedded: '@pop' }],
      ]

      monaco.languages.setMonarchTokensProvider('markdown', md)
    })
  }
} as Plugin
