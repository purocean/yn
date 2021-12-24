<template>
  <div id="editor" ref="refEditor" />
</template>

<script lang="ts">
import type * as monaco from 'monaco-editor'
import { defineComponent, onMounted, ref } from 'vue'
import { defaultOptions } from '@fe/services/editor'
import { toUri } from '@fe/services/document'
import { triggerHook } from '@fe/core/hook'

const models: {[key: string]: monaco.editor.ITextModel} = {}

export default defineComponent({
  name: 'monaco-editor',
  props: {
    options: Object,
  },
  setup () {
    let editor: monaco.editor.IStandaloneCodeEditor | null = null
    const refEditor = ref<HTMLElement | null>(null)

    const getMonaco = () => window.monaco
    const getEditor = () => editor!
    const resize = () => editor && editor.layout()

    function getModel (uri: string, value: string) {
      let model = models[uri]

      if (!model) {
        model = getMonaco().editor.createModel(value, undefined, getMonaco().Uri.parse(uri))
        model.onDidChangeContent(() => {
          const value = model.getValue()
          triggerHook('MONACO_CHANGE_VALUE', { uri, value })
        })
      }

      // TODO keep edit state
      model.setValue(value)

      // TODO cache model
      models[uri] = model

      return model
    }

    function setModel (uri: string, value: string) {
      const model = getModel(uri, value || '')
      getEditor().setModel(model)
    }

    function initMonaco () {
      triggerHook('MONACO_BEFORE_INIT', { monaco: getMonaco() })

      editor = getMonaco().editor.create(refEditor.value, defaultOptions)
      setModel(toUri(null), '')

      setTimeout(() => {
        triggerHook('MONACO_READY', { editor: getEditor(), monaco: getMonaco() })
      }, 500)
    }

    function onGotAmdLoader () {
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
      setModel,
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
</style>
