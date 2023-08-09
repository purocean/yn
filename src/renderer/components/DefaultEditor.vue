<template>
  <div class="editor-container">
    <MonacoEditor ref="refEditor" class="editor" :nls="nls" />
  </div>
</template>

<script lang="ts">
import { defineComponent, nextTick, onBeforeMount, onMounted, ref, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import { registerHook, removeHook } from '@fe/core/hook'
import { registerAction, removeAction } from '@fe/core/action'
import { isEncrypted, isSameFile, saveDoc, toUri } from '@fe/services/document'
import { getEditor, getIsDefault, setValue, whenEditorReady } from '@fe/services/editor'
import { FLAG_READONLY, HELP_REPO_NAME } from '@fe/support/args'
import { getSetting } from '@fe/services/setting'
import { getCurrentLanguage } from '@fe/services/i18n'
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
    const nls = getCurrentLanguage().toLowerCase()

    const getMonacoEditor = () => refEditor.value

    function setCurrentValue ({ uri, value }: { uri: string; value: any}) {
      if (toUri(currentFile.value) === uri && getIsDefault()) {
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
      const file: Doc = f || currentFile.value

      if (!(file && file.repo && file.path && file.status)) {
        return
      }

      if (file.content === currentContent.value) {
        return
      }

      if (!file.plain) {
        return
      }

      if (!currentContent.value) {
        return
      }

      if (file.repo === HELP_REPO_NAME) {
        return
      }

      clearTimer()

      await saveDoc(file, currentContent.value)
    }

    function restartTimer () {
      clearTimer()

      if (!(currentFile.value && currentFile.value.repo && currentFile.value.path)) {
        return
      }

      const autoSave = getSetting('auto-save', 2000)

      if (!autoSave) {
        return
      }

      timer = window.setTimeout(() => {
        // prevent auto save encrypted file.
        if (!currentFile.value || isEncrypted(currentFile.value)) {
          return
        }

        saveFile()
      }, autoSave)
    }

    async function changeFile (current?: Doc | null, previous?: Doc | null) {
      clearTimer()

      if (!editorIsReady) {
        return
      }

      // change content only
      if (current && previous && isSameFile(current, previous)) {
        setValue(current.content ?? '\n')
      } else {
        getMonacoEditor().createModel(toUri(current), current?.content ?? '\n')
      }

      await nextTick()
      getEditor().updateOptions({
        readOnly: FLAG_READONLY || !current || !current.plain
      })

      if (getIsDefault()) {
        await nextTick()
        getEditor().focus()
      }
    }

    function resize () {
      nextTick(() => getMonacoEditor().resize())
    }

    watch(currentFile, changeFile)
    watch(currentContent, restartTimer)

    onMounted(() => {
      registerHook('GLOBAL_RESIZE', resize)
      registerHook('EDITOR_CHANGE', setCurrentValue)
      registerAction({ name: 'editor.trigger-save', handler: () => saveFile() })
      restartTimer()
    })

    onBeforeMount(() => {
      removeHook('GLOBAL_RESIZE', resize)
      removeHook('EDITOR_CHANGE', setCurrentValue)
      removeAction('editor.trigger-save')
    })

    whenEditorReady().then(({ editor, monaco }) => {
      editorIsReady = true
      if (currentFile.value) {
        changeFile(currentFile.value)
      }

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        saveFile()
      })
    })

    return { refEditor, nls }
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
