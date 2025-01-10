import type { Plugin } from '@fe/context'
import { registerHook } from '@fe/core/hook'
import type { editor } from 'monaco-editor'

export default {
  name: 'editor-restore-state',
  register: (ctx) => {
    const logger = ctx.utils.getLogger('plugin:editor-restore-state')
    const storageKey = 'plugin.editor-state'

    const viewStateCache = ctx.lib.vue.shallowReactive<Record<string, { _t: number, v: any }>>(ctx.storage.get<any>(storageKey, {}))

    ctx.lib.vue.watch(viewStateCache, () => {
      // keep recent 10 view states
      const entries = Object.entries(viewStateCache)
        .sort((a, b) => b[1]._t - a[1]._t)
        .slice(0, 10)

      ctx.storage.set(storageKey, Object.fromEntries(entries))
    })

    function saveState (uri: editor.ITextModel['uri'] | null | undefined, viewState: editor.ICodeEditorViewState | null) {
      if (!uri) return

      const uriStr = uri.toString()
      logger.debug('save view state', uriStr)
      viewStateCache[uriStr] = {
        _t: Date.now(),
        v: viewState
      }
    }

    const saveStateDebounced = ctx.lib.lodash.debounce(saveState, 500)

    registerHook('DOC_BEFORE_SWITCH', () => {
      ctx.editor.whenEditorReady().then(({ editor }) => {
        const uri = editor.getModel()?.uri
        if (!uri) return
        const viewState = editor.saveViewState()
        saveState(uri, viewState)
      })
    })

    ctx.editor.whenEditorReady().then(({ editor }) => {
      editor.onDidChangeModel((e) => {
        const uri = e.newModelUrl?.toString()
        if (!uri) return
        const viewState = viewStateCache[uri]
        if (viewState && viewState.v) {
          logger.debug('restore view state', uri)
          editor.restoreViewState(viewState.v)
        }
      })

      editor.onDidChangeCursorPosition(() => {
        saveStateDebounced(editor.getModel()?.uri, editor.saveViewState())
      })

      editor.onDidScrollChange(() => {
        saveStateDebounced(editor.getModel()?.uri, editor.saveViewState())
      })
    })

    ctx.lib.vue.watch(() => ctx.store.state.tabs, () => {
      ctx.editor.whenEditorReady().then(({ monaco }) => {
        const uris = ctx.store.state.tabs.map(x => x.key)

        // clean view state
        for (const uri of Object.keys(viewStateCache)) {
          if (!uris.includes(uri)) {
            logger.debug('dispose view state', uri)
            delete viewStateCache[uri]
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
