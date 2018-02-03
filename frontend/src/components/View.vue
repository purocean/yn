<template>
  <article ref="view" class="markdown-body"></article>
</template>

<script>
import 'github-markdown-css/github-markdown.css'
import Markdown from 'markdown-it'
import TaskLists from 'markdown-it-task-lists'

export default {
  name: 'view',
  props: {
    value: String
  },
  data () {
    return {
      markdown: Markdown().use(TaskLists)
    }
  },
  mounted () {
    this.render(this.value)
  },
  methods: {
    render (val) {
      this.$refs.view.innerHTML = this.markdown.render(val)
    }
  },
  watch: {
    value (val) {
      this.render(val)
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
