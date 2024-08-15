import { Plugin } from '@fe/context'
import { RULE_NAME, wikiLinks } from './lib'
import workerIndexerUrl from './worker-indexer?url'

export default {
  name: 'markdown-wiki-links',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      md.inline.ruler.after('link', RULE_NAME, wikiLinks)
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
            editor.executeEdits(RULE_NAME, [{
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
            editor.trigger(RULE_NAME, 'editor.action.triggerSuggest', {})
          }
        }
      })
    })

    ctx.editor.tapSimpleCompletionItems(items => {
      items.push(
        { label: '/ [[]] Wiki Link', insertText: '[[$1]]', command: { id: 'editor.action.triggerSuggest', title: '' } },
      )
    })

    ctx.indexer.importScriptsToWorker(workerIndexerUrl)

    ctx.registerHook('SETTING_CHANGED', ({ changedKeys }) => {
      if (changedKeys.includes('render.md-wiki-links')) {
        ctx.indexer.rebuildCurrentRepo()
      }
    })

    return { mdRuleWikiLinks: wikiLinks }
  }
} satisfies Plugin
