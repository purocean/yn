<template>
  <article ref="view" class="markdown-body"></article>
</template>

<script>
import 'github-markdown-css/github-markdown.css'
import 'highlight.js/styles/github-gist.css'
import _ from 'lodash'
import Markdown from 'markdown-it'
import TaskLists from 'markdown-it-task-lists'
import Plantuml from 'markdown-it-plantuml'
import katex from 'markdown-it-katex'
import RunPlugin from './RunPlugin'

import Highlight from 'highlight.js'
import MermaidPlugin from './MermaidPlugin'

import 'katex/dist/katex.min.css'

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
      }).use(TaskLists).use(MermaidPlugin).use(Plantuml, {
        generateSource: umlCode => {
          return '/api/plantuml/svg?data=' + encodeURIComponent(umlCode)
        }
      }).use(RunPlugin).use(katex)
    }
  },
  mounted () {
    this.render = _.debounce(() => {
      this.$refs.view.innerHTML = this.markdown.render(this.value)
      MermaidPlugin.update()
    }, 500)

    this.render()
  },
  watch: {
    value () {
      this.render()
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
