<template>
  <div>
    <header class="header" :style="unsaved ? 'background: orange' : ''">
      <div>
        <h4 style="margin: 0;text-align: center">
          <span v-if="file">
            {{ file.path }}-{{ status }} [{{file.repo}}]
          </span>
          <span v-else>
            未打开文件
          </span>
        </h4>
      </div>
    </header>
    <div style="display: flex; justify-content: space-between;">
      <Tree ref="tree" class="tree" v-model="file"></Tree>
      <Editor
        ref="editor"
        class="editor"
        v-model="value"
        @ready="editorReady"
        @scroll-line="syncScrollView"
        @paste-img="pasteImg"
        @upload-file="uploadFile"
        @save="saveFile"></Editor>
      <XView
        ref="view"
        class="view"
        :value="value"
        :file-name="fileName"
        :file-path="filePath"
        :file-repo="fileRepo"
        @sync-scroll="syncScrollEditor"
        @switch-todo="switchTodoEditor"></XView>
    </div>
    <div class="status-bar">
      <StatusBar></StatusBar>
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'
import Editor from '../components/Editor'
import XView from '../components/View'
import Tree from '../components/Tree'
import StatusBar from '../components/StatusBar'
import RunPlugin from '../components/RunPlugin'
import File from '../file'

export default {
  name: 'home',
  components: { XView, Editor, Tree, StatusBar },
  data () {
    return {
      status: '请选择文件',
      value: '',
      lastSaveContent: '',
      file: null,
      timer: null
    }
  },
  mounted () {
    RunPlugin.clearCache()
    this.restartTimer()
  },
  beforeDestroy () {
    this.clearTimer()
  },
  methods: {
    editorReady () {
      this.$bus.emit('editor-ready')
    },
    clearTimer () {
      if (this.timer) {
        window.clearTimeout(this.timer)
      }
    },
    restartTimer () {
      this.clearTimer()

      this.timer = window.setTimeout(() => {
        if (!this.file || this.file.path.endsWith('.c.md')) { // 加密文件不自动保存
          return
        }

        this.saveFile()
      }, 2000)
    },
    saveFile (f = null) {
      const file = f || this.file

      if (!file) {
        return
      }

      if (this.lastSaveContent === this.value) {
        return
      }

      if (!this.value) {
        return
      }

      const content = this.value
      this.lastSaveContent = content
      File.write(file.repo, file.path, content, () => {
        this.status = '保存于：' + (new Date()).toLocaleString()
      }, e => {
        this.file = null
        alert(e.message)
      })
    },
    pasteImg (file) {
      File.upload(this.file.repo, this.file.path, file, ({relativePath}) => {
        this.$refs.tree.change()
        this.$refs.editor.insert(`![图片](${encodeURI(relativePath)})\n`)
      })
    },
    uploadFile (file) {
      File.upload(this.file.repo, this.file.path, file, ({relativePath}) => {
        this.$refs.tree.change()
        this.$refs.editor.insert(`附件：[${file.name} (${(file.size / 1024).toFixed(2)}KiB)](${encodeURI(relativePath).replace('(', '%28').replace(')', '%29')}){class=open target=_blank}\n`)
      }, `${dayjs().format('YYYYMMDDHHmmss')}.${file.name}`)
    },
    switchTodoEditor (line, checked) {
      this.$refs.editor.switchTodo(line, checked)
    },
    syncScrollEditor (line) {
      this.$refs.editor.revealLine(line)
    },
    syncScrollView (line) {
      this.$refs.view.revealLine(line)
    }
  },
  watch: {
    value () {
      this.restartTimer()
    },
    file (f, oldf) {
      this.clearTimer()

      if (oldf) {
        this.saveFile(oldf)
      }

      if (f) {
        File.read(f.repo, f.path, data => {
          this.lastSaveContent = data
          this.$refs.editor.setValue(data)
          this.status = '加载完毕'
          window.document.title = f.name
        }, e => {
          this.file = null
          alert(e.message)
        })
      } else {
        window.document.title = '未打开文件'
        this.lastSaveContent = '\n'
        this.$refs.editor.setValue('\n')
      }
    }
  },
  computed: {
    unsaved () {
      return this.value !== this.lastSaveContent
    },
    fileName () {
      return this.file ? this.file.name : null
    },
    filePath () {
      return this.file ? this.file.path : null
    },
    fileRepo () {
      return this.file ? this.file.repo : null
    }
  }
}
</script>

<style scoped>
.tree {
  height: 95vh;
  width: 17vw;
  padding-bottom: 20px;
  box-sizing: border-box;
  overflow: auto;
}

.editor {
  height: 95vh;
  width: 40vw;
  overflow: hidden;
}

.view {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
  width: 43vw;
  height: 95vh;
  overflow: auto;
  box-sizing: border-box;
}

@media (max-width: 767px) {
  .view {
    padding: 15px;
  }
}

.header {
  background: #4e4e4e;
  color: #eee;
  line-height: 5vh;
  height: 5vh;
  transition: all .3s ease-in-out;
}

.header > div {
  max-width: 900px;
  margin: 0 auto;
}

.status-bar {
  position: fixed;
  left: 0;
  width: 100%;
  bottom: 0;
}

@media print {
  .editor, .header, .tree, .status-bar {
    display: none;
  }

  .view {
    min-width: auto;
    max-width: auto;
    margin: 0 auto;
    width: auto;
    height: auto;
    overflow: hidden;
  }
}
</style>
