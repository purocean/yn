<template>
  <div class="editor">
    <MonacoEditor
      ref="refEditor"
      class="editor"
      @change="setCurrentValue"
      @ready="editorReady"
      @scroll-view="syncScrollView"
      @paste-img="pasteImg"
      @upload-file="uploadFile"
      @change-document="val => store.commit('setDocumentInfo', val)"
      @save="saveFile"></MonacoEditor>
  </div>
</template>

<script lang="ts">
import { debounce } from 'lodash-es'
import dayjs from 'dayjs'
import { defineComponent, nextTick, onBeforeMount, onMounted, ref, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import { encodeMarkdownLink, fileToBase64URL } from '@fe/utils'
import { useBus } from '@fe/support/bus'
import * as api from '@fe/support/api'
import Storage from '@fe/utils/storage'
import { registerAction, removeAction } from '@fe/context/action'
import { isEncrypted, saveDoc, toUri } from '@fe/context/document'
import { Doc } from '@fe/support/types'
import MonacoEditor from './MonacoEditor.vue'

const FILE_POSITION_KEY = 'filePosition'

export default defineComponent({
  name: 'editor',
  components: { MonacoEditor },
  setup (_, { emit }) {
    let editorIsReady = false
    const bus = useBus()
    const store = useStore()

    let timer: number | null = null
    const refEditor = ref<any>(null)
    const { currentFile, currentContent } = toRefs(store.state)

    const getEditor = () => refEditor.value
    const revealLine = (line: number) => getEditor().revealLine(line)
    const revealLineInCenter = (line: number) => getEditor().revealLineInCenter(line)

    function saveFileOpenPosition (top: number) {
      if (currentFile.value) {
        const map = Storage.get(FILE_POSITION_KEY, {})
        map[`${currentFile.value.repo}|${currentFile.value.path}`] = top
        Storage.set(FILE_POSITION_KEY, map)
      }
    }

    const saveFileOpenPositionDebounce = debounce((line: number) => {
      saveFileOpenPosition(line)
    }, 1000)

    function setCurrentValue ({ uri, value }: { uri: string; value: any}) {
      if (toUri(currentFile.value) === uri) {
        store.commit('setCurrentContent', value)
      }
    }

    function syncScrollView ({ line, top }: { line: number; top: number }) {
      emit('scroll-line', line)
      saveFileOpenPositionDebounce(top)
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
        if (!currentFile.value || isEncrypted(currentFile.value)) { // 加密文件不自动保存
          return
        }

        saveFile()
      }, 2000)
    }

    async function pasteImg (file: any, asBase64: boolean) {
      if (asBase64) {
        const uri = await fileToBase64URL(file)
        getEditor().insert(`![图片](${uri})\n`)
      } else {
        const { relativePath } = await api.upload(currentFile.value.repo, currentFile.value.path, file)
        bus.emit('file-uploaded', relativePath)
        getEditor().insert(`![图片](${encodeMarkdownLink(relativePath)})\n`)
      }
    }

    async function uploadFile (file: any) {
      const filename = `${dayjs().format('YYYYMMDDHHmmss')}.${file.name}`
      const { relativePath } = await api.upload(currentFile.value.repo, currentFile.value.path, file, filename)
      bus.emit('file-uploaded', relativePath)
      getEditor().insert(`附件 [${dayjs().format('YYYY-MM-DD HH:mm')}] [${file.name} (${(file.size / 1024).toFixed(2)}KiB)](${encodeMarkdownLink(relativePath)}){class=open target=_blank}\n`)
    }

    async function changeFile (current?: Doc | null) {
      clearTimer()

      if (!editorIsReady) {
        return
      }

      getEditor().setModel(toUri(current), current?.content ?? '\n')

      if (current && current.status) {
        // 切换文件时候保留定位
        nextTick(() => {
          const top = Storage.get(FILE_POSITION_KEY, {})[`${current.repo}|${current.path}`] || 1
          getEditor().setScrollToTop(top)
        })
      }
    }

    function editorReady () {
      bus.emit('editor.ready')
      editorIsReady = true
      if (currentFile.value) {
        changeFile(currentFile.value)
      }
    }

    watch(currentFile, changeFile)
    watch(currentContent, restartTimer)

    const resize = () => nextTick(() => getEditor().resize())
    const insert = (text?: string) => getEditor().insert(text)

    const replaceValue = (search: string, replace: string) => {
      getEditor().replaceValue(search, replace)
    }

    const replaceLine = (line: number, value: string) => {
      getEditor().replaceLine(line, value)
    }

    const getLine = (line: number) => {
      return getEditor().getLineContent(line)
    }

    const toggleWrap = () => getEditor().toggleWrap()

    onMounted(() => {
      bus.on('resize', resize)
      registerAction('editor.get-editor', getEditor)
      registerAction('editor.insert-value', insert)
      registerAction('editor.replace-value', replaceValue)
      registerAction('editor.get-line', getLine)
      registerAction('editor.replace-line', replaceLine)
      registerAction('editor.toggle-wrap', toggleWrap)
      restartTimer()
    })

    onBeforeMount(() => {
      bus.off('resize', resize)
      removeAction('editor.get-editor')
      removeAction('editor.insert-value')
      removeAction('editor.replace-value')
      removeAction('editor.get-line')
      removeAction('editor.replace-line')
      removeAction('editor.toggle-wrap')
    })

    return {
      bus,
      store,
      refEditor,
      revealLine,
      revealLineInCenter,
      setCurrentValue,
      syncScrollView,
      pasteImg,
      uploadFile,
      editorReady,
      saveFile,
    }
  }
})
</script>

<style scoped>
.editor {
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
