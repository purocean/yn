<template>
  <div ref="view-wrapper" class="view" @scroll="handleScroll">
    <div class="action-bar" :style="{width: (width - 50) + 'px'}">
      <div :style="{background: todoCount ? '#4e4e4e' : 'transparent'}">
        <div v-if="todoCount" class="todo-progress">
          <div :style="{
            backgroundColor: `rgb(${220 - 220 * todoDoneCount / todoCount}, ${200 * todoDoneCount / todoCount}, 0)`,
            width: `${todoDoneCount * 100 / todoCount}%`
          }"> {{(todoDoneCount * 100 / todoCount).toFixed(2)}}% {{todoDoneCount}}/{{todoCount}} </div>
        </div>
        <div v-else></div>
        <div class="convert">
          <form ref="convertForm" :action="`/api/convert/${convert.fileName}`" method="post" target="_blank">
            <input type="hidden" name="html" :value="convert.html">
            <input type="hidden" name="type" :value="convert.type">
            <!-- <button type="button" @click="convertFile('pdf')">pdf</button> -->
            <button type="button" @click="print()">打印</button>
            <button type="button" @click="convertFile('docx')">docx</button>
          </form>
        </div>
      </div>
    </div>
    <div ref="outline" class="outline">
      <div style="padding: .5em;"><b>目录</b></div>
      <div class="catalog" :style="{maxHeight: (height - 120) + 'px'}">
        <div v-for="(head, index) in heads" :key="index" :style="{paddingLeft: `${head.level + 1}em`}" @click="syncScroll(head.sourceLine)">
          {{ head.text }}
          <span style="color: #666;font-size: 12px;padding-left: .5em">{{head.tag}}</span>
        </div>
      </div>
    </div>
    <div :class="{'scroll-to-top': true, 'hide': scrollTop < 30}" :style="{top: (height - 40) + 'px'}" @click="scrollToTop">TOP</div>
    <article ref="view" class="markdown-body" @click="handleClick"></article>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import _ from 'lodash'
import mime from 'mime-types'
import Markdown from 'markdown-it'
import TaskLists from 'markdown-it-task-lists'
import katex from 'markdown-it-katex'
import MarkdownItAttrs from 'markdown-it-attrs'
import MultimdTable from 'markdown-it-multimd-table'
import Highlight from 'highlight.js'

import HighlightLineNumber from '../plugins/HightLightNumberPlugin'
import MarkdownItToc from '../plugins/TocPlugin'
import MarkdownItECharts from '../plugins/EChartsPlugin'
import RunPlugin from '../plugins/RunPlugin'
import SourceLinePlugin from '../plugins/SourceLinePlugin'
import LinkTargetPlugin from '../plugins/LinkTargetPlugin'
import PlantumlPlugin from '../plugins/PlantumlPlugin'
import file from '@/lib/file'

import 'github-markdown-css/github-markdown.css'
import 'highlight.js/styles/atom-one-dark.css'
import 'katex/dist/katex.min.css'
HighlightLineNumber.addStyles()

const markdown = Markdown({
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
})
  .use(TaskLists, { enabled: true })
  .use(PlantumlPlugin)
  .use(RunPlugin)
  .use(katex)
  .use(SourceLinePlugin)
  .use(MarkdownItAttrs)
  .use(LinkTargetPlugin)
  .use(MultimdTable, { enableMultilineRows: true })
  .use(MarkdownItToc)
  .use(MarkdownItECharts)

export default {
  name: 'xview',
  data () {
    return {
      width: 1024,
      height: 1024,
      heads: [],
      convert: {},
      todoCount: 0,
      todoDoneCount: 0,
      scrollTop: 0,
    }
  },
  mounted () {
    this.updatePlantumlDebounce = _.debounce(() => {
      this.updatePlantuml()
    }, 3000)

    this.render = _.debounce(() => {
      this.$refs.view.innerHTML = markdown.render(this.replaceRelativeLink(this.currentContent))
      MarkdownItECharts.update()
      this.updateOutline()
      this.updateTodoCount()
      this.updatePlantumlDebounce()

      for (let ele of document.querySelectorAll('code[class^="language-"]')) {
        HighlightLineNumber.lineNumbersBlock(ele)
      }

      for (let ele of document.getElementsByTagName('a')) {
        const href = ele.getAttribute('href')
        if (href && href.startsWith('#')) {
          ele.onclick = () => {
            document.getElementById(href.replace(/^#/, '')).scrollIntoView()
            return false
          }
        }
      }
    }, 500, { leading: true })

    this.render()
    setTimeout(() => {
      this.updatePlantuml()
    }, 100)

    window.addEventListener('keydown', this.keydownHandler, true)
    this.$bus.on('resize', this.resizeHandler)
    this.resizeHandler()
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.keydownHandler)
    this.$bus.off('resize', this.resizeHandler)
  },
  methods: {
    resizeHandler () {
      this.width = this.$refs['view-wrapper'].clientWidth
      this.height = this.$refs['view-wrapper'].clientHeight
    },
    keydownHandler (e) {
      // 转换所有外链图片到本地
      if (e.key === 'l' && e.ctrlKey && e.altKey) {
        this.$refs.view.querySelectorAll('img').forEach(img => {
          this.transformImgOutLink(img)
        })
        e.preventDefault()
        e.stopPropagation()
      }
    },
    handleScroll (e) {
      this.scrollTop = e.target.scrollTop
    },
    scrollToTop () {
      this.$refs['view-wrapper'].scrollTo(0, 0)
      this.syncScroll(1)
    },
    replaceRelativeLink (md) {
      if (!this.fileRepo) {
        return md
      }

      if (this.fileRepo === '__readme__') {
        return md.replace(/\[([^\]]*)\]\((\.\/[^)]*)\)/g, `[$1](api/readme/file?path=$2)`)
          .replace(/<img([^>]*)src=["']?([^\s'"]*)["']?/ig, `<img$1src="api/readme/file?path=$2"`)
      }

      if (!this.filePath) {
        return md
      }

      const basePath = this.filePath.substr(0, this.filePath.lastIndexOf('/'))
      const repo = this.fileRepo
      return md.replace(/\[([^\]]*)\]\(\.\/([^)]*)\/([^)/]+)\)/g, `[$1](api/attachment/$3?repo=${repo}&path=${encodeURI(basePath)}%2F$2%2F$3)`)
    },
    updatePlantuml () {
      const nodes = this.$refs.view.querySelectorAll('img[data-plantuml-src]')
      for (let ele of nodes) {
        ele.src = ele.dataset['plantumlSrc']
      }
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
    updateTodoCount () {
      this.todoCount = this.$refs.view.querySelectorAll('input[type=checkbox]').length
      this.todoDoneCount = this.$refs.view.querySelectorAll('input[type=checkbox][checked]').length
    },
    transformImgOutLink (img) {
      const transform = ximg => {
        const canvas = document.createElement('canvas')
        canvas.width = ximg.naturalWidth
        canvas.height = ximg.naturalHeight
        canvas.getContext('2d').drawImage(ximg, 0, 0)
        canvas.toBlob(blob => {
          const imgFile = new File([blob], 'file.png')
          file.upload(this.fileRepo, this.filePath, imgFile, result => {
            this.$bus.emit('tree-refresh')
            this.$bus.emit('editor-replace-value', img.src, result.relativePath)
          })
        })
      }

      if (img.src.startsWith('data:')) {
        transform(img)
      } else if (
        img.src.startsWith('http://') ||
        img.src.startsWith('https://')
      ) {
        window.fetch(`api/proxy?url=${encodeURI(img.src)}`).then(r => {
          r.blob().then(blob => {
            const imgFile = new File([blob], 'file.' + mime.extension(r.headers.get('content-type')))
            file.upload(this.fileRepo, this.filePath, imgFile, result => {
              this.$bus.emit('tree-refresh')
              this.$bus.emit('editor-replace-value', img.src, encodeURI(result.relativePath))
            })
          })
        })
      }
    },
    handleClick (e) {
      if (e.target.tagName === 'A' && e.target.classList.contains('open')) {
        fetch(e.target.href.replace('api/attachment', 'api/open'))
        e.preventDefault()
        return false
      }

      if (e.target.tagName === 'IMG') {
        const img = e.target
        if (e.ctrlKey && e.shiftKey) { // 转换外链图片到本地
          this.transformImgOutLink(img)
          return
        }

        window.open(img.src)
        return
      }

      if (e.target.tagName === 'INPUT' && e.target.parentElement.classList.contains('source-line')) {
        this.switchTodo(parseInt(e.target.parentElement.dataset['sourceLine']), e.target.checked)
        return
      }

      if (e.target.classList.contains('source-line') && window.getSelection().toString().length < 1) {
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
      if (line <= 1) {
        this.$refs['view-wrapper'].scrollTo(0, 0)
        return
      }

      const nodes = this.$refs['view-wrapper'].querySelectorAll('.view .source-line')
      for (let ele of nodes) {
        if (parseInt(ele.dataset['sourceLine']) >= line) {
          ele.scrollIntoView()
          break
        }
      }
    },
    convertFile (type) {
      MarkdownItECharts.preparePrint()

      const baseUrl = location.origin + location.pathname.substring(0, location.pathname.lastIndexOf('/')) + '/'

      this.convert = {
        fileName: (this.fileName || '未命名') + `.${type}`,
        html: this.$refs.view.outerHTML.replace(/src="api/g, `src="${baseUrl}api`),
        type
      }
      MarkdownItECharts.update()
      setTimeout(() => {
        this.$refs.convertForm.submit()
      }, 300)
    },
    print () {
      window.print()
    }
  },
  computed: {
    ...mapState('app', ['currentContent', 'currentFile']),
    fileRepo () {
      return this.currentFile && this.currentFile.repo
    },
    fileName () {
      return this.currentFile && this.currentFile.name
    },
    filePath () {
      return this.currentFile && this.currentFile.path
    },
  },
  watch: {
    currentContent () {
      this.render()
    },
    filePath () {
      setTimeout(() => {
        this.updatePlantuml()
      }, 100)
    }
  }
}
</script>

<style scoped>
.markdown-body {
  position: relative;
}

@media screen {
  .markdown-body {
    color: #ccc;
    margin-top: 1em;
  }

  .markdown-body /deep/ a {
    color: #4c93e2;
  }

  .markdown-body /deep/ tr {
    background: inherit;
  }

  .markdown-body /deep/ * {
    border-color: #8b8d90;
    background: inherit;
  }

  .markdown-body /deep/ code {
    background: #464648;
  }

  .markdown-body /deep/ table tr:nth-child(2n),
  .markdown-body /deep/ pre,
  .markdown-body /deep/ pre > code
  {
    background: #303133;
  }

  .markdown-body /deep/ input,
  .markdown-body /deep/ img
  {
    transition: all .3s ease-in-out;
    filter: brightness(70%);
  }

  .markdown-body /deep/ img:hover
  {
    filter: none;
  }
}

button {
  background: #333030;
  border: 0;
  padding: 5px 10px;
  color: #ccc;
  cursor: pointer;
  border-radius: 2px;
  transition: all .3s ease-in-out;
  margin-left: 4px;
}

button:hover {
  background: #252525;
}

.action-bar {
  position: fixed;
  width: 27vw;
  padding: 0;
  right: 20px;
  max-width: 980px;
  box-sizing: border-box;
  z-index: 1000;
  margin-top: -1.8em;
}

.action-bar > div {
  /* background: #4e4e4e; */
  padding: .3em;
  border-radius: 2px;
  height: 26px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  align-content: flex-end;
  transition: all .1s ease-in-out;
}

.todo-progress {
  flex-grow: 1;
  margin-right: 1em;
  background: #808080;
  z-index: 999;
}

.todo-progress div {
  font-size: 12px;
  line-height: 15px;
  color: #ddd;
  text-align: right;
  box-sizing: border-box;
  transition: all .3s ease-in-out;
  white-space: nowrap;
}

.outline {
  position: fixed;
  right: 2em;
  background: #333030;
  color: #ccc;
  font-size: 14px;
  max-height: 3.2em;
  max-width: 2em;
  overflow: hidden;
  transition: .1s ease-in-out;
  z-index: 500;
  border-radius: 2px;
  margin-top: 1em;
}

.outline:hover {
  max-height: 75vh;
  max-width: 20em;
}

.outline > .catalog {
  max-height: 70vh;
  cursor: pointer;
  overflow: auto;
  padding-bottom: 1em;
}

.outline > .catalog > div {
  padding: .5em;
}

.outline > .catalog > div:hover {
  background: #252525;
}

.convert {
  font-size: 14px;
}

.scroll-to-top {
  user-select: none;
  position: fixed;
  right: 2em;
  /* bottom: 40px; */
  background: #333030;
  color: #ccc;
  font-size: 14px;
  overflow: hidden;
  transition: .1s ease-in-out;
  z-index: 400;
  border-radius: 2px;
  cursor: pointer;
  padding: 7px 5px;
  text-align: center;
}

.scroll-to-top::before {
  content: ' ';
  display: block;
  border-left: 20px transparent solid;
  border-bottom: 7px #bbb solid;
  border-right: 20px transparent solid;
  margin-bottom: 4px;
}

.scroll-to-top:hover {
  background: #252525;
}

.scroll-to-top.hide {
  opacity: 0;
  right: -60px;
}

.markdown-body /deep/ table.hljs-ln tbody {
  display: table;
  min-width: 100%;
}

@media print {
  .outline,
  .scroll-to-top,
  .action-bar {
    display: none;
  }
  .view {
    min-width: 100%;
    max-width: 100%;
    width: 100%;
    height: auto;
    padding: 0;
  }
}

@media screen and (max-width: 767px) {
  .view {
    padding: 15px;
  }
}
</style>

<style>
.view {
  height: 100%;
  width: 100%;
  overflow-y: auto;
  padding: 40px;
  box-sizing: border-box;
}

.view .markdown-body hr {
  border-bottom: 1px solid;
}

.view img {
  display: block;
  margin-left: auto;
  margin-right: auto;
  cursor: zoom-in;
}

.view img.inline {
  display: inline;
}

.view .new-page {
  page-break-before: always;
}

.view .echarts {
  width: 100%;
  height: 350px;
}

.view .hljs-ln,
.view .hljs-ln tr,
.view .hljs-ln td {
  border: 0;
}

.view .hljs-ln td {
  padding: 0;
}

@media screen {
  .view table.hljs-ln {
    max-height: 400px;
  }
}

@media print {
  .view table.hljs-ln td {
    white-space: pre-wrap;
  }

  .view .run-in-xterm {
    display: none;
  }
}

.view table.hljs-ln {
  padding-bottom: 10px;
}

.view table.hljs-ln tr:nth-child(even) {
  background: rgba(110, 110, 110, .05)
}

.view .hljs-ln td.hljs-ln-numbers {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  text-align: center;
  border-right: 1px solid #777;
  vertical-align: top;
  padding-right: 5px;

  /* your custom style here */
}

/* for block of code */
.view .hljs-ln td.hljs-ln-code {
  padding-left: 10px;
}
</style>
