import type * as Monaco from 'monaco-editor'
import MarkdownItEmoji from 'markdown-it-emoji/dist/full.cjs.js'
import emoji from 'markdown-it-emoji/lib/data/full.mjs'
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
    if (!this.ctx.setting.getSetting('editor.complete-emoji')) {
      return { suggestions: [] }
    }

    const line = model.getLineContent(position.lineNumber)
    const cursor = position.column - 1
    const linePrefixText = line.slice(0, cursor)

    // check language id
    if (this.ctx.editor.getLineLanguageId(position.lineNumber, model) !== 'markdown') {
      return { suggestions: [] }
    }

    // Check if the cursor is in a wiki link
    if (linePrefixText.lastIndexOf('[[') > linePrefixText.lastIndexOf(']]')) {
      return { suggestions: [] }
    }

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

    ctx.setting.changeSchema(schema => {
      schema.properties['render.md-emoji'] = {
        defaultValue: true,
        title: 'T_setting-panel.schema.render.md-emoji',
        type: 'boolean',
        format: 'checkbox',
        group: 'render',
        required: true,
      }
      schema.properties['editor.complete-emoji'] = {
        defaultValue: true,
        title: 'T_setting-panel.schema.editor.complete-emoji',
        type: 'boolean',
        format: 'checkbox',
        group: 'editor',
        required: true,
      }
    })

    ctx.registerHook('MARKDOWN_BEFORE_RENDER', ({ md }) => {
      if (ctx.setting.getSetting('render.md-emoji')) {
        md.enable('emoji', true)
      } else {
        md.disable('emoji', true)
      }
    })
  }
} as Plugin
