<template>
  <div>
    <header class="header" :style="unsaved ? 'background: orange' : ''">
      <div>
        <h4 style="margin: 0;text-align: center"> {{statusText}}</h4>
      </div>
    </header>
    <div style="display: flex; justify-content: space-between;" :class="{'show-view': showView}">
      <Tree ref="tree" class="tree" v-model="file"></Tree>
      <div style="display: flex;flex-direction: column; height: 95vh">
        <div style="display: flex;height: 100%">
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
            :show-xterm="showXterm"
            @sync-scroll="syncScrollEditor"
            @switch-todo="switchTodoEditor"></XView>
        </div>
        <Xterm ref="xterm" v-show="showXterm"></Xterm>
      </div>
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
import Xterm from '../components/Xterm'
import Tree from '../components/Tree'
import StatusBar from '../components/StatusBar'
import RunPlugin from '../components/RunPlugin'
import File from '../file'

export default {
  name: 'home',
  components: { XView, Editor, Tree, StatusBar, Xterm },
  data () {
    return {
      status: '请选择文件',
      value: '',
      lastSaveContent: '',
      file: null,
      oldHash: null,
      timer: null,
      showView: true,
      showXterm: false
    }
  },
  mounted () {
    RunPlugin.clearCache()
    this.restartTimer()

    this.$bus.on('toggle-view', this.toggleView)
    this.$bus.on('toggle-xterm', this.toggleXterm)
    this.$bus.on('toggle-readme', this.toggleReadme)

    window.onbeforeunload = () => {
      return this.unsaved || null
    }
  },
  beforeDestroy () {
    this.$bus.off('toggle-view', this.toggleView)
    this.$bus.off('toggle-xterm', this.toggleXterm)
    this.$bus.off('toggle-readme', this.toggleReadme)
    this.clearTimer()
  },
  methods: {
    toggleReadme () {
      if (this.file && this.file.repo === '__readme__') {
        this.$refs.tree.closeCurrentFile()
        this.file = null
      } else {
        File.readme(content => {
          this.file = {
            repo: '__readme__',
            title: 'README.md',
            content
          }
        })
      }
    },
    toggleView () {
      this.showView = !this.showView
    },
    toggleXterm (flag) {
      this.showXterm = flag === undefined ? !this.showXterm : !!flag
      this.$nextTick(() => {
        this.$refs.editor.resize()
        this.$refs.xterm.init()
      })
    },
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

      if (!(this.file && this.file.repo && this.file.path)) {
        return
      }

      this.timer = window.setTimeout(() => {
        if (!this.file || this.file.path.endsWith('.c.md')) { // 加密文件不自动保存
          return
        }

        this.saveFile()
      }, 2000)
    },
    saveFile (f = null) {
      const file = f || this.file

      if (!(file && file.repo && file.path)) {
        return
      }

      if (this.lastSaveContent === this.value) {
        return
      }

      if (!this.value) {
        return
      }

      const content = this.value
      File.write(file.repo, file.path, content, this.oldHash, result => {
        this.oldHash = result.data
        this.lastSaveContent = content
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
        this.$refs.editor.insert(`附件 [${dayjs().format('YYYY-MM-DD HH:mm')}]：[${file.name} (${(file.size / 1024).toFixed(2)}KiB)](${encodeURI(relativePath).replace('(', '%28').replace(')', '%29')}){class=open target=_blank}\n`)
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
    showView () {
      this.$nextTick(() => {
        this.$refs.editor.resize()
      })
    },
    value () {
      this.restartTimer()
    },
    file (f, oldf) {
      this.clearTimer()

      if (oldf && oldf.repo && oldf.path) {
        this.saveFile(oldf)
      }

      if (f) {
        if (f.title) {
          window.document.title = f.title
          this.lastSaveContent = f.content
          this.$refs.editor.setValue(f.content)
        } else {
          File.read(f.repo, f.path, (data, hash) => {
            this.lastSaveContent = data
            this.$refs.editor.setValue(data)
            this.oldHash = hash
            this.status = '加载完毕'
            window.document.title = f.name
          }, e => {
            this.file = null
            alert(e.message)
          })
        }
      } else {
        window.document.title = '未打开文件'
        this.lastSaveContent = '\n'
        this.$refs.editor.setValue('\n')
      }

      // 切换文件时候定位到第一行
      this.$refs.editor.setPosition({column: 1, lineNumber: 1})
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
    },
    statusText () {
      if (this.file) {
        if (this.file.path && this.file.repo) {
          return `${this.file.path}-${this.status} [${this.file.repo}]`
        } else {
          return this.file.title
        }
      } else {
        return '未打开文件'
      }
    }
  }
}
</script>

<style scoped>
@media screen {
  .tree {
    height: 95vh;
    width: 17vw;
    padding-bottom: 20px;
    box-sizing: border-box;
    overflow: auto;
    flex: 0 0 auto;
  }

  .show-view .editor {
    width: 40vw;
  }

  .editor {
    /* height: 95vh; */
    width: 83vw;
    overflow: hidden;
  }

  .show-view .view {
    width: 43vw;
    min-width: 200px;
    display: block;
  }

  .view {
    box-sizing: border-box;
    max-width: 980px;
    margin: 0 auto;
    padding: 45px;
    width: 43vw;
    /* height: 95vh; */
    overflow: auto;
    box-sizing: border-box;
    display: none;
  }
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
