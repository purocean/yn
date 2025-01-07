import type { Plugin } from '@fe/context'
import { registerHook } from '@fe/core/hook'

const viewStateCache = new Map<string, any>()

export default {
  name: 'editor-restore-state',
  register: (ctx) => {
    const logger = ctx.utils.getLogger('plugin:editor-restore-state')

    registerHook('DOC_BEFORE_SWITCH', () => {
      ctx.editor.whenEditorReady().then(({ editor }) => {
        const currentDoc = ctx.store.state.currentFile
        const uri = ctx.doc.toUri(currentDoc)
        const viewState = editor.saveViewState()

        logger.debug('save view state', uri)
        viewStateCache.set(uri, viewState)
      })
    })

    ctx.editor.whenEditorReady().then(({ editor }) => {
      editor.onDidChangeModel(() => {
        // restore view state
        const currentDoc = ctx.store.state.currentFile
        const uri = ctx.doc.toUri(currentDoc)
        const viewState = viewStateCache.get(ctx.doc.toUri(currentDoc))
        if (viewState) {
          logger.debug('restore view state', uri)
          editor.restoreViewState(viewState)
        }
      })
    })

    ctx.lib.vue.watch(() => ctx.store.state.tabs, () => {
      ctx.editor.whenEditorReady().then(({ monaco }) => {
        const uris = ctx.store.state.tabs.map(x => x.key)

        // clean view state
        for (const uri of viewStateCache.keys()) {
          if (!uris.includes(uri)) {
            logger.debug('dispose view state', uri)
            viewStateCache.delete(uri)
          }
        }

        // clean models
        const models = monaco.editor.getModels()
        for (const model of models) {
          if (model.uri.scheme === ctx.doc.URI_SCHEME && !uris.includes(model.uri.toString())) {
            logger.debug('dispose model', model.uri.toString())
            model.dispose()
          }
        }
      })
    })
  }
} as Plugin
