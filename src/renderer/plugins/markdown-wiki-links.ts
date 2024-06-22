import ctx, { Plugin } from '@fe/context'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline'

const reMatch = /^([^[#|]*)?(?:#([^#|]*))?(?:\|([^\]]*))?$/
const reExternalLink = /^[a-zA-Z]{1,8}:\/\/.*/
const rePos = /(:\d{1,6},?\d{0,6})$/

function wikiLinks (state: StateInline, silent?: boolean) {
  // check [[
  if (state.src.charCodeAt(state.pos) !== 0x5B/* [ */ || state.src.charCodeAt(state.pos + 1) !== 0x5B/* [ */) {
    return false
  }

  const endPos = state.src.indexOf(']]', state.pos + 2)
  if (endPos === -1 || endPos === state.pos + 2) {
    return false
  }

  const content = state.src.slice(state.pos + 2, endPos)
  const parts = content.match(reMatch)
  if (!parts) {
    return false
  }

  let link = (parts[1] || '').trim()
  const hash = parts[2] || ''
  const label = parts[3] || ''

  const hashStr = hash ? `#${hash}` : ''

  let url = link + hashStr
  let text = label || url
  let isAnchor = false

  // internal link
  if (!reExternalLink.test(link)) {
    let posStr = ''
    const posMatch = link.match(rePos)
    if (posMatch) {
      link = link.replace(rePos, '')
      posStr = posMatch[1]
    }

    const fileName = link.split('/').pop()
    text = label || (fileName ? (fileName + posStr + hashStr) : url)

    if (!link) {
      url = posStr + hashStr
      text = label || hash || url
      isAnchor = true
    }
  }

  if (!silent) {
    const attrs: [string, string][] = [
      ['href', url],
      [ctx.args.DOM_ATTR_NAME.WIKI_LINK, 'true'],
    ]

    if (isAnchor) {
      attrs.push([ctx.args.DOM_ATTR_NAME.IS_ANCHOR, 'true'])
    }

    state.push('link_open', 'a', 1).attrs = attrs
    state.push('text', '', 0).content = text
    state.push('link_close', 'a', -1)
  }

  state.pos = endPos + 2

  return true
}

export default {
  name: 'markdown-wiki-links',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      md.inline.ruler.after('link', 'wiki-links', wikiLinks)
    })

    ctx.editor.whenEditorReady().then(({ editor, monaco }) => {
      editor.onDidChangeCursorPosition(e => {
        if (e.source === 'keyboard' && e.reason === 0) {
          const prevStr = editor.getModel()!.getValueInRange({
            startLineNumber: e.position.lineNumber,
            startColumn: e.position.column - 2,
            endLineNumber: e.position.lineNumber,
            endColumn: e.position.column,
          })

          const nextStr = editor.getModel()!.getValueInRange({
            startLineNumber: e.position.lineNumber,
            startColumn: e.position.column,
            endLineNumber: e.position.lineNumber,
            endColumn: e.position.column + 2,
          })

          if (prevStr === '【【') {
            // replace 【【 to [[]]
            editor.pushUndoStop()
            editor.executeEdits('wiki-links', [{
              range: {
                startLineNumber: e.position.lineNumber,
                startColumn: e.position.column - 2,
                endLineNumber: e.position.lineNumber,
                endColumn: e.position.column + (nextStr === '】】' ? 2 : 0),
              },
              text: '[[]]',
            }], [
              new monaco.Selection(
                e.position.lineNumber,
                e.position.column,
                e.position.lineNumber,
                e.position.column,
              ),
            ])
            editor.pushUndoStop()

            // trigger completion
            editor.trigger('wiki-links', 'editor.action.triggerSuggest', {})
          }
        }
      })
    })

    ctx.editor.tapSimpleCompletionItems(items => {
      items.push(
        { label: '/ [[]] Wiki Link', insertText: '[[$1]]', command: { id: 'editor.action.triggerSuggest', title: '' } },
      )
    })

    return { mdRuleWikiLinks: wikiLinks }
  }
} satisfies Plugin
