<template>
  <aside class="side">
    <div class="loading" v-if="tree === null"> 加载中 </div>
    <template v-else>
      <TreeNode
        v-for="item in tree"
        :slected-file="file"
        :item="item"
        :key="item.path"
        @move="onMove"
        @change="change"
        @select="f => file = f"
        @delete="onDelete" />
        <transition name="fade">
          <div v-if="showFilter" class="filter-wrapper" @click="showFilter = false">
            <XFilter @choose-file="f => { showFilter = false }" :repo="repo" :files="files" />
          </div>
        </transition>
    </template>
  </aside>
</template>

<script>
import File from '../file'
import TreeNode from './TreeNode'
import XFilter from './Filter'

export default {
  name: 'tree',
  components: { TreeNode, XFilter },
  data () {
    return {
      repo: null,
      tree: null,
      file: null,
      showFilter: false
    }
  },
  created () {
    window.addEventListener('keydown', this.keydownHandler, true)
    this.$bus.on('switch-repository', this.init)
  },
  mounted () {
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.keydownHandler)
    this.$bus.off('switch-repository', this.init)
  },
  methods: {
    init (repo = null) {
      if (repo) {
        this.repo = repo
        this.tree = null
      }

      File.tree(this.repo, tree => {
        this.tree = tree
      })
    },
    onDelete (path) {
      // 删除了正在编辑的文件或者其父目录
      if (this.file && this.file.path.startsWith(path)) {
        this.file = null
      }

      this.init()
    },
    onMove (oldPath) {
      // 移动了正在编辑的文件或者其父目录
      if (this.file && this.file.path.startsWith(oldPath)) {
        this.file = null
      }

      this.init()
    },
    change (path) {
      this.init()
    },
    keydownHandler (e) {
      if (e.key === 'p' && e.ctrlKey) {
        this.showFilter = true
        e.preventDefault()
        e.stopPropagation()
      } else if (e.key === 'Escape' && this.showFilter) {
        this.showFilter = false
        e.preventDefault()
        e.stopPropagation()
      }
    },
    travelFiles (tree) {
      let tmp = []

      tree.forEach(node => {
        if (node.type === 'file' && node.path.endsWith('.md')) {
          tmp.push(node)
        }

        if (Array.isArray(node.children)) {
          tmp = tmp.concat(this.travelFiles(node.children))
        }
      })

      return tmp
    }
  },
  watch: {
    file (f) {
      this.$emit('input', f)
    }
  },
  computed: {
    files () {
      return this.travelFiles(this.tree)
    }
  }
}
</script>

<style scoped>
.side {
  color: #ddd;
}

.filter-wrapper {
  position: fixed;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, .2);
  z-index: 99999;
  padding-top: 4em;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

.loading {
  font-size: 32px;
  text-align: center;
  padding-top: 50%;
  color: #848181;
}
</style>
