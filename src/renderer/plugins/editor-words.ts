import type * as Monaco from 'monaco-editor'
import type { Ctx, Plugin } from '@fe/context'

function getWords (content: string) {
  const words = new Set<string>()

  if (content.length > 102400) {
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

    if (res[0].length > 2 && res[0].length < 15) {
      words.add(res[0])
    }
  }

  return words
}

class WordsCompletionProvider implements Monaco.languages.CompletionItemProvider {
  private readonly monaco: typeof Monaco
  private readonly ctx: Ctx

  constructor (monaco: typeof Monaco, ctx: Ctx) {
    this.monaco = monaco
    this.ctx = ctx
  }

  public async provideCompletionItems (model: Monaco.editor.IModel, position: Monaco.Position): Promise<Monaco.languages.CompletionList | undefined> {
    const currentWord = model.getWordUntilPosition(position)
    const result: Monaco.languages.CompletionItem[] = []

    getWords(model.getValue()).forEach((word, i) => {
      if (currentWord.word !== word) {
        result.push({
          label: { label: word },
          kind: this.monaco.languages.CompletionItemKind.Text,
          insertText: word,
          range: new this.monaco.Range(
            position.lineNumber,
            currentWord.startColumn,
            position.lineNumber,
            currentWord.endColumn,
          ),
          sortText: i.toString().padStart(7)
        })
      }
    })

    return { suggestions: result }
  }
}

export default {
  name: 'editor-words',
  register: (ctx) => {
    ctx.editor.whenEditorReady().then(({ monaco }) => {
      monaco.languages.registerCompletionItemProvider(
        'markdown',
        new WordsCompletionProvider(monaco, ctx)
      )
    })
  }
} as Plugin
