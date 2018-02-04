<template>
  <article ref="view" class="markdown-body"></article>
</template>

<script>
import 'github-markdown-css/github-markdown.css'
import 'highlight.js/styles/github-gist.css'
import Markdown from 'markdown-it'
import TaskLists from 'markdown-it-task-lists'
import Highlight from 'highlight.js'

export default {
  name: 'xview',
  props: {
    value: String
  },
  data () {
    return {
      markdown: Markdown({
        linkify: true,
        breaks: true,
        highlight: (str, lang) => {
          if (lang && Highlight.getLanguage(lang)) {
            try {
              return Highlight.highlight(lang, str).value
            } catch (__) {}
          }

          return ''
        }
      }).use(TaskLists)
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
