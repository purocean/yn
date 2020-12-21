<template>
  <div ref="refViewWrapper" class="view" @scroll="handleScroll">
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
          <form ref="refConvertForm" :action="`/api/convert/${convert.fileName}`" method="post" target="preview_download">
            <input type="hidden" name="html" :value="convert.html">
            <input type="hidden" name="type" :value="convert.type">
            <!-- <button type="button" @click="convertFile('pdf')">pdf</button> -->
            <button type="button" @click="print()">打印</button>
            <button type="button" @click="convertFile('docx')">docx</button>
          </form>
        </div>
      </div>
    </div>
    <div class="outline">
      <div style="padding: .5em;"><b>目录</b></div>
      <div class="catalog" :style="{maxHeight: (height - 120) + 'px'}">
        <div v-for="(head, index) in heads" :key="index" :style="{paddingLeft: `${head.level + 1}em`}" @click="syncScroll(head.sourceLine)">
          {{ head.text }}
          <span style="color: #666;font-size: 12px;padding-left: .5em">{{head.tag}}</span>
        </div>
      </div>
    </div>
    <div :class="{'scroll-to-top': true, 'hide': scrollTop < 30}" :style="{top: (height - 40) + 'px'}" @click="scrollToTop">TOP</div>
    <article ref="refView" class="markdown-body" @click.capture="handleClick"></article>
  </div>
</template>

<script lang="ts">
import loadsh from 'lodash'
import { useStore } from 'vuex'
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue'
import mime from 'mime-types'
import Markdown from 'markdown-it'
import TaskLists from 'markdown-it-task-lists'
import katex from 'markdown-it-katex'
import MarkdownItAttrs from 'markdown-it-attrs'
import MultimdTable from 'markdown-it-multimd-table'
import Footnote from 'markdown-it-footnote'
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
import MindMapPlugin from '../plugins/MindMapPlugin'
import file from '../useful/file'
import env from '../useful/env'
import { encodeMarkdownLink } from '../useful/utils'

import 'github-markdown-css/github-markdown.css'
import 'highlight.js/styles/atom-one-dark.css'
import 'katex/dist/katex.min.css'
import { useBus } from '../useful/bus'
import { useToast } from '../useful/toast'
HighlightLineNumber.addStyles()

const markdown = Markdown({
  linkify: true,
  breaks: true,
  html: true,
  highlight: (str: string, lang: string) => {
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
  .use(Footnote)
  .use(DrawioPlugin)
  .use(MultimdTable, { multiline: true })
  .use(MarkdownItToc)
  .use(MarkdownItECharts)
  .use(MermaidPlugin)
  .use(CodePlugin)
  .use(MindMapPlugin)

export default defineComponent({
  name: 'xview',
  setup (_, { emit }) {
    const bus = useBus()
    const store = useStore()
    const toast = useToast()

    const { currentContent, currentFile, autoPreview } = toRefs(store.state)
    const fileRepo = computed(() => currentFile.value?.repo)
    const fileName = computed(() => currentFile.value?.name)
    const filePath = computed(() => currentFile.value?.path)

    const refViewWrapper = ref<HTMLElement | null>(null)
    const refView = ref<HTMLElement | null>(null)
    const refConvertForm = ref<HTMLFormElement | null>(null)

    const width = ref(1024)
    const height = ref(1024)
    const heads = ref<{
      tag: string;
      text: string;
      level: number;
      sourceLine: number;
    }[]>([])
    const convert = ref({ fileName: '', html: '', type: '' })
    const todoCount = ref(0)
    const todoDoneCount = ref(0)
    const scrollTop = ref(0)

    function resizeHandler () {
      width.value = refViewWrapper.value!!.clientWidth
      height.value = refViewWrapper.value!!.clientHeight
    }

    function updatePlantuml () {
      const nodes = refView.value!!.querySelectorAll<HTMLImageElement>('img[data-plantuml-src]')
      nodes.forEach(el => {
        el.src = el.dataset.plantumlSrc || ''
      })
    }

    function runAppletScript () {
      const nodes = refView.value!!.querySelectorAll<HTMLElement>('.applet[data-code]')
      nodes.forEach(AppletPlugin.runScript)
    }

    function renderMindMap () {
      const nodes = refView.value!!.querySelectorAll<HTMLElement>('.mindmap-list[data-mindmap-source]')
      nodes.forEach(MindMapPlugin.render)
    }

    const updatePlantumlDebounce = loadsh.debounce(() => {
      updatePlantuml()
    }, 3000, { leading: true })

    const runAppletScriptDebounce = loadsh.debounce(() => {
      runAppletScript()
    }, 1000, { leading: true })

    const renderMindmapDebounce = loadsh.debounce(() => {
      renderMindMap()
    }, 1000, { leading: true })

    function replaceRelativeLink (md: string) {
      if (!fileRepo.value) {
        return md
      }

      if (fileRepo.value === '__help__') {
        return md.replace(/\[([^\]]*)\]\((\.\/[^)]*)\)/g, '[$1](api/help/file?path=$2)')
          .replace(/<img([^>]*)src=["']?(\.\/[^\s'"]*)["']?/ig, '<img$1src="api/help/file?path=$2"')
      }

      if (!filePath.value) {
        return md
      }

      const basePath = file.dirname(filePath.value)
      const repo = fileRepo.value

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
      }).replace(/<img([^>]*)src=["']?(\.\/[^\s'"]*)["']?/ig, (match, _, path) => {
        path = decodeURI(path) // 提前解码一次，有的链接已经预先编码
        const fileName = file.basename(path)
        const filePath = `${basePath}/${path}`
        return `<img${_}origin-src="${path}" src="api/attachment/${encodeURIComponent(fileName)}?repo=${repo}&path=${encodeURIComponent(filePath)}"`
      })
    }

    function initDrawio () {
      if (!refView.value) {
        return
      }

      const nodes = refView.value!!.querySelectorAll<HTMLIFrameElement>('.drawio[data-url]')
      nodes.forEach(el => {
        const url = el.dataset.url
        if (url) {
          DrawioPlugin.load(el, url)
        } else {
          DrawioPlugin.load(el)
        }
      })
    }

    function updateOutline () {
      const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
      const nodes = refView.value!!.querySelectorAll<HTMLHeadElement>(tags.join(','))
      heads.value = Array.from(nodes).map(node => {
        return {
          tag: node.tagName.toLowerCase(),
          text: node.innerText,
          level: tags.indexOf(node.tagName.toLowerCase()),
          sourceLine: parseInt(node.dataset.sourceLine || '0')
        }
      })
    }

    function updateTodoCount () {
      todoCount.value = refView.value!!.querySelectorAll('input[type=checkbox]').length
      todoDoneCount.value = refView.value!!.querySelectorAll('input[type=checkbox][checked]').length
    }

    function hightCode () {
      const nodes = refView.value!!.querySelectorAll<HTMLImageElement>('code[class^="language-"]')
      nodes.forEach(el => {
        HighlightLineNumber.lineNumbersBlock(el)
      })
    }

    const render = loadsh.debounce(() => {
      // 编辑非 markdown 文件预览直接显示代码
      const content = (filePath.value || '').endsWith('.md')
        ? currentContent.value
        : '```' + file.extname(fileName.value || '').replace(/^\./, '') + '\n' + currentContent.value + '```'

      const source = replaceRelativeLink(content)
      refView.value!!.innerHTML = markdown.render(source, { source })
      runAppletScriptDebounce()
      renderMindmapDebounce()
      initDrawio()
      updateOutline()
      updateTodoCount()
      updatePlantumlDebounce()
      hightCode()
      MarkdownItECharts.update()
      MermaidPlugin.update()

      // 渲染完成后触发渲染完成事件
      nextTick(() => bus.emit('preview-rendered'))
    }, 500, { leading: true })

    async function transformImgOutLink (img: HTMLImageElement) {
      const transform = (ximg: HTMLImageElement): Promise<string> => {
        const canvas = document.createElement('canvas')
        canvas.width = ximg.naturalWidth
        canvas.height = ximg.naturalHeight
        canvas.getContext('2d')!!.drawImage(ximg, 0, 0)
        return new Promise((resolve, reject) => {
          canvas.toBlob(async blob => {
            try {
              const imgFile = new File([blob!!], 'file.png')
              const { relativePath } = await file.upload(fileRepo.value, filePath.value, imgFile)
              resolve(relativePath)
            } catch (error) {
              reject(error)
            }
          })
        })
      }

      let replacedLink = ''
      const imgAttrSrc = img.getAttribute('src') || ''
      if (img.src.startsWith('data:')) {
        replacedLink = await transform(img)
      } else if (imgAttrSrc.startsWith('http://') || imgAttrSrc.startsWith('https://')) {
        const res = await window.fetch(`api/proxy?url=${encodeURIComponent(img.src)}&headers=${img.getAttribute('headers') || ''}`)
        const blob = await res.blob()
        const imgFile = new File([blob!!], 'file.' + mime.extension(res.headers.get('content-type')!!))
        const { relativePath } = await file.upload(fileRepo.value, filePath.value, imgFile)
        replacedLink = relativePath
      }

      if (replacedLink) {
        return { oldLink: img.src, replacedLink: encodeMarkdownLink(replacedLink) }
      }

      return null
    }

    async function keydownHandler (e: KeyboardEvent) {
      // 转换所有外链图片到本地
      if (e.key === 'l' && e.ctrlKey && e.altKey) {
        e.preventDefault()
        e.stopPropagation()
        const result = []
        const imgList = refView.value!!.querySelectorAll('img')
        for (let i = 0; i < imgList.length; i++) {
          toast.show('info', `正在转换外链图片 ${i + 1}/${imgList.length}`)

          const img = imgList[i]
          const data = await transformImgOutLink(img)
          if (data) {
            result.push(data)
          }
        }
        result.forEach(data => bus.emit('editor-replace-value', { search: data.oldLink, replace: data.replacedLink }))
        bus.emit('tree-refresh')
      }
    }

    function handleScroll (e: any) {
      scrollTop.value = e.target.scrollTop
    }

    function syncScroll (line: number) {
      emit('sync-scroll', line)
    }

    function switchTodo (line: number, checked: boolean) {
      emit('switch-todo', line, checked)
    }

    function scrollToTop () {
      refViewWrapper.value!!.scrollTo(0, 0)
      syncScroll(1)
    }

    async function handleClick (e: MouseEvent) {
      const target = e.target as HTMLElement

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
      }

      const handleLink = (link: HTMLAnchorElement) => {
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
              path = file.dirname(filePath.value || '') + path.replace('.', '')
            }

            // 打开文件
            store.commit('setCurrentFile', {
              path,
              name: file.basename(path),
              repo: fileRepo.value,
              type: 'file'
            })

            // 跳转锚点
            const hash = tmp.slice(1).join('#')
            if (hash) {
              bus.once('preview-rendered', () => {
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
            const el = document.getElementById(href.replace(/^#/, ''))
            if (el) {
              el.scrollIntoView()
            }
            preventEvent()
          }
        }
      }

      if (target.tagName === 'A') {
        handleLink(target as HTMLAnchorElement)
      }

      // 复制标题链接
      if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].indexOf(target.tagName) > -1 && target.id && e.ctrlKey) {
        bus.emit('copy-text', encodeMarkdownLink(filePath.value) + '#' + encodeMarkdownLink(decodeURIComponent(target.id)))
        return preventEvent()
      }

      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement
        if (e.ctrlKey && e.shiftKey) { // 转换外链图片到本地
          const data = await transformImgOutLink(img)
          if (data) {
            bus.emit('tree-refresh')
            bus.emit('editor-replace-value', { search: data.oldLink, replace: data.replacedLink })
          }
        } else if (img.parentElement!!.tagName === 'A') {
          handleLink(img.parentElement as HTMLAnchorElement)
        } else {
          env.openAlwaysOnTopWindow(img.src)
        }

        e.stopPropagation()
        return
      }

      if (target.tagName === 'INPUT' && target.parentElement!!.classList.contains('source-line')) {
        switchTodo(parseInt(target.parentElement!!.dataset.sourceLine || '0'), (target as HTMLInputElement).checked)
        e.preventDefault()
        e.stopPropagation()
        return
      }

      if (target.tagName === 'TD' && target.classList.contains('yank-td') && e.ctrlKey) {
        const start = parseInt(target.dataset.sourceLine || '0')
        const end = parseInt(target.dataset.sourceLineEnd || '0')
        const td = target as HTMLTableDataCellElement
        const cellIndex = [...td.parentElement!.children as any]
          .slice(0, td.cellIndex)
          .reduce((prev, current) => prev + current.colSpan, 0)
        bus.emit('editor-edit-table-cell', { start, end, cellIndex })
      }

      if (target.classList.contains('source-line') && window.getSelection()!!.toString().length < 1) {
        syncScroll(parseInt(target.dataset.sourceLine || '0'))
        e.stopPropagation()
        e.preventDefault()
      }
    }

    function revealLine (line: number) {
      if (line <= 1) {
        refViewWrapper.value!!.scrollTo(0, 0)
        return
      }

      const nodes = refViewWrapper.value!!.querySelectorAll<HTMLElement>('.view .source-line')
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i]
        if (parseInt(el.dataset.sourceLine || '0') >= line) {
          el.scrollIntoView()
          break
        }
      }
    }

    function convertFile (type: string) {
      MarkdownItECharts.preparePrint()

      let baseUrl = location.origin + location.pathname.substring(0, location.pathname.lastIndexOf('/')) + '/'

      // Windows 下偶尔解析 localhost 很耗时，这里直接用 ip 代替
      if (/^(http|https):\/\/localhost/i.test(baseUrl)) {
        baseUrl = baseUrl.replace(/localhost/i, '127.0.0.1')
      }

      convert.value = {
        fileName: (fileName.value || '未命名') + `.${type}`,
        html: refView.value!!.outerHTML.replace(/src="api/g, `src="${baseUrl}api`),
        type
      }
      MarkdownItECharts.update()
      setTimeout(() => {
        refConvertForm.value!!.submit()
      }, 300)
    }

    function print () {
      window.print()
    }

    onMounted(() => {
      render()
      setTimeout(() => {
        updatePlantuml()
      }, 100)

      window.addEventListener('keydown', keydownHandler, true)
      bus.on('resize', resizeHandler)
      bus.on('view-rerender', render)
      resizeHandler()
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', keydownHandler)
      bus.off('resize', resizeHandler)
      bus.off('view-rerender', render)
    })

    watch(currentContent, () => autoPreview.value && render())
    watch(filePath, () => {
      // 切换文件后，开启自动预览
      store.commit('setAutoPreview', true)
      setTimeout(() => {
        updatePlantuml()
      }, 100)
    })

    return {
      refViewWrapper,
      refConvertForm,
      refView,
      width,
      height,
      heads,
      convert,
      todoCount,
      todoDoneCount,
      scrollTop,
      print,
      convertFile,
      handleScroll,
      scrollToTop,
      handleClick,
      revealLine,
      syncScroll,
    }
  },
})
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

  .markdown-body ::v-deep(a) {
    color: #4c93e2;
  }

  .markdown-body ::v-deep(tr) {
    background: inherit;
  }

  .markdown-body ::v-deep(*) {
    border-color: #8b8d90;
    background: inherit;
  }

  .markdown-body ::v-deep(code) {
    background: #464648;
  }

  .markdown-body ::v-deep(table tr:nth-child(2n)),
  .markdown-body ::v-deep(pre),
  .markdown-body ::v-deep(pre > code)
  {
    background: #303133;
  }

  .markdown-body ::v-deep(div.mermaid),
  .markdown-body ::v-deep(div.drawio-wrapper),
  .markdown-body ::v-deep(input),
  .markdown-body ::v-deep(img)
  {
    transition: all .3s ease-in-out;
    filter: brightness(70%);
  }

  .markdown-body ::v-deep(div.mermaid:hover),
  .markdown-body ::v-deep(div.drawio-wrapper:hover),
  .markdown-body ::v-deep(img:hover)
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
  pointer-events: none;
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
  display: flex;
  align-items: center;
}

.outline > .catalog > div:hover {
  background: #252525;
}

.convert {
  font-size: 14px;
  pointer-events: initial;
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

.markdown-body ::v-deep(table.hljs-ln tbody) {
  display: table;
  min-width: 100%;
}

.markdown-body ::v-deep(fieldset) {
  border-style: solid;
  margin: 20px 0;
}

.markdown-body ::v-deep(legend) {
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

.view .markdown-body .table-of-contents ol {
  counter-reset: ol-number;
  list-style-type: none;
  padding-left: 0;
}

.view .markdown-body .table-of-contents li > ol {
  padding-left: 2em;
}

.view .markdown-body .table-of-contents ol > li::before {
  counter-increment: ol-number;
  content: counters(ol-number, ".") " ";
}

.view .markdown-body .table-of-contents > ol > li::before {
  counter-increment: ol-number;
  content: counter(ol-number) ". ";
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

  table.source-line tbody {
    counter-reset: tr-number;
  }

  table.source-line tbody tr:hover {
    outline: 2px #b3833b dashed;
  }

  table.source-line:hover tbody tr td:first-child:before {
    counter-increment: tr-number;
    content: counter(tr-number);
    position: absolute;
    right: 100%;
    padding-right: 5px;
    color: #999;
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
