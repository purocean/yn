<template>
  <div class="editor-container">
    <MonacoEditor ref="refEditor" class="editor" />
  </div>
</template>

<script lang="ts">
import { defineComponent, nextTick, onBeforeMount, onMounted, ref, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import { registerHook, removeHook } from '@fe/core/hook'
import { isEncrypted, saveDoc, toUri } from '@fe/services/document'
import { whenEditorReady } from '@fe/services/editor'
import type { Doc } from '@fe/types'
import MonacoEditor from './MonacoEditor.vue'

export default defineComponent({
  name: 'editor',
  components: { MonacoEditor },
  setup () {
    let editorIsReady = false
    const store = useStore()

    let timer: number | null = null
    const refEditor = ref<any>(null)
    const { currentFile, currentContent } = toRefs(store.state)

    const getEditor = () => refEditor.value

    function setCurrentValue ({ uri, value }: { uri: string; value: any}) {
      if (toUri(currentFile.value) === uri) {
        store.commit('setCurrentContent', value)
      }
    }

    function clearTimer () {
      if (timer) {
        window.clearTimeout(timer)
        timer = null
      }
    }

    async function saveFile (f: Doc | null = null) {
      const file = f || currentFile.value

      if (!(file && file.repo && file.path && file.status)) {
        return
      }

      if (file.content === currentContent.value) {
        return
      }

      if (!currentContent.value) {
        return
      }

      if (file.repo === '__help__') {
        return
      }

      await saveDoc(file, currentContent.value)
    }

    function restartTimer () {
      clearTimer()

      if (!(currentFile.value && currentFile.value.repo && currentFile.value.path)) {
        return
      }

      timer = window.setTimeout(() => {
        // prevent auto save encrypted file.
        if (!currentFile.value || isEncrypted(currentFile.value)) {
          return
        }

        saveFile()
      }, 2000)
    }

    async function changeFile (current?: Doc | null) {
      clearTimer()

      if (!editorIsReady) {
        return
      }

      getEditor().setModel(toUri(current), current?.content ?? '\n')
    }

    function resize () {
      nextTick(() => getEditor().resize())
    }

    watch(currentFile, changeFile)
    watch(currentContent, restartTimer)

    onMounted(() => {
      registerHook('GLOBAL_RESIZE', resize)
      registerHook('EDITOR_CHANGE', setCurrentValue)
      restartTimer()
    })

    onBeforeMount(() => {
      removeHook('GLOBAL_RESIZE', resize)
      removeHook('EDITOR_CHANGE', setCurrentValue)
    })

    whenEditorReady().then(({ editor, monaco }) => {
      editorIsReady = true
      if (currentFile.value) {
        changeFile(currentFile.value)
      }

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
        saveFile()
      })
    })

    return { refEditor }
  }
})
</script>

<style scoped>
.editor-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
