<template>
  <aside>
    <TreeNode
      v-for="item in tree"
      :slected-file="file"
      :item="item"
      :key="item.path"
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
.markdown-body {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
  width: 50vw;
}

@media (max-width: 767px) {
  .markdown-body {
    padding: 15px;
  }
}
</style>
