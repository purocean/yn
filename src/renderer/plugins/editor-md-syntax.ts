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
  { open: '〈', close: '〉' },
  { open: '【', close: '】' },
  { open: '「', close: '」' },
  { open: '（', close: '）' },
  { open: '“', close: '”' },
]

const autoClosingPairs = [
  { open: '{', close: '}' },
  { open: '[', close: ']' },
  { open: '(', close: ')' },
  { open: '《', close: '》' },
  { open: '〈', close: '〉' },
  { open: '【', close: '】' },
  { open: '「', close: '」' },
  { open: '（', close: '）' },
  { open: '“', close: '”' },
]

class MdSyntaxCompletionProvider implements Monaco.languages.CompletionItemProvider {
  triggerCharacters = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'.split('')

  private readonly monaco: typeof Monaco
  private readonly ctx: Ctx

  private readonly pairsMap = new Map(surroundingPairs.map(x => [x.open, x.close]))

  constructor (monaco: typeof Monaco, ctx: Ctx) {
    this.monaco = monaco
    this.ctx = ctx
  }

  private getRangeColumnOffset (type: 'suffix' | 'prefix', line: string, insertText: string) {
    if (!line || !insertText) {
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

    const items = this.ctx.editor.getSimpleCompletionItems()

    const result: Monaco.languages.CompletionItem[] = items.map((item, i) => {
      let columnOffset = this.getRangeColumnOffset('suffix', lineSuffixText, item.insertText)
      if (columnOffset === 0) {
        // remove auto surrounding pairs
        columnOffset = this.pairsMap.get(line.charAt(cursor - 1)) === line.charAt(cursor) ? 1 : 0
      }

      const range = new this.monaco.Range(
        position.lineNumber,
        startColumn,
        position.lineNumber,
        position.column + columnOffset,
      )

      return {
        label: { label: item.label },
        kind: item.kind || this.monaco.languages.CompletionItemKind.Keyword,
        insertText: item.insertText,
        insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        sortText: i.toString().padStart(7),
        detail: item.detail,
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
        autoClosingPairs,
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

    ctx.editor.tapSimpleCompletionItems(items => {
      items.unshift(
        { label: '/ ![]() Image', insertText: '![${2:Img}]($1)' },
        { label: '/ []() Link', insertText: '[${2:Link}]($1)' },
        { label: '/ # Head 1', insertText: '# $1' },
        { label: '/ ## Head 2', insertText: '## $1' },
        { label: '/ ### Head 3', insertText: '### $1' },
        { label: '/ #### Head 4', insertText: '#### $1' },
        { label: '/ ##### Head 5', insertText: '##### $1' },
        { label: '/ ###### Head 6', insertText: '###### $1' },
        { label: '/ + List', insertText: '+ ' },
        { label: '/ - List', insertText: '- ' },
        { label: '/ ` Code', insertText: '`$1`' },
        { label: '/ * Italic', insertText: '*$1*' },
        { label: '/ _ Italic', insertText: '_$1_' },
        { label: '/ ~ Sub', insertText: '~$1~' },
        { label: '/ ^ Sup', insertText: '^$1^' },
        { label: '/ ** Bold', insertText: '**$1**' },
        { label: '/ __ Bold', insertText: '__$1__' },
        { label: '/ ~~ Delete', insertText: '~~$1~~' },
        { label: '/ == Mark', insertText: '==$1==' },
        { label: '/ ``` Fence', insertText: '```$1\n$2\n```\n' },
        { label: '/ ||| Table', insertText: '| ${1:TH} | ${2:TH} | ${3:TH} |\n| -- | -- | -- |\n| TD | TD | TD |' },
        { label: '/ ||| Small Table', insertText: '| ${1:TH} | ${2:TH} | ${3:TH} |\n| -- | -- | -- |\n| TD | TD | TD |\n{.small}' },
        { label: '/ --- Horizontal Line', insertText: '---\n' },
        { label: '/ + [ ] TODO List', insertText: '+ [ ] ' },
        { label: '/ - [ ] TODO List', insertText: '- [ ] ' },
      )
    })

    ctx.editor.tapMarkdownMonarchLanguage(mdLanguage => {
      mdLanguage.tokenizer.root.unshift(
        [/==\S.*\S?==/, 'keyword'],
        [/~\S[^~]*\S?~/, 'string'],
        [/\^\S[^^]*\S?\^/, 'string'],
      )
    })
  }
} as Plugin
