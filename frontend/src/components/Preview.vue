<template>
  <div ref="view-wrapper" class="view" @scroll="handleScroll">
    <div class="action-bar" :style="{width: (width - 50) + 'px'}">
      <div :style="{background: todoCount ? '#4e4e4e' : 'transparent'}">
        <div v-if="todoCount" class="todo-progress">
          <div :style="{
            backgroundColor: `rgb(${220 - 220 * todoDoneCount / todoCount}, ${200 * todoDoneCount / todoCount}, 0)`,
            width: `${todoDoneCount * 100 / todoCount}%`
          }">
            <span style="padding-right: 3px;">{{(todoDoneCount * 100 / todoCount).toFixed(2)}}% {{todoDoneCount}}/{{todoCount}}</span>
          </div>
        </div>
        <div v-else></div>
        <div class="convert">
          <iframe width="0" height="0" hidden id="preview_download" name="preview_download"></iframe>
          <form ref="convertForm" :action="`/api/convert/${convert.fileName}`" method="post" target="preview_download">
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
    <article ref="view" class="markdown-body" @click.capture="handleClick"></article>
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
import AppletPlugin from '../plugins/AppletPlugin'
import SourceLinePlugin from '../plugins/SourceLinePlugin'
import LinkTargetPlugin from '../plugins/LinkTargetPlugin'
import DrawioPlugin from '../plugins/DrawioPlugin'
import PlantumlPlugin from '../plugins/PlantumlPlugin'
import MermaidPlugin from '../plugins/MermaidPlugin'
import CodePlugin from '../plugins/CodePlugin'
import file from '@/lib/file'
import env from '@/lib/env'
import { encodeMarkdownLink } from '@/lib/utils'

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
  .use(AppletPlugin)
  .use(katex)
  .use(SourceLinePlugin)
  .use(MarkdownItAttrs)
  .use(LinkTargetPlugin)
  .use(DrawioPlugin)
  .use(MultimdTable, { enableMultilineRows: true })
  .use(MarkdownItToc)
  .use(MarkdownItECharts)
  .use(MermaidPlugin)
  .use(CodePlugin)

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
    }, 3000, { leading: true })

    this.runAppletScriptDebounce = _.debounce(() => {
      this.runAppletScript()
    }, 1000, { leading: true })

    this.render = _.debounce(() => {
      // 编辑非 markdown 文件预览直接显示代码
      const content = (this.filePath || '').endsWith('.md')
        ? this.currentContent
        : '```' + file.extname(this.fileName || '').replace(/^\./, '') + '\n' + this.currentContent + '```'
      this.$refs.view.innerHTML = markdown.render(this.replaceRelativeLink(content))
      this.runAppletScriptDebounce()
      this.initDrawio()
      this.updateOutline()
      this.updateTodoCount()
      this.updatePlantumlDebounce()
      MarkdownItECharts.update()
      MermaidPlugin.update()

      for (let ele of document.querySelectorAll('code[class^="language-"]')) {
        HighlightLineNumber.lineNumbersBlock(ele)
      }

      // 渲染完成后触发渲染完成事件
      this.$nextTick(() => this.$bus.emit('preview-rendered'))
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

      if (this.fileRepo === '__help__') {
        return md.replace(/\[([^\]]*)\]\((\.\/[^)]*)\)/g, `[$1](api/help/file?path=$2)`)
          .replace(/<img([^>]*)src=["']?(\.\/[^\s'"]*)["']?/ig, `<img$1src="api/help/file?path=$2"`)
      }

      if (!this.filePath) {
        return md
      }

      const basePath = file.dirname(this.filePath)
      const repo = this.fileRepo

      return md.replace(/\[([^\]]*)\]\(\.\/([^)]*)\)/g, (match, alt, path) => {
        path = decodeURI(path) // 提前解码一次，有的链接已经预先编码
        const fileName = file.basename(path)
        const filePath = `${basePath}/${path}`

        // md 文件不替换
        if (fileName.endsWith('.md')) {
          return match
        }

        // 路径中有 hash 不替换
        if (path.indexOf('#') > -1) {
          return match
        }

        return `[${alt}](api/attachment/${encodeURIComponent(fileName)}?repo=${repo}&path=${encodeURIComponent(filePath)})`
      })
    },
    updatePlantuml () {
      const nodes = this.$refs.view.querySelectorAll('img[data-plantuml-src]')
      for (let ele of nodes) {
        ele.src = ele.dataset['plantumlSrc']
      }
    },
    runAppletScript () {
      const nodes = this.$refs.view.querySelectorAll('.applet[data-code]')
      for (const el of nodes) {
        AppletPlugin.runScript(el)
      }
    },
    initDrawio () {
      if (!this.$refs.view) {
        return
      }

      const nodes = this.$refs.view.querySelectorAll('.drawio[data-file]')
      for (const el of nodes) {
        let originPath = el.dataset.file
        if (originPath) {
          originPath = decodeURI(originPath)
          const filepath = originPath.startsWith('/') ? originPath : (file.dirname(this.filePath) + '/' + originPath.replace(/^.\//, ''))
          DrawioPlugin.load(el, this.fileRepo, filepath)
        } else {
          DrawioPlugin.load(el)
        }
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
        canvas.toBlob(async blob => {
          const imgFile = new File([blob], 'file.png')
          const { relativePath } = await file.upload(this.fileRepo, this.filePath, imgFile)
          this.$bus.emit('tree-refresh')
          this.$bus.emit('editor-replace-value', img.src, relativePath)
        })
      }

      if (img.src.startsWith('data:')) {
        transform(img)
      } else if (
        img.src.startsWith('http://') ||
        img.src.startsWith('https://')
      ) {
        window.fetch(`api/proxy?url=${encodeURIComponent(img.src)}`).then(r => {
          r.blob().then(async blob => {
            const imgFile = new File([blob], 'file.' + mime.extension(r.headers.get('content-type')))
            const { relativePath } = await file.upload(this.fileRepo, this.filePath, imgFile)
            this.$bus.emit('tree-refresh')
            this.$bus.emit('editor-replace-value', img.src, encodeMarkdownLink(relativePath))
          })
        })
      }
    },
    handleClick (e) {
      const target = e.target

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
      }

      const handleLink = link => {
        // 系统中打开附件
        if (link.classList.contains('open')) {
          fetch(link.href.replace('api/attachment', 'api/open'))
          return preventEvent()
        }

        const href = link.getAttribute('href') || ''

        if (/^(http:|https:|ftp:)\/\//i.test(href)) { // 处理外链
          // Electron 中打开外链
          if (env.isElectron) {
            env.require && env.require('opn')(link.href)
            preventEvent()
          }
        } else { // 处理相对链接
          if (/(\.md$|\.md#)/.test(href)) { // 处理打开相对 md 文件
            const tmp = decodeURI(href).split('#')

            let path = tmp[0]
            if (path.startsWith('.')) { // 将相对路径转换为绝对路径
              path = file.dirname(this.filePath || '') + path.replace('.', '')
            }

            // 打开文件
            this.$store.commit('app/setCurrentFile', {
              path,
              name: file.basename(path),
              repo: this.fileRepo,
              type: 'file'
            })

            // 跳转锚点
            const hash = tmp.slice(1).join('#')
            if (hash) {
              this.$bus.once('preview-rendered', () => {
                const el = document.getElementById(hash) ||
                  document.getElementById(encodeURIComponent(hash))

                if (el) {
                  // 如果是标题的话，也顺便将编辑器滚动到可视区域
                  if (hash.startsWith('h-')) {
                    el.click()
                  }
                  el.scrollIntoView()
                }
              })
            }

            preventEvent()
          } else if (href && href.startsWith('#')) { // 处理 TOC 跳转
            document.getElementById(href.replace(/^#/, '')).scrollIntoView()
            preventEvent()
          }
        }
      }

      if (target.tagName === 'A') {
        handleLink(target)
      }

      // 复制标题链接
      if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].indexOf(target.tagName) > -1 && target.id && e.ctrlKey) {
        this.$bus.emit('copy-text', encodeMarkdownLink(this.filePath) + '#' + encodeMarkdownLink(decodeURIComponent(target.id)))
        return preventEvent()
      }

      if (target.tagName === 'IMG') {
        const img = target
        if (e.ctrlKey && e.shiftKey) { // 转换外链图片到本地
          this.transformImgOutLink(img)
        } else if (img.parentElement.tagName === 'A') {
          handleLink(img.parentElement)
        } else {
          env.openAlwaysOnTopWindow(img.src)
        }

        e.stopPropagation()
        return
      }

      if (target.tagName === 'INPUT' && target.parentElement.classList.contains('source-line')) {
        this.switchTodo(parseInt(target.parentElement.dataset['sourceLine']), target.checked)
        e.preventDefault()
        e.stopPropagation()
        return
      }

      if (target.classList.contains('source-line') && window.getSelection().toString().length < 1) {
        this.syncScroll(parseInt(target.dataset['sourceLine']))
        e.stopPropagation()
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

      let baseUrl = location.origin + location.pathname.substring(0, location.pathname.lastIndexOf('/')) + '/'

      // Windows 下偶尔解析 localhost 很耗时，这里直接用 ip 代替
      if (/^(http|https):\/\/localhost/i.test(baseUrl)) {
        baseUrl = baseUrl.replace(/localhost/i, '127.0.0.1')
      }

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

  .markdown-body /deep/ div.mermaid,
  .markdown-body /deep/ div.drawio-wrapper,
  .markdown-body /deep/ input,
  .markdown-body /deep/ img
  {
    transition: all .3s ease-in-out;
    filter: brightness(70%);
  }

  .markdown-body /deep/ div.mermaid:hover,
  .markdown-body /deep/ div.drawio-wrapper:hover,
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

.markdown-body /deep/ fieldset {
  border-style: solid;
  margin: 20px 0;
}

.markdown-body /deep/ legend {
  padding: 0 .2em;
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

.view .markdown-body table {
  display: table;
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

  .view img {
    background-color: #fff !important;
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

.view .mermaid {
  background: #fff;
}
</style>
