<template>
  <div id="editor" ref="refEditor" />
</template>

<script lang="ts">
import type * as monaco from 'monaco-editor'
import { defineComponent, onMounted, ref } from 'vue'
import { getDefaultOptions } from '@fe/services/editor'
import { toUri } from '@fe/services/document'
import { triggerHook } from '@fe/core/hook'
import { MONACO_EDITOR_NLS } from '@fe/support/args'

export default defineComponent({
  name: 'monaco-editor',
  props: {
    nls: String,
  },
  setup (props) {
    let editor: monaco.editor.IStandaloneCodeEditor | null = null
    const refEditor = ref<HTMLElement | null>(null)

    const getMonaco = () => window.monaco
    const getEditor = () => editor!
    const resize = () => editor && editor.layout()

    function createModel (uriString: string, value: string) {
      const monaco = getMonaco()
      const models: monaco.editor.ITextModel[] = monaco.editor.getModels()
      const uri: monaco.Uri = monaco.Uri.parse(uriString)

      let model = models.find(x => uri.toString() === x.uri.toString())

      if (!model) {
        model = getMonaco().editor.createModel(value, undefined, uri)
      }

      model!.onDidChangeContent(() => {
        const value = model!.getValue()
      })

      model!.setValue(value)

      getEditor().setModel(model!)

      // clear all other models
      // TODO cache model
      setTimeout(() => {
        monaco.editor.getModels().forEach((model: monaco.editor.ITextModel) => {
          if (model.uri.toString() !== uri.toString()) {
            model.dispose()
          }
        })
      }, 0)
    }

    function initMonaco () {
      triggerHook('MONACO_BEFORE_INIT', { monaco: getMonaco() })

      editor = getMonaco().editor.create(refEditor.value, {
        ...getDefaultOptions(),
        fixedOverflowWidgets: true,
      })

      createModel(toUri(null), '')

      setTimeout(() => {
        triggerHook('MONACO_READY', { editor: getEditor(), monaco: getMonaco() })
      }, 500)
    }

    function onGotAmdLoader () {
      if (props.nls && Object.keys(MONACO_EDITOR_NLS).includes(props.nls)) {
        (window as any).require.config({
          'vs/nls': {
            availableLanguages: {
              '*': props.nls,
            }
          }
        })
      }

      (window as any).require(['vs/editor/editor.main'], initMonaco)
    }

    onMounted(() => {
      if (!window.require) {
        const loaderScript = document.createElement('script')
        loaderScript.type = 'text/javascript'
        loaderScript.src = 'vs/loader.js'
        loaderScript.addEventListener('load', onGotAmdLoader)
        document.body.appendChild(loaderScript)
      } else {
        onGotAmdLoader()
      }
    })

    return {
      refEditor,
      resize,
      createModel,
    }
  }
})
</script>

<style scoped>
#editor {
  height: 100%;
  width: 100%;
}
</style>

<style>
.monaco-editor .inputarea {
  display: unset;
  box-sizing: content-box;
  background: unset;
  transition: none;
}

.monaco-editor .margin-view-overlays {
  user-select: none;
}
</style>
