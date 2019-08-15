<template>
  <div class="editor">
    <MonacoEditor
      ref="editor"
      class="editor"
      @change="val => $store.commit('app/setCurrentContent', val)"
      @ready="editorReady"
      @scroll-view="syncScrollView"
      @paste-img="pasteImg"
      @upload-file="uploadFile"
      @change-document="val => $store.commit('app/setDocumentInfo', val)"
      @xterm-run="val => $bus.emit('xterm-run', val)"
      @save="saveFile"></MonacoEditor>
  </div>
</template>

<script>
import _ from 'lodash'
import { mapState } from 'vuex'
import dayjs from 'dayjs'
import File from '@/lib/file'
import Storage from '@/lib/Storage'
import MonacoEditor from './MonacoEditor'

const FILE_POSITION_KEY = 'filePosition'

export default {
  name: 'editor',
  components: { MonacoEditor },
  data () {
    return {
      timer: null
    }
  },
  mounted () {
    this.$bus.on('resize', this.$refs.editor.resize)
    this.$bus.on('editor-insert-value', this.$refs.editor.insert)
    this.$bus.on('editor-replace-value', this.$refs.editor.replaceValue)
    this.$bus.on('editor-toggle-wrap', this.$refs.editor.toggleWrap)
    this.$bus.on('file-new', this.createFile)
    this.restartTimer()

    this.saveFileOpenPositionDebounce = _.debounce(line => {
      this.saveFileOpenPosition(line)
    }, 1000)
  },
  beforeDestroy () {
    this.$bus.off('resize', this.$refs.editor.resize)
    this.$bus.off('editor-insert-value', this.$refs.editor.insert)
    this.$bus.off('editor-replace-value', this.$refs.editor.replaceValue)
    this.$bus.off('editor-toggle-wrap', this.$refs.editor.toggleWrap)
    this.$bus.off('file-new', this.createFile)
  },
  methods: {
    saveFileOpenPosition (top) {
      if (this.currentFile) {
        const map = Storage.get(FILE_POSITION_KEY, {})
        map[`${this.currentFile.repo}|${this.currentFile.path}`] = top
        Storage.set(FILE_POSITION_KEY, map)
      }
    },
    async createFile ({ file, content }) {
      try {
        // 加密文件内容
        if (File.isEncryptedFile(file)) {
          const password = await this.inputPassword('[创建] 请输入密码', file.name)
          const encrypted = File.encrypt(content, password)
          content = encrypted.content
          // 储存这次解密文件密码的 hash，用于下次判断是否输入了相同密码
          this.$store.commit('app/setPasswordHash', file, encrypted.passwordHash)
        }

        await File.write(file, content, 'new')

        this.$bus.emit('file-created', file)
        this.$store.commit('app/setCurrentFile', file)
      } catch (error) {
        this.$toast.show('warning', error.message)
        console.error(error)
      }
    },
    async inputPassword (title, filename) {
      const password = await this.$modal.input({ title, type: 'password', hint: filename })
      if (!password) {
        throw new Error('未输入密码')
      }

      return password
    },
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
        if (!this.currentFile || File.isEncryptedFile(this.currentFile)) { // 加密文件不自动保存
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
    revealLineInCenter (line) {
      this.$refs.editor.revealLineInCenter(line)
    },
    switchTodo (line, checked) {
      this.$refs.editor.switchTodo(line, checked)
    },
    syncScrollView ({ line, top }) {
      this.$emit('scroll-line', line)
      this.saveFileOpenPositionDebounce(top)
    },
    async saveFile (f = null) {
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

      if (file.repo === '__help__') {
        return
      }

      try {
        let content = this.currentContent

        // 加密文件内容
        if (File.isEncryptedFile(file)) {
          const password = await this.inputPassword('[保存] 请输入密码', file.name)
          const encrypted = File.encrypt(content, password)
          const oldPasswdHash = this.passwordHash[`${file.repo}|${file.path}`]
          if (oldPasswdHash !== encrypted.passwordHash) {
            if (!(await this.$modal.confirm({ title: '提示', content: '密码和上一次输入的密码不一致，是否用新密码保存？' }))) {
              return
            }
          }

          content = encrypted.content
          // 储存这次解密文件密码的 hash，用于下次判断是否输入了相同密码
          this.$store.commit('app/setPasswordHash', file, encrypted.passwordHash)
        }

        const { hash } = await File.write(file, content, this.previousHash)

        this.$store.commit('app/setPreviousHash', hash)
        this.$store.commit('app/setPreviousContent', this.currentContent)
        this.$store.commit('app/setSavedAt', new Date())
      } catch (error) {
        this.$toast.show('warning', error.message)
        console.error(error)
      }
    },
    async pasteImg (file) {
      const { relativePath } = await File.upload(this.currentFile.repo, this.currentFile.path, file)
      this.$bus.emit('file-uploaded', relativePath)
      this.$refs.editor.insert(`![图片](${encodeURI(relativePath)})\n`)
    },
    async uploadFile (file) {
      const filename = `${dayjs().format('YYYYMMDDHHmmss')}.${file.name}`
      const { relativePath } = await File.upload(this.currentFile.repo, this.currentFile.path, file, filename)
      this.$bus.emit('file-uploaded', relativePath)
      this.$refs.editor.insert(`附件 [${dayjs().format('YYYY-MM-DD HH:mm')}]：[${file.name} (${(file.size / 1024).toFixed(2)}KiB)](${encodeURI(relativePath).replace('(', '%28').replace(')', '%29')}){class=open target=_blank}\n`)
    },
    async changeFile (current, previous) {
      this.$refs.editor.setScrollToTop(0)
      this.clearTimer()

      if (previous && previous.repo && previous.path) {
        await this.saveFile(previous)
      }

      if (!current) {
        this.$store.commit('app/setPreviousContent', '\n')
        this.$refs.editor.setValue('\n')
        this.$store.commit('app/setCurrentFile', null)
        return
      }

      if (current.content) { // 系统文件
        this.$store.commit('app/setPreviousContent', current.content)
        this.$store.commit('app/setSavedAt', null)
        this.$refs.editor.setValue(current.content)
        return
      }

      try {
        let { content, hash } = await File.read(current)

        // 解密文件内容
        if (File.isEncryptedFile(current)) {
          const password = await this.inputPassword('[打开] 请输入密码', current.name)
          const decrypted = File.decrypt(content, password)
          content = decrypted.content
          // 储存这次解密文件密码的 hash，用于下次判断是否输入了相同密码
          this.$store.commit('app/setPasswordHash', { file: current, passwordHash: decrypted.passwordHash })
        }

        this.$store.commit('app/setPreviousContent', content)
        this.$store.commit('app/setPreviousHash', hash)
        this.$store.commit('app/setSavedAt', null)
        this.$refs.editor.setValue(content)
      } catch (error) {
        this.$store.commit('app/setCurrentFile', null)
        this.$toast.show('warning', error.message)
        console.error(error)
      }

      // 切换文件时候定位
      const top = Storage.get(FILE_POSITION_KEY, {})[`${current.repo}|${current.path}`] || 1
      this.$refs.editor.setScrollToTop(top)
    }
  },
  computed: {
    ...mapState('app', ['currentFile', 'currentContent', 'previousContent', 'previousHash', 'passwordHash'])
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
