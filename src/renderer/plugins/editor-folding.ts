import * as Monaco from 'monaco-editor'
import type { Ctx, Plugin } from '@fe/context'

import type Token from 'markdown-it/lib/token'
const rangeLimit = 5000

interface MarkdownItTokenWithMap extends Token {
  map: [number, number];
}

type TocEntry = {
  level: number,
  start: number,
  end: number,
}

const isStartRegion = (t: string) => /^\s*<!--\s*#?region\b.*-->/.test(t)
const isEndRegion = (t: string) => /^\s*<!--\s*#?endregion\b.*-->/.test(t)

const isRegionMarker = (token: Token): token is MarkdownItTokenWithMap =>
  !!token.map && token.type === 'html_block' && (isStartRegion(token.content) || isEndRegion(token.content))

const isFoldableToken = (token: Token): token is MarkdownItTokenWithMap => {
  if (!token.map) {
    return false
  }

  switch (token.type) {
    case 'fence':
    case 'comment':
    case 'paragraph_open':
    case 'list_item_open':
      return token.map[1] > token.map[0]

    case 'html_block':
      if (isRegionMarker(token)) {
        return false
      }
      return token.map[1] > token.map[0] + 1

    default:
      return false
  }
}

export class MdFoldingProvider implements Monaco.languages.FoldingRangeProvider {
  private readonly monaco: typeof Monaco
  private readonly ctx: Ctx

  constructor (monaco: typeof Monaco, ctx: Ctx) {
    this.monaco = monaco
    this.ctx = ctx
  }

  public async provideFoldingRanges (model: Monaco.editor.ITextModel) {
    const foldables = await Promise.all([
      this.getRegions(),
      this.getHeaderFoldingRanges(model),
      this.getBlockFoldingRanges(model)
    ])
    return foldables.flat().slice(0, rangeLimit)
  }

  private async getRegions (): Promise<Monaco.languages.FoldingRange[]> {
    const tokens = this.ctx.view.getRenderEnv()?.tokens || []
    const regionMarkers = tokens.filter(isRegionMarker)
      .map(token => ({ line: token.map[0], isStart: isStartRegion(token.content) }))

    const nestingStack: { line: number; isStart: boolean }[] = []
    return regionMarkers
      .map(marker => {
        if (marker.isStart) {
          nestingStack.push(marker)
        } else if (nestingStack.length && nestingStack[nestingStack.length - 1].isStart) {
          return { start: nestingStack.pop()!.line + 1, end: marker.line + 1, kind: this.monaco.languages.FoldingRangeKind.Region }
        } else {
          // noop: invalid nesting (i.e. [end, start] or [start, end, end])
        }
        return null
      })
      .filter((region) => !!region) as Monaco.languages.FoldingRange[]
  }

  private async getHeaderFoldingRanges (model: Monaco.editor.ITextModel): Promise<Monaco.languages.FoldingRange[]> {
    return (await this.buildToc(model)).map(entry => {
      let { start, end } = entry
      start++
      end++
      return { start, end }
    })
  }

  private async getBlockFoldingRanges (model: Monaco.editor.ITextModel): Promise<Monaco.languages.FoldingRange[]> {
    const tokens = this.ctx.view.getRenderEnv()?.tokens || []
    const multiLineListItems = tokens.filter(isFoldableToken)
    return multiLineListItems.map(listItem => {
      const start = listItem.map[0] + 1
      let end = listItem.map[1]
      if (model.getLineContent(end).trim().length === 0 && end >= start + 1) {
        end = end - 1
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

      toc.push({
        level: parseInt(heading.tag.replace('h', '')),
        start: heading.map[0],
        end: heading.map[1],
      })
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
}

export default {
  name: 'editor-folding',
  register: (ctx) => {
    ctx.editor.whenEditorReady().then(({ monaco }) => {
      monaco.languages.registerFoldingRangeProvider('markdown', new MdFoldingProvider(monaco, ctx))
    })
  }
} as Plugin
