<template>
  <div>
    <header class="header">
      <div>
        <h4 style="padding: .5em;margin: 0"> {{ file.name }}-{{ status }} </h4>
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

export default {
  name: 'home',
  components: { XView, Editor, Tree },
  data () {
    return {
      status: '请选择文件',
      value: '',
      lastSaveContent: '',
      file: {name: '未选择文件'},
      timer: null
    }
  },
  mounted () {
    this.timer = window.setInterval(() => {
      this.saveFile(this.file.path)
    }, 5000)
  },
  beforeDestroy () {
    if (this.timer) {
      window.clearInterval(this.timer)
    }
  },
  methods: {
    saveFile (path) {
      if (!path) {
        return
      }

      if (this.lastSaveContent === this.value) {
        return
      }

      const content = this.value
      this.lastSaveContent = content
      fetch('/api/file', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path, content})
      }).then(response => {
        response.json().then(result => {
          if (result.status === 'ok') {
            this.status = '保存于：' + (new Date()).toLocaleString()
          }
        })
      })
    }
  },
  watch: {
    file (f) {
      fetch(`/api/file?path=${encodeURIComponent(f.path)}`).then(response => {
        response.json().then(result => {
          if (result.status === 'ok') {
            this.$refs.editor.setValue(result.data)
            this.status = '加载完毕'
          }
        })
      })
    }
  }
}
</script>

<style scoped>
.tree {
  height: 90vh;
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
  height: 90vh;
  overflow: auto;
}

@media (max-width: 767px) {
  .view {
    padding: 15px;
  }
}

.header {
  background: rgb(209, 209, 209);
  height: 10vh;
}

.header > div {
  max-width: 900px;
  margin: 0 auto;
}
</style>
