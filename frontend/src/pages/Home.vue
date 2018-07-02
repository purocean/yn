<template>
  <div>
    <header class="header" :style="unsaved ? 'background: orange' : ''">
      <div>
        <h4 style="margin: 0;text-align: center">
          <span v-if="file">
            {{ file.path }}-{{ status }}
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
        @save="saveFile"></Editor>
      <XView
        ref="view"
        class="view"
        :value="value"
        :file-name="fileName"
        :file-path="filePath"
        @sync-scroll="syncScrollEditor"
        @switch-todo="switchTodoEditor"></XView>
    </div>
  </div>
</template>

<script>
import Editor from '../components/Editor'
import XView from '../components/View'
import Tree from '../components/Tree'
import RunPlugin from '../components/RunPlugin'
import File from '../file'

export default {
  name: 'home',
  components: { XView, Editor, Tree },
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
      File.write(file.path, content, () => {
        this.status = '保存于：' + (new Date()).toLocaleString()
      }, e => {
        this.file = null
        alert(e.message)
      })
    },
    pasteImg (file) {
      File.upload(this.file.path, file, ({relativePath}) => {
        this.$refs.tree.change()
        this.$refs.editor.insert(`![图片](${encodeURI(relativePath)})\n`)
      })
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
        File.read(f.path, data => {
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
        this.lastSaveContent = ''
        this.$refs.editor.setValue('')
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
    }
  }
}
</script>

<style scoped>
.tree {
  height: 95vh;
  width: 20vw;
  overflow: auto;
}

.editor {
  height: 95vh;
  width: 50vw;
  overflow: hidden;
}

.view {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
  width: 30vw;
  height: 95vh;
  overflow: auto;
}

@media (max-width: 767px) {
  .view {
    padding: 15px;
  }
}

.header {
  background: #89e8e5;
  line-height: 5vh;
  height: 5vh;
}

.header > div {
  max-width: 900px;
  margin: 0 auto;
}

@media print {
  .editor, .header, .tree {
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
