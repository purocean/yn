// https://github.com/DeepElement/markdown-it-plantuml-offline
import lodash from 'lodash'
import Markdown from 'markdown-it'
import { Plugin } from '@/useful/plugin'

const MarkdownItPlugin = function umlPlugin (md: Markdown, options: any) {
  function generateSourceDefault (umlCode: string) {
    return 'api/plantuml/png?data=' + encodeURIComponent(umlCode)
  }

  options = options || {}

  const openMarker = options.openMarker || '@startuml'
  const openChar = openMarker.charCodeAt(0)
  const closeMarker = options.closeMarker || '@enduml'
  const closeChar = closeMarker.charCodeAt(0)
  const render = options.render || md.renderer.rules.image
  const generateSource = options.generateSource || generateSourceDefault
  const loadingSrc = 'data:image/gif;base64,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'

  function uml (state: any, startLine: any, endLine: any, silent: any) {
    let nextLine
    let i
    let autoClosed = false
    let start = state.bMarks[startLine] + state.tShift[startLine]
    let max = state.eMarks[startLine]

    // Check out the first character quickly,
    // this should filter out most of non-uml blocks
    //
    if (openChar !== state.src.charCodeAt(start)) { return false }

    // Check out the rest of the marker string
    //
    for (i = 0; i < openMarker.length; ++i) {
      if (openMarker[i] !== state.src[start + i]) { return false }
    }

    const markup = state.src.slice(start, start + i)
    const params = state.src.slice(start + i, max)

    // Since start is found, we can report success here in validation mode
    //
    if (silent) { return true }

    // Search for the end of the block
    //
    nextLine = startLine

    for (;;) {
      nextLine++
      if (nextLine >= endLine) {
        // unclosed block should be autoclosed by end of document.
        // also block seems to be autoclosed by end of parent
        break
      }

      start = state.bMarks[nextLine] + state.tShift[nextLine]
      max = state.eMarks[nextLine]

      if (start < max && state.sCount[nextLine] < state.blkIndent) {
        // non-empty line with negative indent should stop the list:
        // - ```
        //  test
        break
      }

      if (closeChar !== state.src.charCodeAt(start)) {
        // didn't find the closing fence
        continue
      }

      if (state.sCount[nextLine] > state.sCount[startLine]) {
        // closing fence should not be indented with respect of opening fence
        continue
      }

      let closeMarkerMatched = true
      for (i = 0; i < closeMarker.length; ++i) {
        if (closeMarker[i] !== state.src[start + i]) {
          closeMarkerMatched = false
          break
        }
      }

      if (!closeMarkerMatched) {
        continue
      }

      // make sure tail has spaces only
      if (state.skipSpaces(start + i) < max) {
        continue
      }

      // found!
      autoClosed = true
      break
    }

    const contents = state.src
      .split('\n')
      .slice(startLine + 1, nextLine)
      .join('\n')

    // We generate a token list for the alt property, to mimic what the image parser does.
    const altToken: any = []
    // Remove leading space if any.
    const alt = params ? params.slice(1) : 'uml diagram'
    state.md.inline.parse(
      alt,
      state.md,
      state.env,
      altToken
    )

    const token = state.push('uml_diagram', 'img', 0)
    // alt is constructed from children. No point in populating it here.

    const imgSrc = generateSource(contents, options)
    token.attrs = [
      ['src', loadingSrc],
      ['data-plantuml-src', imgSrc],
      ['alt', '']
    ]
    token.block = true
    token.children = altToken
    token.info = params
    token.map = [startLine, nextLine]
    token.markup = markup

    state.line = nextLine + (autoClosed ? 1 : 0)

    return true
  }

  md.block.ruler.before('fence', 'uml_diagram', uml, {
    alt: ['paragraph', 'reference', 'blockquote', 'list']
  })
  md.renderer.rules.uml_diagram = render
}

export default {
  name: 'markdown-plantuml',
  register: ctx => {
    ctx.registerMarkdownItPlugin(MarkdownItPlugin)

    const updatePlantuml = ({ getViewDom }: any) => {
      const refView: HTMLElement = getViewDom()
      const nodes = refView.querySelectorAll<HTMLImageElement>('img[data-plantuml-src]')
      nodes.forEach(el => {
        el.src = el.dataset.plantumlSrc || ''
      })
    }

    const quickUpdateFun = (params: any) => {
      setTimeout(() => {
        ctx.registerHook('ON_VIEW_RENDERED', () => {
          updatePlantuml(params)
        }, true)
      }, 0)
    }

    ctx.registerHook('ON_VIEW_MOUNTED', quickUpdateFun)
    ctx.registerHook('ON_VIEW_FILE_CHANGE', quickUpdateFun)
    ctx.registerHook('ON_VIEW_RENDERED', lodash.debounce(updatePlantuml, 3000, { leading: true }))
  }
} as Plugin
