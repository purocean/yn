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

  private async provideSelectionCompletionItems (model: Monaco.editor.IModel, selection: Monaco.Selection): Promise<Monaco.languages.CompletionList | undefined> {
    const selectionEndLineMaxColumn = model.getLineMaxColumn(selection.endLineNumber)
    const items = this.ctx.editor.getSimpleCompletionItems().filter(item => {
      if (item.insertText.includes('${TM_SELECTED_TEXT}')) {
        return true
      }

      const surroundSelectionSnippet = typeof item.surroundSelection === 'function'
        ? item.surroundSelection(item.insertText, selection, model)
        : typeof item.surroundSelection === 'string'
          ? item.insertText.replace(item.surroundSelection, '$TM_SELECTED_TEXT')
          : undefined

      if (surroundSelectionSnippet) {
        const allowBlock = selection.startColumn === 1 && selection.endColumn === selectionEndLineMaxColumn
        item.insertText = surroundSelectionSnippet

        if (item.block && !allowBlock) {
          return false
        }

        return true
      }

      return false
    })

    const result: Monaco.languages.CompletionItem[] = items.map((item, i) => {
      const range = new this.monaco.Range(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn,
      )

      return {
        label: { label: item.label },
        kind: item.kind || this.monaco.languages.CompletionItemKind.Keyword,
        insertText: item.insertText,
        insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: this.monaco.Range.spansMultipleLines(range) ? range.collapseToStart() : range,
        sortText: i.toString().padStart(7),
        detail: item.detail,
      }
    })

    return { suggestions: result }
  }

  public async provideCompletionItems (model: Monaco.editor.IModel, position: Monaco.Position): Promise<Monaco.languages.CompletionList | undefined> {
    const selection = this.ctx.editor.getEditor().getSelection()!
    if (!selection.isEmpty()) {
      return this.provideSelectionCompletionItems(model, selection)
    }

    const line = model.getLineContent(position.lineNumber)
    const cursor = position.column - 1
    const linePrefixText = line.slice(0, cursor)
    const lineSuffixText = line.slice(cursor)

    let startColumn = linePrefixText.lastIndexOf(' ') + 2
    if (startColumn === position.column) {
      startColumn = 0
    }

    const items = this.ctx.editor.getSimpleCompletionItems().filter((item) => {
      return !item.block || startColumn === 1
    })

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
        command: item.command,
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
          { beforeText: /^\s*\d+\. .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: { toString: () => ctx.setting.getSetting('editor.ordered-list-completion') === 'off' ? '' : '1. ' } as string } },
          { beforeText: /^\s*\d+\) .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: { toString: () => ctx.setting.getSetting('editor.ordered-list-completion') === 'off' ? '' : '1) ' } as string } },
        ]
      })

      monaco.languages.registerCodeActionProvider('*', {
        provideCodeActions (_model: Monaco.editor.ITextModel, range: Monaco.Range): Monaco.languages.CodeActionList {
          const enabled = ctx.setting.getSetting('editor.enable-trigger-suggest-bulb', true)
          if (!enabled || range.isEmpty() || (range as Monaco.Selection).getDirection?.() === monaco.SelectionDirection.LTR) {
            return { dispose: () => 0, actions: [] }
          }

          const actionTitle = ctx.i18n.t('trigger-suggestions')
          const actionId = 'editor.action.triggerSuggest'

          const actions: Monaco.languages.CodeAction[] = [{
            title: actionTitle,
            command: { id: actionId, title: actionTitle },
            kind: 'refactor',
            diagnostics: [],
            isPreferred: true,
          }]

          return { dispose: () => 0, actions }
        },
      })
    })

    ctx.editor.tapSimpleCompletionItems(items => {
      items.unshift(
        { label: '/ ![]() Image', insertText: '![${2:Img}]($1)' },
        { label: '/ []() Link', insertText: '[${2:Link}]($1)' },
        { label: '/ # Head 1', insertText: '# $1', block: true },
        { label: '/ ## Head 2', insertText: '## $1', block: true },
        { label: '/ ### Head 3', insertText: '### $1', block: true },
        { label: '/ #### Head 4', insertText: '#### $1', block: true },
        { label: '/ ##### Head 5', insertText: '##### $1', block: true },
        { label: '/ ###### Head 6', insertText: '###### $1', block: true },
        { label: '/ + List', insertText: '+ ' },
        { label: '/ - List', insertText: '- ' },
        { label: '/ > Blockquote', insertText: '> ' },
        { label: '/ ` Code', insertText: '`$1`', surroundSelection: '$1', },
        { label: '/ * Italic', insertText: '*$1*', surroundSelection: '$1', },
        { label: '/ _ Italic', insertText: '_$1_', surroundSelection: '$1', },
        { label: '/ ~ Sub', insertText: '~$1~', surroundSelection: '$1', },
        { label: '/ ^ Sup', insertText: '^$1^', surroundSelection: '$1', },
        { label: '/ ** Bold', insertText: '**$1**', surroundSelection: '$1', },
        { label: '/ __ Bold', insertText: '__$1__', surroundSelection: '$1', },
        { label: '/ ~~ Delete', insertText: '~~$1~~', surroundSelection: '$1', },
        { label: '/ == Mark', insertText: '==$1==', surroundSelection: '$1', },
        { label: '/ ``` Fence', insertText: '```$1\n$2\n```\n', block: true, surroundSelection: '$2', },
        { label: '/ --- Horizontal Line', insertText: '---\n', block: true },
        { label: '/ + [ ] TODO List', insertText: '+ [ ] ' },
        { label: '/ - [ ] TODO List', insertText: '- [ ] ' },
      )
    })

    ctx.editor.tapMarkdownMonarchLanguage(mdLanguage => {
      mdLanguage.tokenizer.root.unshift(
        [/^\s*[+\-*] \[[ xX]\]\s/, 'keyword'],
        [/==\S.*?\S?==/, 'keyword'],
        [/(!?\[\[)([^[\]]+)(\]\])/, ['keyword.predefined', 'string', 'keyword.predefined']],
        [/~\S[^~]*\S?~/, 'string'],
        [/\^\S[^^]*\S?\^/, 'string'],
      )
    })
  }
} as Plugin
