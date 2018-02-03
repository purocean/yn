<template>
  <div style="display: flex; just-content: ">
    <Tree class="tree"></Tree>
    <Editor class="editor" v-model="value"></Editor>
    <XView class="view" :value="value"></XView>
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
      value: '# jlkjkl'
    }
  },
  mounted () {
  },
  methods: {
  },
  watch: {
  }
}
</script>

<style scoped>
.tree {
  height: 90vh;
  width: 20vw;
}

.editor {
  height: 90vh;
  width: 40vw;
}

.view {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
  width: 40vw;
}

@media (max-width: 767px) {
  .view {
    padding: 15px;
  }
}
</style>
