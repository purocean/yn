<template>
  <div style="display: flex; just-content: ">
    <Editor class="editor" v-model="value"></Editor>
    <XView class="Xview" :value="value"></XView>
  </div>
</template>

<script>
import Editor from '../components/Editor'
import XView from '../components/View'

export default {
  name: 'home',
  components: { XView, Editor },
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
.editor {
  height: 90vh;
  width: 50vw;
}

.view {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
  width: 50vw;
}

@media (max-width: 767px) {
  .view {
    padding: 15px;
  }
}
</style>
