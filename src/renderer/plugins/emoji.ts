import type * as Monaco from 'monaco-editor'
import MarkdownItEmoji from 'markdown-it-emoji'
import emoji from 'markdown-it-emoji/lib/data/full.json'
import type { Ctx, Plugin } from '@fe/context'

const triggerCharacter = ':'

class EmojiCompletionProvider implements Monaco.languages.CompletionItemProvider {
  public readonly triggerCharacters = [triggerCharacter]

  private readonly monaco: typeof Monaco
  private readonly ctx: Ctx

  constructor (monaco: typeof Monaco, ctx: Ctx) {
    this.monaco = monaco
    this.ctx = ctx
  }

  public provideCompletionItems (model: Monaco.editor.IModel, position: Monaco.Position): Monaco.languages.CompletionList {
    const line = model.getLineContent(position.lineNumber)
    const cursor = position.column - 1
    const linePrefixText = line.slice(0, cursor)

    const match = linePrefixText.match(/:[a-zA-Z0-9]*$/)
    if (!match || linePrefixText.charAt(linePrefixText.length - match[0].length - 1) === ':') {
      return { suggestions: [] }
    }

    const startPos = position.delta(0, -match[0].length)

    const result: Monaco.languages.CompletionItem[] = []
    Object.keys(emoji).forEach((key, i) => {
      result.push({
        label: { label: `:${key}:${(emoji as any)[key]}` },
        kind: this.monaco.languages.CompletionItemKind.EnumMember,
        insertText: (emoji as any)[key],
        range: new this.monaco.Range(
          position.lineNumber,
          startPos.column,
          position.lineNumber,
          position.column
        ),
        sortText: i.toString().padStart(7),
      })
    })

    return { suggestions: result }
  }
}

export default {
  name: 'editor-emoji',
  register: (ctx) => {
    ctx.markdown.registerPlugin(md => {
      md.use(MarkdownItEmoji)

      md.renderer.rules.emoji = (token, idx) => {
        return ctx.lib.vue.createVNode(ctx.lib.vue.Text, null, token[idx].content) as any
      }
    })

    ctx.editor.whenEditorReady().then(({ monaco }) => {
      monaco.languages.registerCompletionItemProvider(
        'markdown',
        new EmojiCompletionProvider(monaco, ctx)
      )
    })
  }
} as Plugin
