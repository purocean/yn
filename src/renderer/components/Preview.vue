<template>
  <div ref="refViewWrapper" :class="{'markdown-view': true, presentation}" @scroll="handleScroll">
    <div class="action-bar" :style="{width: (width - 50) + 'px'}">
      <div :style="{background: todoCount ? 'var(--g-color-87)' : 'transparent'}">
        <div v-if="todoCount" class="todo-progress">
          <div :style="{
            backgroundColor: `rgb(${220 - 220 * todoDoneCount / todoCount}, ${200 * todoDoneCount / todoCount}, 0)`,
            width: `${todoDoneCount * 100 / todoCount}%`
          }">
            <span style="padding-right: 3px;">{{(todoDoneCount * 100 / todoCount).toFixed(2)}}% {{todoDoneCount}}/{{todoCount}}</span>
          </div>
        </div>
        <div v-else></div>
        <div class="action-btns">
          <button type="button" @click="print()">打印</button>
          <button type="button" @click="showExport">导出</button>
        </div>
      </div>
    </div>
    <div class="outline">
      <div style="padding: .5em;"><b>目录</b></div>
      <div class="catalog" :style="{maxHeight: `min(${(height - 120) + 'px'}, 70vh)`}">
        <div v-for="(head, index) in heads" :key="index" :style="{paddingLeft: `${head.level + 1}em`}" @click="syncScroll(head.sourceLine)">
          {{ head.text }}
          <span style="color: var(--g-color-60);font-size: 12px;padding-left: .5em">{{head.tag}}</span>
        </div>
      </div>
    </div>
    <div :class="{'scroll-to-top': true, 'hide': scrollTop < 30}" :style="scrollToTopStyle" @click="scrollToTop">TOP</div>
    <article ref="refView" class="markdown-body" @dblclick.capture="handleDbClick" @click.capture="handleClick">
      <Render @render="handleRender" @rendered="handleRendered" :content="renderContent" />
    </article>
  </div>
</template>

<script lang="ts">
import { debounce } from 'lodash-es'
import { useStore } from 'vuex'
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue'
import { extname } from '@fe/utils/path'
import { isElectron } from '@fe/utils/env'
import { markdown } from '@fe/context/markdown'
import { triggerHook } from '@fe/context/plugin'
import { useBus } from '@fe/support/bus'
import { getActionHandler, registerAction, removeAction } from '@fe/context/action'
import { revealLineInCenter } from '@fe/context/editor'
import Render from './Render.vue'

import 'github-markdown-css/github-markdown.css'
import 'highlight.js/styles/atom-one-dark.css'
import 'katex/dist/katex.min.css'

export default defineComponent({
  name: 'xview',
  components: { Render },
  setup () {
    const bus = useBus()
    const store = useStore()

    const { currentContent, currentFile, autoPreview, presentation } = toRefs(store.state)
    const fileName = computed(() => currentFile.value?.name)
    const filePath = computed(() => currentFile.value?.path)

    const refViewWrapper = ref<HTMLElement | null>(null)
    const refView = ref<HTMLElement | null>(null)

    const renderContent = ref()

    const getViewDom = () => refView.value

    const width = ref(1024)
    const height = ref(1024)
    const heads = ref<{
      tag: string;
      text: string;
      level: number;
      sourceLine: number;
    }[]>([])
    const todoCount = ref(0)
    const todoDoneCount = ref(0)
    const scrollTop = ref(0)
    const scrollToTopStyle = computed(() => ({
      bottom: `max(100vh - ${height.value - (isElectron ? 0 : 20)}px, 40px)`
    }))

    function resizeHandler () {
      width.value = refViewWrapper.value!.clientWidth
      height.value = refViewWrapper.value!.clientHeight
    }

    function updateOutline () {
      const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
      const nodes = refView.value!.querySelectorAll<HTMLHeadElement>(tags.join(','))
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
      const nodes = refView.value!.querySelectorAll<HTMLInputElement>('input[type=checkbox]')
      todoCount.value = nodes.length

      let done = 0
      nodes.forEach(node => {
        if (node.checked) {
          done++
        }
      })
      todoDoneCount.value = done
    }

    function handleRender () {
      triggerHook('ON_VIEW_RENDER', { getViewDom })
    }

    function handleRendered () {
      updateOutline()
      updateTodoCount()
      triggerHook('ON_VIEW_RENDERED', { getViewDom })
    }

    function render () {
      // 编辑非 markdown 文件预览直接显示代码
      const content = (filePath.value || '').endsWith('.md')
        ? currentContent.value
        : '```' + extname(fileName.value || '').replace(/^\./, '') + '\n' + currentContent.value + '\n```'

      renderContent.value = markdown.render(content, { source: content, file: currentFile.value })
    }

    const renderDebonce = debounce(render, 100, { leading: true })

    async function keydownHandler (e: KeyboardEvent) {
      triggerHook('ON_VIEW_KEY_DOWN', e, getViewDom())
    }

    function handleScroll (e: any) {
      scrollTop.value = e.target.scrollTop
      triggerHook('ON_VIEW_SCROLL', e)
    }

    function syncScroll (line: number) {
      revealLineInCenter(line)
    }

    function scrollTopTo (top: number) {
      refViewWrapper.value!.scrollTo(0, top)
    }

    function scrollToTop () {
      scrollTopTo(0)
      syncScroll(1)
    }

    function handleDbClick (e: MouseEvent) {
      triggerHook('ON_VIEW_ELEMENT_DBCLICK', e)
    }

    async function handleClick (e: MouseEvent) {
      triggerHook('ON_VIEW_ELEMENT_CLICK', e)
    }

    function revealLine (line: number) {
      if (line <= 1) {
        scrollTopTo(0)
        return
      }

      const nodes = refViewWrapper.value!.querySelectorAll<HTMLElement>('.markdown-body .source-line')
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i]
        if (parseInt(el.dataset.sourceLine || '0') >= line) {
          el.scrollIntoView()
          break
        }
      }
    }

    function print () {
      window.print()
    }

    function showExport () {
      getActionHandler('doc.show-export')()
    }

    function getContentHtml () {
      return refView.value?.outerHTML || ''
    }

    onMounted(() => {
      nextTick(renderDebonce)
      triggerHook('ON_VIEW_MOUNTED', { getViewDom })
      registerAction({ name: 'view.refresh', handler: render })
      registerAction({ name: 'view.reveal-line', handler: revealLine })
      registerAction({ name: 'view.scroll-top-to', handler: scrollTopTo })
      registerAction({ name: 'view.get-content-html', handler: getContentHtml })
      window.addEventListener('keydown', keydownHandler, true)
      bus.on('global.resize', resizeHandler)
      resizeHandler()
    })

    onBeforeUnmount(() => {
      removeAction('view.refresh')
      removeAction('view.reveal-line')
      removeAction('view.scroll-top-to')
      removeAction('view.get-content-html')
      window.removeEventListener('keydown', keydownHandler)
      bus.off('global.resize', resizeHandler)
    })

    watch(currentContent, () => autoPreview.value && renderDebonce())
    watch(filePath, () => {
      // 切换文件后，开启自动预览
      store.commit('setAutoPreview', true)
      triggerHook('ON_VIEW_FILE_CHANGE', { getViewDom })
    })

    return {
      refViewWrapper,
      refView,
      presentation,
      renderContent,
      width,
      height,
      scrollToTopStyle,
      heads,
      todoCount,
      todoDoneCount,
      scrollTop,
      print,
      showExport,
      handleScroll,
      handleRender,
      handleRendered,
      scrollToTop,
      handleClick,
      handleDbClick,
      syncScroll,
    }
  },
})
</script>

<style lang="scss" scoped>
.markdown-view.presentation {
  .action-bar {
    display: none;
  }

  .markdown-body {
    margin-top: 0;
  }
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
  background: var(--g-color-98);
  z-index: 999;
}

.todo-progress div {
  font-size: 12px;
  line-height: 15px;
  color: #ddd;
  text-align: right;
  box-sizing: border-box;
  transition: all .1s ease-in-out;
  white-space: nowrap;
}

.outline {
  position: fixed;
  right: 2em;
  background: var(--g-color-85);
  color: var(--g-color-10);
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
  box-shadow: rgba(0, 0, 0 , 0.3) 2px 2px 10px;
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
  background: var(--g-color-75);
}

.action-btns {
  font-size: 14px;
  pointer-events: initial;
}

.scroll-to-top {
  user-select: none;
  position: fixed;
  right: 2em;
  /* bottom: 40px; */
  background: var(--g-color-85);
  color: var(--g-color-10);
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
  border-bottom: 7px var(--g-color-40) solid;
  border-right: 20px transparent solid;
  margin-bottom: 4px;
}

.scroll-to-top:hover {
  background: var(--g-color-80);
}

.scroll-to-top.hide {
  opacity: 0;
  right: -60px;
}
</style>

<style lang="scss">
@import '@fe/styles/mixins.scss';

.markdown-view {
  height: 100%;
  width: 100%;
  overflow-y: auto;
  padding: 40px;
  box-sizing: border-box;

  .markdown-body {
    position: relative;

    fieldset {
      border-style: solid;
      margin: 20px 0;

      legend {
        padding: 0 .2em;
      }
    }

    table {
      display: table;
    }

    hr {
      border-bottom: 1px solid;
    }

    img {
      display: block;
      margin-left: auto;
      margin-right: auto;
      cursor: zoom-in;

      &.inline,
      &[src*=".inline"],
      &[origin-src*=".inline"] {
        display: inline;
        background: unset;
      }

      &.bgw,
      &[src*=".bgw"],
      &[origin-src*=".bgw"] {
        background-color: #fff;
      }
    }

    .new-page {
      page-break-before: always;
    }
  }
}

@media screen {
  @include dark-theme {
    .markdown-body {
      .reduce-brightness, img {
        transition: all .1s ease-in-out;
        filter: brightness(84%);

        &:hover {
          filter: none;
        }
      }
    }
  }

  .markdown-view .markdown-body {
    max-width: 1200px;
    margin: 0 auto;
    color: var(--g-color-0);
    margin-top: 1em;

    a {
      color: #4c93e2;
    }

    tr {
      background: inherit;
    }

    * {
      border-color: var(--g-color-80);
      background: inherit;
    }

    code {
      background: var(--g-color-80);
    }

    pre,
    pre > code,
    table tr:nth-child(2n) {
      position: relative;
      background: var(--g-color-96);
    }

    table.source-line tbody {
      counter-reset: tr-number;

      &:hover td:first-child:before {
        counter-increment: tr-number;
        content: counter(tr-number);
        position: absolute;
        right: 100%;
        padding-right: 5px;
        color: #999;
        font-family: monospace;
      }

      tr:hover {
        outline: 2px #b3833b dashed;
      }
    }
  }
}

@media screen and (max-width: 767px) {
  .markdown-view {
    padding: 15px;
  }
}

@media print {
  .outline,
  .scroll-to-top,
  .action-bar {
    display: none;
  }

  .markdown-view {
    min-width: 100%;
    max-width: 100%;
    width: 100%;
    height: auto;
    padding: 0;
  }
}
</style>
