import * as Monaco from 'monaco-editor'
import { IndentRangeProvider } from 'monaco-editor/esm/vs/editor/contrib/folding/indentRangeProvider.js'
import type { Ctx, Plugin } from '@fe/context'
import type Token from 'markdown-it/lib/token'
import { DOM_ATTR_NAME } from '@fe/support/args'

const lengthLimit = 50000
const rangeLimit = 5000

type TocEntry = {
  level: number,
  start: number,
  end: number,
}

export class MdFoldingProvider implements Monaco.languages.FoldingRangeProvider {
  private readonly monaco: typeof Monaco
  private readonly ctx: Ctx

  constructor (monaco: typeof Monaco, ctx: Ctx) {
    this.monaco = monaco
    this.ctx = ctx
  }

  public async provideFoldingRanges (model: Monaco.editor.ITextModel, _context: Monaco.languages.FoldingContext, cancellationToken: Monaco.CancellationToken, retry = true): Promise<Monaco.languages.FoldingRange[]> {
    if (model.uri.toString() !== this.ctx.doc.toUri(this.ctx.view.getRenderEnv()?.file)) {
      if (retry) {
        await this.ctx.utils.sleep(1000)
        return await this.provideFoldingRanges(model, _context, cancellationToken, false)
      }

      return []
    }

    if (model.getValueLength() > lengthLimit) {
      return []
    }

    const foldables = await Promise.all([
      this.getHeaderFoldingRanges(model),
      this.getBlockFoldingRanges(model),
      new IndentRangeProvider(model).compute(cancellationToken).then((ranges: any) => {
        const length = ranges.length
        const result: Monaco.languages.FoldingRange[] = []
        for (let i = 0; i < length; i++) {
          result.push({
            start: ranges.getStartLineNumber(i),
            end: ranges.getEndLineNumber(i),
          })
        }

        return result
      })
    ])
    return foldables.flat().slice(0, rangeLimit)
  }

  private async getHeaderFoldingRanges (model: Monaco.editor.ITextModel): Promise<Monaco.languages.FoldingRange[]> {
    return (await this.buildToc(model)).map(entry => {
      let { start, end } = entry
      start++
      end++
      return { start, end }
    })
  }

  private getRealLine (token: Token) {
    if (token.meta.attrs && token.meta.attrs[DOM_ATTR_NAME.SOURCE_LINE_START] && token.meta.attrs[DOM_ATTR_NAME.SOURCE_LINE_END]) {
      return [
        parseInt(token.meta.attrs[DOM_ATTR_NAME.SOURCE_LINE_START]) - 1,
        parseInt(token.meta.attrs[DOM_ATTR_NAME.SOURCE_LINE_END]) - 1,
      ]
    }

    return token.map!
  }

  private async getBlockFoldingRanges (model: Monaco.editor.ITextModel): Promise<Monaco.languages.FoldingRange[]> {
    const tokens = this.ctx.view.getRenderEnv()?.tokens || []
    const multiLineListItems = tokens.filter(this.isFoldableToken.bind(this))
    return multiLineListItems.map(listItem => {
      const [startLine, endLine] = this.getRealLine(listItem)
      const start = startLine + 1
      let end = endLine
      if (model.getLineContent(end).trim().length === 0 && end >= start + 1) {
        end = end - 1
      }

      if (listItem.type.startsWith('container') || listItem.type === 'uml_diagram') {
        end++
      }

      return { start, end, kind: this.getFoldingRangeKind(listItem) }
    })
  }

  private getFoldingRangeKind (listItem: Token): Monaco.languages.FoldingRangeKind | undefined {
    return (listItem.type === 'comment' || (listItem.type === 'html_block' && listItem.content.startsWith('<!--')))
      ? Monaco.languages.FoldingRangeKind.Comment
      : undefined
  }

  private async buildToc (model: Monaco.editor.ITextModel): Promise<TocEntry[]> {
    const toc: TocEntry[] = []
    const tokens = this.ctx.view.getRenderEnv()?.tokens || []

    for (const heading of tokens.filter(token => token.type === 'heading_open')) {
      if (!heading.map) {
        continue
      }

      const [start, end] = this.getRealLine(heading)

      toc.push({ level: parseInt(heading.tag.replace('h', '')), start, end })
    }

    // Get full range of section
    return toc.map((entry, startIndex): TocEntry => {
      let end: number | undefined
      for (let i = startIndex + 1; i < toc.length; ++i) {
        if (toc[i].level <= entry.level) {
          end = toc[i].start - 1
          break
        }
      }
      entry.end = end ?? model.getLineCount() - 1
      return entry
    })
  }

  private isFoldableToken (token: Token) {
    if (!token.map || !token.meta) {
      return false
    }

    const [lineStart, lineEnd] = this.getRealLine(token)

    switch (token.type) {
      case 'fence':
      case 'comment':
      case 'paragraph_open':
      case 'list_item_open':
      case 'table_open':
      case 'uml_diagram':
      case 'math_block':
        return lineEnd > lineStart

      case 'html_block':
        return lineEnd > lineStart + 1

      default:
        if (token.type.startsWith('container')) {
          return lineEnd > lineStart
        }

        return false
    }
  }
}

export default {
  name: 'editor-folding',
  register: (ctx) => {
    ctx.editor.whenEditorReady().then(({ monaco }) => {
      monaco.languages.registerFoldingRangeProvider('markdown', new MdFoldingProvider(monaco, ctx))
    })
  }
} as Plugin
