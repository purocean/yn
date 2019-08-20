<template>
  <div class="status-bar">
    <RepositorySwitch class="left"></RepositorySwitch>
    <div class="right">
      <div class="document-info">
        <span>行：{{documentInfo.line}}</span>
        <span>列：{{documentInfo.column}}</span>
        <span>总行数：{{documentInfo.lineCount}}</span>
        <span>字符数：{{documentInfo.textLength}}</span>
        <span v-if="documentInfo.selectedLength > 0">已选中：{{documentInfo.selectedLength}}</span>
      </div>
      <div class="action" @click="toggleSide" title="Alt + e">切换侧栏</div>
      <div class="action" @click="toggleWrap" title="Alt + w">切换换行</div>
      <div class="action" @click="toggleView" title="Alt + v">切换预览</div>
      <div class="action" @click="toggleXterm" title="Alt + o">切换终端</div>
      <div class="action" @click="toggleReadme" title="Alt + h">README</div>
      <div class="action" @click="toggleFeature">特色功能说明</div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import RepositorySwitch from './RepositorySwitch'

export default {
  name: 'status-bar',
  components: { RepositorySwitch },
  created () {
    window.addEventListener('keydown', this.keydownHandler, true)
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.keydownHandler)
  },
  methods: {
    toggleSide () {
      this.$bus.emit('toggle-side')
    },
    toggleView () {
      this.$bus.emit('toggle-view')
    },
    toggleXterm () {
      this.$bus.emit('toggle-xterm')
    },
    toggleFeature () {
      this.$store.dispatch('app/showHelp', 'FEATURES.md')
    },
    toggleReadme () {
      this.$store.dispatch('app/showHelp', 'README.md')
    },
    toggleWrap () {
      this.$bus.emit('editor-toggle-wrap')
    },
    keydownHandler (e) {
      if (e.key === 'e' && e.altKey) {
        this.toggleSide()
        e.preventDefault()
        e.stopPropagation()
      }

      if (e.key === 'v' && e.altKey) {
        this.toggleView()
        e.preventDefault()
        e.stopPropagation()
      }

      if (e.key === 'o' && e.altKey) {
        this.toggleXterm()
        e.preventDefault()
        e.stopPropagation()
      }

      if (e.key === 'w' && e.altKey) {
        this.toggleWrap()
        e.preventDefault()
        e.stopPropagation()
      }

      if (e.key === 'h' && e.altKey) {
        this.toggleReadme()
        e.preventDefault()
        e.stopPropagation()
      }
    }
  },
  watch: {
  },
  computed: {
    ...mapState('app', ['documentInfo'])
  }
}
</script>

<style scoped>
.left {
  display: flex;
}

.right {
  display: flex;
}

.status-bar {
  box-sizing: border-box;
  padding: 0 1em;
  color: #eee;
  background: #4e4e4e;
  font-size: 12px;
  line-height: 20px;
  height: 100%;
  display: flex;
  justify-content: space-between;
}

.document-info {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-info > span {
  display: inline-block;
  padding: 0 .2em;
}

.action {
  padding: 0 .5em;
  /* margin-left: 1em; */
  cursor: pointer;
  user-select: none;
  flex: none;
}

.action:hover {
  background: #2e2e2e;
}
</style>
