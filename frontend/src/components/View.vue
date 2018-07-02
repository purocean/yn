<template>
  <div class="view">
    <div class="convert">
      <form ref="convertForm" :action="`/api/convert/${convert.fileName}`" method="post" target="_blank">
        <input type="hidden" name="html" :value="convert.html">
        <input type="hidden" name="type" :value="convert.type">
        <!-- <button type="button" @click="convertFile('pdf')">pdf</button> -->
        <button type="button" @click="convertFile('docx')">docx</button>
      </form>
    </div>
    <div ref="outline" class="outline">
      <div style="padding: .5em;"><b>目录</b></div>
      <div class="catalog">
        <div v-for="(head, index) in heads" :key="index" :style="{paddingLeft: `${head.level + 1}em`}" @click="syncScroll(head.sourceLine)">
          {{ head.text }}
          <span style="color: #666;font-size: 12px;padding-left: .5em">{{head.tag}}</span>
        </div>
      </div>
    </div>
    <article ref="view" class="markdown-body" @click="handleClick"></article>
  </div>
</template>

<script>
import 'github-markdown-css/github-markdown.css'
import 'highlight.js/styles/github-gist.css'
import _ from 'lodash'
import Markdown from 'markdown-it'
import TaskLists from 'markdown-it-task-lists'
import Plantuml from 'markdown-it-plantuml'
import katex from 'markdown-it-katex'
import MarkdownItAttrs from 'markdown-it-attrs'
import MultimdTable from 'markdown-it-multimd-table'
import RunPlugin from './RunPlugin'
import SourceLinePlugin from './SourceLinePlugin'

import Highlight from 'highlight.js'
import MermaidPlugin from './MermaidPlugin'

import 'katex/dist/katex.min.css'

export default {
  name: 'xview',
  props: {
    value: String,
    fileName: String,
    filePath: String
  },
  data () {
    return {
      heads: [],
      convert: {},
      markdown: Markdown({
        linkify: true,
        breaks: true,
        html: true,
        highlight: (str, lang) => {
          if (lang && Highlight.getLanguage(lang)) {
            try {
              return Highlight.highlight(lang, str).value
            } catch (__) {}
          }

          return ''
        }
      }).use(TaskLists, {enabled: true}).use(MermaidPlugin).use(Plantuml, {
        generateSource: umlCode => {
          return 'api/plantuml/png?data=' + encodeURIComponent(umlCode)
        }
      }).use(RunPlugin).use(katex).use(SourceLinePlugin).use(MarkdownItAttrs).use(MultimdTable, {enableMultilineRows: true})
    }
  },
  mounted () {
    this.render = _.debounce(() => {
      this.$refs.view.innerHTML = this.markdown.render(this.replaceImage(this.value))
      MermaidPlugin.update()
      this.updateOutline()
    }, 500)

    this.render()
  },
  methods: {
    replaceImage (md) {
      const basePath = this.filePath.substr(0, this.filePath.lastIndexOf('/'))
      return md.replace(/!\[([^\]]*)\]\(\.\/([^)]+)\)/g, `![$1](api/attachment?path=${encodeURI(basePath)}/$2)`)
    },
    updateOutline () {
      const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
      const nodes = this.$refs.view.querySelectorAll(tags.join(','))
      this.heads = Array.from(nodes).map(node => {
        return {
          tag: node.tagName.toLowerCase(),
          text: node.innerText,
          level: tags.indexOf(node.tagName.toLowerCase()),
          sourceLine: parseInt(node.dataset['sourceLine'])
        }
      })
    },
    handleClick (e) {
      if (e.target.tagName === 'INPUT' && e.target.parentElement.classList.contains('source-line')) {
        this.switchTodo(parseInt(e.target.parentElement.dataset['sourceLine']), e.target.checked)
        return
      }

      if (e.target.classList.contains('source-line')) {
        this.syncScroll(parseInt(e.target.dataset['sourceLine']))
        e.preventDefault()
      }
    },
    syncScroll (line) {
      this.$emit('sync-scroll', line)
    },
    switchTodo (line, checked) {
      this.$emit('switch-todo', line, checked)
    },
    revealLine (line) {
      const nodes = document.querySelectorAll('.view .source-line')
      for (let ele of nodes) {
        if (parseInt(ele.dataset['sourceLine']) >= line) {
          ele.scrollIntoView()
          break
        }
      }
    },
    convertFile (type) {
      const baseUrl = location.origin + location.pathname.substring(0, location.pathname.lastIndexOf('/')) + '/'

      this.convert = {
        fileName: (this.fileName || '未命名') + `.${type}`,
        html: this.$refs.view.outerHTML.replace(/src="api/g, `src="${baseUrl}api`),
        type
      }
      setTimeout(() => {
        this.$refs.convertForm.submit()
      }, 300)
    }
  },
  watch: {
    value () {
      this.render()
    }
  }
}
</script>

<style scoped>
.view {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
  width: 50vw;
  position: relative;
}

.outline {
  position: fixed;
  right: 3em;
  background: #eee;
  font-size: 14px;
  max-height: 3.2em;
  max-width: 2em;
  overflow: hidden;
  transition: .1s ease-in-out;
  z-index: 500;
}

.outline:hover {
  max-height: 88vh;
  max-width: 20em;
}

.outline > .catalog {
  max-height: 80vh;
  cursor: pointer;
  overflow: auto;
  padding-bottom: 1em;
}

.outline > .catalog > div {
  padding: .5em;
}

.outline > .catalog > div:hover {
  background: #fff;
}

.convert {
  position: fixed;
  font-size: 14px;
  right: 3em;
  margin-top: -2.5em;
  z-index: 500;
}

@media print {
  .outline,
  .convert {
    display: none;
  }
  .view {
    min-width: 100%;
    max-width: 100%;
    width: 100%;
    height: auto;
  }
}

@media (max-width: 767px) {
  .view {
    padding: 15px;
  }
}
</style>

<style>
.view img {
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.view img.inline {
  display: inline;
}

.view .new-page {
  page-break-before: always;
}
</style>
