<template>
  <div style="display: flex; just-content: ">
    <div id="editor" class="editor">
    </div>
    <article ref="view" class="markdown-body"></article>
  </div>
</template>

<script>
import 'github-markdown-css/github-markdown.css'
import Markdown from 'markdown-it'
import TaskLists from 'markdown-it-task-lists'

export default {
  name: 'home',
  data () {
    return {
      markdown: null,
      editor: null
    }
  },
  mounted () {
    this.markdown = Markdown().use(TaskLists)

    if (!(window).require) {
      let loaderScript = document.createElement('script')
      loaderScript.type = 'text/javascript'
      loaderScript.src = 'vs/loader.js'
      loaderScript.addEventListener('load', this.onGotAmdLoader)
      document.body.appendChild(loaderScript)
    } else {
      this.onGotAmdLoader()
    }
  },
  methods: {
    onGotAmdLoader () {
      window.require(['vs/editor/editor.main'], () => {
        this.initMonaco()
      })
    },
    initMonaco () {
      this.editor = window.monaco.editor.create(window.document.getElementById('editor'), {
        value: [
          'function x() {',
          '\tconsole.log("Hello world!");',
          '}'
        ].join('\n'),
        language: 'markdown',
        theme: 'vs-dark'
      })

      console.log(this.editor)

      this.editor.onDidChangeModelContent((e) => {
        this.$refs.view.innerHTML = this.markdown.render(this.editor.getModel().getValue())
      })
    }
  }
}
</script>

<style scoped>
.editor {
  height: 90vh;
  width: 50vw;
}

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
