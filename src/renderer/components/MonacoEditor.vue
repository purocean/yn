<template>
  <div id="editor" ref="refEditor" />
</template>

<script lang="ts">
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
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

    const getMonaco = () => monaco
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

      editor = getMonaco().editor.create(refEditor.value!, defaultOptions)
      setModel(toUri(null), '')

      setTimeout(() => {
        triggerHook('MONACO_READY', { editor: getEditor(), monaco: getMonaco() })
      }, 500)
    }

    onMounted(initMonaco)

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
