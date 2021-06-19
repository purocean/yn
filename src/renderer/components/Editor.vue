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
      @xterm-run="val => bus.emit('xterm-run', val)"
      @save="saveFile"></MonacoEditor>
  </div>
</template>

<script lang="ts">
import { debounce } from 'lodash-es'
import dayjs from 'dayjs'
import { defineComponent, nextTick, onBeforeMount, onMounted, ref, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import { encodeMarkdownLink } from '../useful/utils'
import { useBus } from '../useful/bus'
import { useModal } from '../useful/modal'
import { useToast } from '../useful/toast'
import File from '../useful/file'
import Storage from '../useful/storage'
import MonacoEditor from './MonacoEditor.vue'

const FILE_POSITION_KEY = 'filePosition'

export default defineComponent({
  name: 'editor',
  components: { MonacoEditor },
  setup (_, { emit }) {
    const bus = useBus()
    const store = useStore()
    const modal = useModal()
    const toast = useToast()

    let timer: number | null = null
    const refEditor = ref<any>(null)
    const { currentFile, currentContent, previousContent, previousHash, passwordHash } = toRefs(store.state)

    const getEditor = () => refEditor.value
    const revealLine = (line: number) => getEditor().revealLine(line)
    const revealLineInCenter = (line: number) => getEditor().revealLineInCenter(line)
    const toUri = (file: any) => File.toUri(file)

    async function inputPassword (title: string, filename: string) {
      const password = await modal.input({ title, type: 'password', hint: filename })
      if (!password) {
        throw new Error('未输入密码')
      }

      return password
    }

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

    async function createFile ({ file, content }: {file: any; content: any}) {
      try {
        // 加密文件内容
        if (File.isEncryptedFile(file)) {
          const password = await inputPassword('[创建] 请输入密码', file.name)
          const encrypted = File.encrypt(content, password)
          content = encrypted.content
          // 储存这次解密文件密码的 hash，用于下次判断是否输入了相同密码
          store.commit('setPasswordHash', { file, passwordHash: encrypted.passwordHash })
        }

        await File.write(file, content, 'new')

        bus.emit('file-created', file)
        store.commit('setCurrentFile', file)
      } catch (error) {
        toast.show('warning', error.message)
        console.error(error)
      }
    }

    function clearTimer () {
      if (timer) {
        window.clearTimeout(timer)
        timer = null
      }
    }

    async function saveFile (f: any = null) {
      const file = f || currentFile.value

      if (!(file && file.repo && file.path)) {
        return
      }

      if (previousContent.value === currentContent.value) {
        return
      }

      if (!currentContent.value) {
        return
      }

      if (file.repo === '__help__') {
        return
      }

      try {
        let content = currentContent.value

        // 加密文件内容
        if (File.isEncryptedFile(file)) {
          const password = await inputPassword('[保存] 请输入密码', file.name)
          const encrypted = File.encrypt(content, password)
          const oldPasswdHash = passwordHash.value[`${file.repo}|${file.path}`]
          if (oldPasswdHash !== encrypted.passwordHash) {
            if (!(await modal.confirm({ title: '提示', content: '密码和上一次输入的密码不一致，是否用新密码保存？' }))) {
              return
            }
          }

          content = encrypted.content
          // 储存这次解密文件密码的 hash，用于下次判断是否输入了相同密码
          store.commit('setPasswordHash', { file, passwordHash: encrypted.passwordHash })
        }

        const { hash } = await File.write(file, content, previousHash.value)

        store.commit('setPreviousHash', hash)
        store.commit('setPreviousContent', currentContent.value)
        store.commit('setSavedAt', new Date())
      } catch (error) {
        toast.show('warning', error.message)
        console.error(error)
      }
    }

    function restartTimer () {
      clearTimer()

      if (!(currentFile.value && currentFile.value.repo && currentFile.value.path)) {
        return
      }

      timer = window.setTimeout(() => {
        if (!currentFile.value || File.isEncryptedFile(currentFile.value)) { // 加密文件不自动保存
          return
        }

        saveFile()
      }, 2000)
    }

    async function pasteImg (file: any, asBase64: boolean) {
      if (asBase64) {
        const uri = await File.toBase64URL(file)
        getEditor().insert(`![图片](${uri})\n`)
      } else {
        const { relativePath } = await File.upload(currentFile.value.repo, currentFile.value.path, file)
        bus.emit('file-uploaded', relativePath)
        getEditor().insert(`![图片](${encodeMarkdownLink(relativePath)})\n`)
      }
    }

    async function uploadFile (file: any) {
      const filename = `${dayjs().format('YYYYMMDDHHmmss')}.${file.name}`
      const { relativePath } = await File.upload(currentFile.value.repo, currentFile.value.path, file, filename)
      bus.emit('file-uploaded', relativePath)
      getEditor().insert(`附件 [${dayjs().format('YYYY-MM-DD HH:mm')}]：[${file.name} (${(file.size / 1024).toFixed(2)}KiB)](${encodeMarkdownLink(relativePath)}){class=open target=_blank}\n`)
    }

    async function changeFile (current: any, previous?: any) {
      clearTimer()

      if (previous && previous.repo && previous.path) {
        await saveFile(previous)
      }

      if (!current) {
        store.commit('setPreviousContent', '\n')
        getEditor().setModel(toUri(current), '\n')
        store.commit('setCurrentFile', null)
        return
      }

      if (current.content) { // 系统文件
        store.commit('setPreviousContent', current.content)
        store.commit('setSavedAt', null)
        getEditor().setModel(toUri(current), current.content)
        return
      }

      try {
        let { content, hash } = await File.read(current)

        // 解密文件内容
        if (File.isEncryptedFile(current)) {
          const password = await inputPassword('[打开] 请输入密码', current.name)
          const decrypted = File.decrypt(content, password)
          content = decrypted.content
          // 储存这次解密文件密码的 hash，用于下次判断是否输入了相同密码
          store.commit('setPasswordHash', { file: current, passwordHash: decrypted.passwordHash })
        }

        store.commit('setPreviousContent', content)
        store.commit('setPreviousHash', hash)
        store.commit('setSavedAt', null)
        getEditor().setModel(toUri(current), content)
      } catch (error) {
        store.commit('setCurrentFile', null)
        toast.show('warning', error.message.includes('Malformed') ? '密码错误' : error.message)
        console.error(error)
      }

      // 切换文件时候保留定位
      nextTick(() => {
        const top = Storage.get(FILE_POSITION_KEY, {})[`${current.repo}|${current.path}`] || 1
        getEditor().setScrollToTop(top)
      })
    }

    function editorReady () {
      bus.emit('editor-ready')
      if (currentFile.value) {
        changeFile(currentFile.value)
      }
    }

    watch(currentFile, changeFile)
    watch(currentContent, restartTimer)

    const resize = () => nextTick(() => getEditor().resize())
    const insert = (text?: string) => getEditor().insert(text)

    const replaceValue = (value?: { search: string; replace: string }) => {
      if (value) {
        getEditor().replaceValue(value.search, value.replace)
      }
    }

    const replaceLine = (params?: { line: number; value: string }) => {
      if (params) {
        getEditor().replaceLine(params.line, params.value)
      }
    }

    const getLine = (params?: {line: number; callback?: (value: string) => void}) => {
      if (params) {
        const { line, callback } = params
        callback && callback(getEditor().getLineContent(line))
      }
    }

    const toggleWrap = () => getEditor().toggleWrap()

    onMounted(() => {
      bus.on('resize', resize)
      bus.on('editor-insert-value', insert)
      bus.on('editor-replace-value', replaceValue)
      bus.on('editor-get-line', getLine)
      bus.on('editor-replace-line', replaceLine)
      bus.on('editor-toggle-wrap', toggleWrap)
      bus.on('file-new', createFile as any)
      restartTimer()
    })

    onBeforeMount(() => {
      bus.off('resize', resize)
      bus.off('editor-insert-value', insert)
      bus.off('editor-replace-value', replaceValue)
      bus.off('editor-get-line', getLine)
      bus.off('editor-replace-line', replaceLine)
      bus.off('editor-toggle-wrap', toggleWrap)
      bus.off('file-new', createFile as any)
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
