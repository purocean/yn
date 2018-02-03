<template>
  <aside>
    <TreeNode v-for="item in tree" :item = "item" :key="item.path"></TreeNode>
  </aside>
</template>

<script>
import TreeNode from './TreeNode'

export default {
  name: 'tree',
  components: { TreeNode },
  data () {
    return {
      tree: []
    }
  },
  mounted () {
    fetch('/api/tree').then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          this.tree = result.data
        }
      })
    })
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
