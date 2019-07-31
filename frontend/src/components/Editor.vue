<template>
  <div class="editor">
    <MonacoEditor
      ref="editor"
      class="editor"
      @change="val => $store.commit('app/setCurrentContent', val)"
      @ready="editorReady"
      @scroll-line="syncScrollView"
      @paste-img="pasteImg"
      @upload-file="uploadFile"
      @change-document="val => $store.commit('app/setDocumentInfo', val)"
      @xterm-run="val => $bus.emit('xterm-run', val)"
      @save="saveFile"></MonacoEditor>
</div>
</template>

<script>
import { mapState } from 'vuex'
import MonacoEditor from './MonacoEditor'
import File from '@/lib/file'
import dayjs from 'dayjs'

export default {
  name: 'editor',
  components: { MonacoEditor },
  data () {
    return {
      timer: null
    }
  },
  mounted () {
    window.addEventListener('resize', this.$refs.editor.resize)
    this.$bus.on('resize', this.$refs.editor.resize)
    this.$bus.on('editor-insert-value', this.$refs.editor.insert)
    this.$bus.on('editor-replace-value', this.$refs.editor.replaceValue)
    this.$bus.on('editor-toggle-wrap', this.$refs.editor.toggleWrap)
    this.restartTimer()
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.$refs.editor.resize)
    this.$bus.off('resize', this.$refs.editor.resize)
    this.$bus.off('editor-insert-value', this.$refs.editor.insert)
    this.$bus.off('editor-replace-value', this.$refs.editor.replaceValue)
    this.$bus.off('editor-toggle-wrap', this.$refs.editor.toggleWrap)
  },
  methods: {
    clearTimer () {
      if (this.timer) {
        window.clearTimeout(this.timer)
      }
    },
    restartTimer () {
      this.clearTimer()

      if (!(this.currentFile && this.currentFile.repo && this.currentFile.path)) {
        return
      }

      this.timer = window.setTimeout(() => {
        if (!this.currentFile || this.currentFile.path.endsWith('.c.md')) { // 加密文件不自动保存
          return
        }

        this.saveFile()
      }, 2000)
    },
    editorReady () {
      this.$bus.emit('editor-ready')
      if (this.currentFile) {
        this.changeFile(this.currentFile)
      }
    },
    revealLine (line) {
      this.$refs.editor.revealLine(line)
    },
    switchTodo (line, checked) {
      this.$refs.editor.switchTodo(line, checked)
    },
    syncScrollView (e) {
      this.$emit('scroll-line', e)
    },
    saveFile (f = null) {
      const file = f || this.currentFile

      if (!(file && file.repo && file.path)) {
        return
      }

      if (this.previousContent === this.currentContent) {
        return
      }

      if (!this.currentContent) {
        return
      }

      if (file.repo === '__readme__') {
        return
      }

      const content = this.currentContent
      File.write(file.repo, file.path, content, this.previousHash, result => {
        this.$store.commit('app/setPreviousHash', result.data)
        this.$store.commit('app/setPreviousContent', content)
        this.$store.commit('app/setSavedAt', new Date())
      }, e => {
        alert(e.message)
      })
    },
    pasteImg (file) {
      File.upload(this.currentFile.repo, this.currentFile.path, file, ({ relativePath }) => {
        this.$bus.emit('file-uploaded', relativePath)
        this.$refs.editor.insert(`![图片](${encodeURI(relativePath)})\n`)
      })
    },
    uploadFile (file) {
      File.upload(this.currentFile.repo, this.currentFile.path, file, ({ relativePath }) => {
        this.$bus.emit('file-uploaded', relativePath)
        this.$refs.editor.insert(`附件 [${dayjs().format('YYYY-MM-DD HH:mm')}]：[${file.name} (${(file.size / 1024).toFixed(2)}KiB)](${encodeURI(relativePath).replace('(', '%28').replace(')', '%29')}){class=open target=_blank}\n`)
      }, `${dayjs().format('YYYYMMDDHHmmss')}.${file.name}`)
    },
    changeFile (current, previous) {
      this.clearTimer()

      if (previous && previous.repo && previous.path) {
        this.saveFile(previous)
      }

      if (current) {
        if (current.content) { // 系统文件
          this.$store.commit('app/setPreviousContent', current.content)
          this.$store.commit('app/setSavedAt', null)
          this.$refs.editor.setValue(current.content)
        } else {
          File.read(current, (data, hash) => {
            this.$store.commit('app/setPreviousContent', data)
            this.$store.commit('app/setPreviousHash', hash)
            this.$store.commit('app/setSavedAt', null)
            this.$refs.editor.setValue(data)
          }, e => {
            this.$store.commit('app/setCurrentFile', null)
            alert(e.message)
          })
        }
      } else {
        this.$store.commit('app/setPreviousContent', '\n')
        this.$refs.editor.setValue('\n')
        this.$store.commit('app/setCurrentFile', null)
      }

      // 切换文件时候定位到第一行
      this.$refs.editor.setPosition({ column: 1, lineNumber: 1 })
    }
  },
  computed: {
    ...mapState('app', ['currentFile', 'currentContent', 'previousContent', 'previousHash'])
  },
  watch: {
    currentFile (current, previous) {
      this.changeFile(current, previous)
    },
    currentContent () {
      this.restartTimer()
    }
  }
}
</script>

<style scoped>
.editor {
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
