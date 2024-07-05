// https://github.com/microsoft/vscode/blob/main/extensions%2Fmarkdown-language-features%2Fsrc%2Ffeatures%2FpathCompletions.ts

import type Markdown from 'markdown-it'
import type * as Monaco from 'monaco-editor'
import type { Ctx, Plugin } from '@fe/context'
import type { Components } from '@fe/types'
import type Token from 'markdown-it/lib/token'
import { MARKDOWN_FILE_EXT } from '@share/misc'

enum CompletionContextKind {
  Link, // [...](|)

  WikiLink, // [[|]]

  ReferenceLink, // [...][|]

  LinkDefinition, // []: | // TODO: not implemented
}

interface AnchorContext {
  /**
   * Link text before the `#`.
   *
   * For `[text](xy#z|abc)` this is `xy`.
   */
  readonly beforeAnchor: string;
  /**
   * Text of the anchor before the current position.
   *
   * For `[text](xy#z|abc)` this is `z`.
   */
  readonly anchorPrefix: string;
}

interface CompletionContext {
  readonly kind: CompletionContextKind;

  /**
   * Text of the link before the current position
   *
   * For `[text](xy#z|abc)` this is `xy#z`.
   */
  readonly linkPrefix: string;

  /**
   * Position of the start of the link.
   *
   * For `[text](xy#z|abc)` this is the position before `xy`.
   */
  readonly linkTextStartPosition: Monaco.Position;

  /**
   * Text of the link after the current position.
   *
   * For `[text](xy#z|abc)` this is `abc`.
   */
  readonly linkSuffix: string;

  /**
   * Info if the link looks like it is for an anchor: `[](#header)`
   */
  readonly anchorInfo?: AnchorContext;
}

class CompletionProvider implements Monaco.languages.CompletionItemProvider {
  triggerCharacters = ['/', ':', '#', '[']

  private readonly monaco: typeof Monaco
  private readonly ctx: Ctx
  private readonly markdown: Markdown

  constructor (monaco: typeof Monaco, ctx: Ctx) {
    this.monaco = monaco
    this.ctx = ctx
    // eslint-disable-next-line new-cap
    this.markdown = new ctx.lib.markdownit()
  }

  public async provideCompletionItems (model: Monaco.editor.IModel, position: Monaco.Position): Promise<Monaco.languages.CompletionList | undefined> {
    const context = this.getPathCompletionContext(model, position)
    if (!context) {
      return { suggestions: [] }
    }

    switch (context.kind) {
      case CompletionContextKind.ReferenceLink: {
        return {
          suggestions: Array.from(
            this.provideReferenceSuggestions(this.ctx.view.getRenderEnv()?.source || model.getValue(), position, context)
          )
        }
      }

      case CompletionContextKind.LinkDefinition:
      case CompletionContextKind.WikiLink:
      case CompletionContextKind.Link: {
        const items: Monaco.languages.CompletionItem[] = []

        const isAnchorInCurrentDoc = context.anchorInfo && context.anchorInfo.beforeAnchor.length === 0

        // Add anchor #links in current doc
        if (context.linkPrefix.length === 0 || isAnchorInCurrentDoc) {
          const insertRange = new this.monaco.Range(
            context.linkTextStartPosition.lineNumber,
            context.linkTextStartPosition.column,
            position.lineNumber,
            position.column
          )

          const tokens = this.ctx.view.getRenderEnv()?.tokens || []

          for await (const item of this.provideHeaderSuggestions(tokens, context, position, insertRange)) {
            items.push(item)
          }
        }

        if (!isAnchorInCurrentDoc) {
          if (context.anchorInfo) { // Anchor to a different document
            const currentFile = this.ctx.store.state.currentFile
            if (!currentFile || !context.anchorInfo.beforeAnchor.endsWith(MARKDOWN_FILE_EXT)) {
              return { suggestions: [] }
            }

            const filePath = this.ctx.utils.path.resolve(
              this.ctx.utils.path.dirname(currentFile.path),
              context.anchorInfo.beforeAnchor
            )

            const { content } = await this.ctx.api.readFile({ repo: currentFile.repo, path: filePath })
            if (content) {
              const anchorStartPosition = position.delta(0, -(context.anchorInfo.anchorPrefix.length + 1))
              const range = new this.monaco.Range(
                anchorStartPosition.lineNumber,
                anchorStartPosition.column,
                position.lineNumber,
                position.column,
              )

              for await (const item of this.provideHeaderSuggestions(content, context, position, range)) {
                items.push(item)
              }
            }
          } else { // Normal path suggestions
            for await (const item of this.providePathSuggestions(position, context)) {
              items.push(item)
            }
          }
        }

        return { suggestions: items }
      }
    }
  }

  /// [...](...|
  private readonly linkStartPattern = /\[([^\]]*?)\]\(\s*([^\s()]*)$/

  /// [[...|
  private readonly wikiLinkStartPattern = /\[\[\s*([^[\]]*)$/

  /// [...|
  private readonly referenceLinkStartPattern = /\[\s*([^\s[\]]*)$/

  /// [id]: |
  private readonly definitionPattern = /^\s*\[[\w-]+\]:\s*([^\s]*)$/m

  private readonly defPattern = /^([\t ]*\[(?!\^)((?:\\\]|[^\]])+)\]:\s*)([^<]\S*|<[^>]+>)/gm

  private readonly angleBracketLinkRe = /^<(.*)>$/

  private getPathCompletionContext (model: Monaco.editor.IModel, position: Monaco.Position): CompletionContext | undefined {
    const line = model.getLineContent(position.lineNumber)

    const cursor = position.column - 1
    const linePrefixText = line.slice(0, cursor)
    const lineSuffixText = line.slice(cursor)

    const linkPrefixMatch = linePrefixText.match(this.linkStartPattern)
    if (linkPrefixMatch) {
      const prefix = linkPrefixMatch[2]
      if (this.refLooksLikeUrl(prefix)) {
        return undefined
      }

      const suffix = lineSuffixText.match(/^[^)\s]*/)

      return {
        kind: CompletionContextKind.Link,
        linkPrefix: prefix,
        linkTextStartPosition: position.delta(0, -prefix.length),
        linkSuffix: suffix ? suffix[0] : '',
        anchorInfo: this.getAnchorContext(prefix),
      }
    }

    const wikiLinkPrefixMatch = linePrefixText.match(this.wikiLinkStartPattern)
    if (wikiLinkPrefixMatch) {
      const prefix = wikiLinkPrefixMatch[1]
      const suffix = lineSuffixText.match(/^[^\]]*/)
      return {
        kind: CompletionContextKind.WikiLink,
        linkPrefix: prefix,
        linkTextStartPosition: position.delta(0, -prefix.length),
        linkSuffix: suffix ? suffix[0] : '',
        anchorInfo: this.getAnchorContext(prefix),
      }
    }

    const definitionLinkPrefixMatch = linePrefixText.match(this.definitionPattern)
    if (definitionLinkPrefixMatch) {
      const prefix = definitionLinkPrefixMatch[1]
      if (this.refLooksLikeUrl(prefix)) {
        return undefined
      }

      const suffix = lineSuffixText.match(/^[^\s]*/)
      return {
        kind: CompletionContextKind.LinkDefinition,
        linkPrefix: prefix,
        linkTextStartPosition: position.delta(0, -prefix.length),
        linkSuffix: suffix ? suffix[0] : '',
        anchorInfo: this.getAnchorContext(prefix),
      }
    }

    const referenceLinkPrefixMatch = linePrefixText.match(this.referenceLinkStartPattern)
    if (referenceLinkPrefixMatch) {
      const prefix = referenceLinkPrefixMatch[1]
      const suffix = lineSuffixText.match(/^[^\]\s]*/)
      return {
        kind: CompletionContextKind.ReferenceLink,
        linkPrefix: prefix,
        linkTextStartPosition: position.delta(0, -prefix.length),
        linkSuffix: suffix ? suffix[0] : '',
      }
    }

    return undefined
  }

  /**
   * Check if {@param ref} looks like a 'http:' style url.
   */
  private refLooksLikeUrl (prefix: string): boolean {
    return /^\s*[\w\d-]+:/.test(prefix)
  }

  private getAnchorContext (prefix: string): AnchorContext | undefined {
    const anchorMatch = prefix.match(/^(.*)#([\w\d-]*)$/)
    if (!anchorMatch) {
      return undefined
    }

    let beforeAnchor = anchorMatch[1]

    if (anchorMatch[1] && !this.ctx.utils.path.extname(beforeAnchor)) {
      beforeAnchor += MARKDOWN_FILE_EXT
    }

    return {
      beforeAnchor,
      anchorPrefix: anchorMatch[2],
    }
  }

  private async * providePathSuggestions (position: Monaco.Position, context: CompletionContext): AsyncIterable<Monaco.languages.CompletionItem> {
    let idx = context.linkPrefix.lastIndexOf('/')

    if (context.kind === CompletionContextKind.WikiLink) {
      idx = Math.max(context.linkPrefix.lastIndexOf(':'), idx)
    }

    const valueBeforeLastSlash = context.linkPrefix.substring(0, idx + 1) // keep the last slash

    const currentFile = this.ctx.store.state.currentFile
    if (!currentFile) {
      return
    }

    const basePath = this.ctx.utils.path.dirname(currentFile.path)

    const parentDir = context.kind === CompletionContextKind.WikiLink
      ? this.ctx.utils.path.resolve(basePath, valueBeforeLastSlash.replace(/:/g, '/') || '.')
      : this.ctx.utils.path.resolve(basePath, valueBeforeLastSlash || '.')

    const pathSegmentStart = position.delta(0, valueBeforeLastSlash.length - context.linkPrefix.length)
    const insertRange = new this.monaco.Range(
      pathSegmentStart.lineNumber,
      pathSegmentStart.column,
      position.lineNumber,
      position.column
    )

    const pathSegmentEnd = position.delta(0, context.linkSuffix.length)
    const replacementRange = new this.monaco.Range(
      pathSegmentStart.lineNumber,
      pathSegmentStart.column,
      pathSegmentEnd.lineNumber,
      pathSegmentEnd.column,
    )

    const items = this.getFileList(parentDir)

    let i = 0
    for (const item of items) {
      i++
      const isDir = item.type === 'dir'
      let label = isDir ? item.name + '/' : item.name
      let insertText = this.ctx.utils.encodeMarkdownLink(label)

      // Remove extension for wiki links
      if (context.kind === CompletionContextKind.WikiLink) {
        label = label.replace(/\.(md|markdown)$/, '')
        insertText = label.replaceAll(']', '&#93;').replaceAll('[', '&#91;')
      }

      yield {
        label,
        insertText,
        kind: isDir ? this.monaco.languages.CompletionItemKind.Folder : this.monaco.languages.CompletionItemKind.File,
        range: {
          insert: insertRange,
          replace: replacementRange,
        },
        command: isDir ? { id: 'editor.action.triggerSuggest', title: '' } : undefined,
        sortText: i.toString().padStart(7),
      }
    }
  }

  private getFileList (parentDir: string): Components.Tree.Node[] {
    const result: Components.Tree.Node[] = []

    const traverseTree = (nodes: Components.Tree.Node[]) => {
      nodes.forEach(node => {
        if (node.type === 'dir') {
          if (parentDir.startsWith(node.path)) {
            traverseTree(node.children || [])

            if (node.path === parentDir) {
              result.push(...(node.children || []))
            }
          }
        }
      })
    }

    traverseTree(this.ctx.store.state.tree || [])

    return result
  }

  private async * provideHeaderSuggestions (tokensOrContent: string | Token[], context: CompletionContext, position: Monaco.Position, insertionRange: Monaco.Range): AsyncIterable<Monaco.languages.CompletionItem> {
    const tokens = typeof tokensOrContent === 'string' ? this.markdown.parse(tokensOrContent, []) : tokensOrContent
    const endPos = position.delta(0, context.linkSuffix.length)
    const replacementRange = new this.monaco.Range(
      insertionRange.startLineNumber,
      insertionRange.startColumn,
      endPos.lineNumber,
      endPos.column
    )

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.type === 'heading_open') {
        const nextToken = tokens[i + 1]
        if (nextToken && nextToken.content) {
          const id = nextToken.content.trim().replace(/\s+/g, '-')
          yield {
            kind: this.monaco.languages.CompletionItemKind.Reference,
            label: '# ' + tokens[i].tag.toUpperCase() + ' ' + nextToken.content,
            insertText: '#' + this.ctx.utils.encodeMarkdownLink(id),
            range: {
              insert: insertionRange,
              replace: replacementRange,
            },
            sortText: i.toString().padStart(7)
          }
        }
      }
    }
  }

  private * provideReferenceSuggestions (text: string, position: Monaco.Position, context: CompletionContext): Iterable<Monaco.languages.CompletionItem> {
    const insertionRange = new this.monaco.Range(
      context.linkTextStartPosition.lineNumber,
      context.linkTextStartPosition.column,
      position.lineNumber,
      position.column,
    )

    const replacementPos = position.delta(0, context.linkSuffix.length)

    const replacementRange = new this.monaco.Range(
      insertionRange.startLineNumber,
      insertionRange.startColumn,
      replacementPos.lineNumber,
      replacementPos.column,
    )

    const definitions = this.getDefinitions(text)
    let i = 0
    for (const def of definitions) {
      i++
      yield {
        kind: this.monaco.languages.CompletionItemKind.Reference,
        label: def[0],
        insertText: def[0],
        range: {
          insert: insertionRange,
          replace: replacementRange,
        },
        sortText: i.toString().padStart(7)
      }
    }
  }

  private getDefinitions (text: string) {
    const out = new Map<string, { link: string }>()
    for (const match of text.matchAll(this.defPattern)) {
      const reference = match[2]
      const link = match[3].trim()

      if (this.angleBracketLinkRe.test(link)) {
        out.set(reference, {
          link: link.substring(1, link.length - 1),
        })
      } else {
        out.set(reference, {
          link,
        })
      }
    }
    return out
  }
}

export default {
  name: 'editor-md-completion',
  register: (ctx) => {
    ctx.editor.whenEditorReady().then(({ monaco }) => {
      monaco.languages.registerCompletionItemProvider(
        'markdown',
        new CompletionProvider(monaco, ctx)
      )
    })
  }
} as Plugin
