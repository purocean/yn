<template>
  <div class="title-bar" :style="saved ? '' : 'background: orange'">
    <h4 class="title"> {{statusText}}</h4>
  </div>
</template>

<script>
import { mapState } from 'vuex'

const isElectron = !!(window && window.process && window.process.versions && window.process.versions['electron'])

export default {
  name: 'title-bar',
  mounted () {
    if (!isElectron) {
      window.onbeforeunload = () => {
        return !this.saved || null
      }
    }
  },
  beforeDestroy () {
    if (!isElectron) {
      window.onbeforeunload = null
    }
  },
  computed: {
    ...mapState('app', ['currentFile', 'savedAt', 'previousContent', 'currentContent']),
    saved () {
      return this.previousContent === this.currentContent
    },
    status () {
      if (this.savedAt === null && this.currentFile) {
        return '加载完毕'
      } else if (this.savedAt) {
        return '保存于：' + this.savedAt.toLocaleString()
      }

      return ''
    },
    statusText () {
      const file = this.currentFile
      if (file) {
        if (file.repo === '__help__') {
          return file.title
        }

        if (file.path && file.repo) {
          return `${file.path}-${this.status} [${file.repo}]`
        } else {
          return file.name
        }
      } else {
        return '未打开文件'
      }
    }
  },
  watch: {
    statusText: {
      immediate: true,
      handler (val) {
        document.title = val + ' - Yank Note 一款面向程序员的 Markdown 编辑器'
      },
    },
    saved: {
      immediate: true,
      handler (val) {
        window.documentSaved = val
      },
    },
  }
}
</script>

<style scoped>

.title-bar {
  background: #4e4e4e;
  color: #eee;
  height: 100%;
  transition: all .3s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  margin: 0;
  text-align: center;
}
</style>
