<template>
  <div>
    <header class="header">
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
    <div style="display: flex; just-content: ">
      <Tree class="tree" v-model="file"></Tree>
      <Editor ref="editor" class="editor" v-model="value"></Editor>
      <XView class="view" :value="value"></XView>
    </div>
  </div>
</template>

<script>
import Editor from '../components/Editor'
import XView from '../components/View'
import Tree from '../components/Tree'
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
    this.timer = window.setInterval(() => {
      this.saveFile(this.file)
    }, 5000)
  },
  beforeDestroy () {
    if (this.timer) {
      window.clearInterval(this.timer)
    }
  },
  methods: {
    saveFile (file) {
      if (!file) {
        return
      }

      if (this.lastSaveContent === this.value) {
        return
      }

      const content = this.value
      this.lastSaveContent = content
      File.write(file.path, content, () => {
        this.status = '保存于：' + (new Date()).toLocaleString()
      })
    }
  },
  watch: {
    file (f) {
      if (f) {
        File.read(f.path, data => {
          this.$refs.editor.setValue(data)
          this.status = '加载完毕'
        })
      } else {
        this.$refs.editor.setValue('')
      }
    }
  }
}
</script>

<style scoped>
.tree {
  height: 95vh;
  width: 20vw;
}

.editor {
  height: 80vh;
  width: 40vw;
}

.view {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
  width: 40vw;
  height: 95vh;
  overflow: auto;
}

@media (max-width: 767px) {
  .view {
    padding: 15px;
  }
}

.header {
  background: rgb(209, 209, 209);
  line-height: 5vh;
}

.header > div {
  max-width: 900px;
  margin: 0 auto;
}
</style>
