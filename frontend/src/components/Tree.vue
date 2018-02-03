<template>
  <aside>
    <TreeNode v-for="item in tree" :item = "item" :key="item.path" @change="change" @select="f => file = f"></TreeNode>
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
