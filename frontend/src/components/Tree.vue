<template>
  <aside class="side">
    <TreeNode
      v-for="item in tree"
      :slected-file="file"
      :item="item"
      :key="item.path"
      @move="onMove"
      @change="change"
      @select="f => file = f"
      @delete="onDelete"
      ></TreeNode>
  </aside>
</template>

<script>
import TreeNode from './TreeNode'
import File from '../file'

export default {
  name: 'tree',
  components: { TreeNode },
  data () {
    return {
      tree: [],
      file: null
    }
  },
  mounted () {
    this.init()
  },
  methods: {
    init () {
      File.tree(tree => {
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
    }
  },
  watch: {
    file (f) {
      this.$emit('input', f)
    }
  }
}
</script>

<style scoped>
.side {
  color: #ddd;
}
</style>
