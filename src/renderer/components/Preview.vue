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
    <div v-if="heads && heads.length > 0" :class="{outline: true, pined: pinOutline}">
      <div class="outline-title">
        <b>目录</b>
        <div class="outline-pin" @click="togglePinOutline">
          <SvgIcon style="width: 12px; height: 12px" name="thumbtack" />
        </div>
      </div>
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
import { isElectron } from '@fe/support/env'
import { markdown } from '@fe/services/markdown'
import { triggerHook } from '@fe/core/plugin'
import { useBus } from '@fe/core/bus'
import { registerAction, removeAction } from '@fe/core/action'
import { revealLineInCenter } from '@fe/services/editor'
import { showExport } from '@fe/services/document'
import Render from './Render.vue'
import SvgIcon from './SvgIcon.vue'

import 'github-markdown-css/github-markdown.css'
import 'highlight.js/styles/atom-one-dark.css'
import 'katex/dist/katex.min.css'

export default defineComponent({
  name: 'xview',
  components: { Render, SvgIcon },
  setup () {
    const bus = useBus()
    const store = useStore()

    const pinOutline = ref(false)
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

    function togglePinOutline () {
      pinOutline.value = !pinOutline.value
    }

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
      pinOutline,
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
      togglePinOutline,
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
  border-radius: var(--g-border-radius);
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
  border-radius: var(--g-border-radius);
  margin-top: 1em;
}

.outline.pined,
.outline:hover {
  max-height: 75vh;
  max-width: 20em;
  box-shadow: rgba(0, 0, 0 , 0.3) 2px 2px 10px;
}

.outline > .catalog {
  max-height: 70vh;
  cursor: pointer;
  overflow: auto;
  overflow-x: hidden;
  padding-bottom: 1em;
}

.outline > .catalog > div {
  padding: .5em;
  display: flex;
  align-items: center;
  border-radius: var(--g-border-radius);
}

.outline > .catalog > div:hover {
  background: var(--g-color-75);
}

.outline-title {
  padding: .5em;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.outline-pin {
  width: 20px;
  height: 20px;
  overflow: hidden;
  transition: left .1s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 50%;
  left: 40px;
  color: var(--g-color-20);

  &:hover {
    background: var(--g-color-75);
  }
}

.outline:hover .outline-pin,
.outline.pined .outline-pin {
  left: 3px;
}

.outline.pined .outline-pin {
  background: var(--g-color-70);
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
  border-radius: var(--g-border-radius);
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
      border-radius: var(--g-border-radius);
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

    a:not([href^="#fn"])[href^="#"]:after {
      width: 11px;
      content: url(data:image/svg+xml,%3Csvg%20aria-hidden%3D%22true%22%20focusable%3D%22false%22%20data-prefix%3D%22far%22%20data-icon%3D%22anchor%22%20role%3D%22img%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20576%20512%22%20class%3D%22svg-inline--fa%20fa-anchor%20fa-w-18%22%3E%3Cpath%20fill%3D%22%23999999%22%20d%3D%22M571.515%20331.515l-67.029-67.029c-4.686-4.686-12.284-4.686-16.971%200l-67.029%2067.029c-7.56%207.56-2.206%2020.485%208.485%2020.485h44.268C453.531%20417.326%20380.693%20456.315%20312%20462.865V216h60c6.627%200%2012-5.373%2012-12v-24c0-6.627-5.373-12-12-12h-60v-11.668c32.456-10.195%2056-40.512%2056-76.332%200-44.183-35.817-80-80-80s-80%2035.817-80%2080c0%2035.82%2023.544%2066.138%2056%2076.332V168h-60c-6.627%200-12%205.373-12%2012v24c0%206.627%205.373%2012%2012%2012h60v246.865C195.192%20456.304%20122.424%20417.176%20102.762%20352h44.268c10.691%200%2016.045-12.926%208.485-20.485l-67.029-67.029c-4.686-4.686-12.284-4.686-16.971%200l-67.03%2067.029C-3.074%20339.074%202.28%20352%2012.971%20352h40.284C73.657%20451.556%20181.238%20512%20288%20512c113.135%200%20215.338-65.3%20234.745-160h40.284c10.691%200%2016.045-12.926%208.486-20.485zM288%2048c17.645%200%2032%2014.355%2032%2032s-14.355%2032-32%2032-32-14.355-32-32%2014.355-32%2032-32z%22%20class%3D%22%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E);
      box-sizing: content-box;
      padding-left: 1px;
      padding-right: 1px;
      display: inline-block;
      vertical-align: baseline;
    }

    a[href$=".md"],
    a[href*=".md#"] {
      &:after {
        width: 9px;
        content: url(data:image/svg+xml,%3Csvg%20aria-hidden%3D%22true%22%20focusable%3D%22false%22%20data-prefix%3D%22far%22%20data-icon%3D%22file-alt%22%20role%3D%22img%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20384%20512%22%20class%3D%22svg-inline--fa%20fa-file-alt%20fa-w-12%22%3E%3Cpath%20fill%3D%22%23999999%22%20d%3D%22M288%20248v28c0%206.6-5.4%2012-12%2012H108c-6.6%200-12-5.4-12-12v-28c0-6.6%205.4-12%2012-12h168c6.6%200%2012%205.4%2012%2012zm-12%2072H108c-6.6%200-12%205.4-12%2012v28c0%206.6%205.4%2012%2012%2012h168c6.6%200%2012-5.4%2012-12v-28c0-6.6-5.4-12-12-12zm108-188.1V464c0%2026.5-21.5%2048-48%2048H48c-26.5%200-48-21.5-48-48V48C0%2021.5%2021.5%200%2048%200h204.1C264.8%200%20277%205.1%20286%2014.1L369.9%2098c9%208.9%2014.1%2021.2%2014.1%2033.9zm-128-80V128h76.1L256%2051.9zM336%20464V176H232c-13.3%200-24-10.7-24-24V48H48v416h288z%22%20class%3D%22%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E);
        box-sizing: content-box;
        padding-left: 2px;
        padding-right: 2px;
        display: inline-block;
        vertical-align: baseline;
      }
    }

    a[href^="//"],
    a[href^="http://"],
    a[href^="https://"] {
      &:after {
        width: 10px;
        content: url(data:image/svg+xml,%3Csvg%20aria-hidden%3D%22true%22%20focusable%3D%22false%22%20data-prefix%3D%22far%22%20data-icon%3D%22external-link%22%20role%3D%22img%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20512%20512%22%20class%3D%22svg-inline--fa%20fa-external-link%20fa-w-16%22%3E%3Cpath%20fill%3D%22%23999999%22%20d%3D%22M497.6%2C0%2C334.4.17A14.4%2C14.4%2C0%2C0%2C0%2C320%2C14.57V47.88a14.4%2C14.4%2C0%2C0%2C0%2C14.69%2C14.4l73.63-2.72%2C2.06%2C2.06L131.52%2C340.49a12%2C12%2C0%2C0%2C0%2C0%2C17l23%2C23a12%2C12%2C0%2C0%2C0%2C17%2C0L450.38%2C101.62l2.06%2C2.06-2.72%2C73.63A14.4%2C14.4%2C0%2C0%2C0%2C464.12%2C192h33.31a14.4%2C14.4%2C0%2C0%2C0%2C14.4-14.4L512%2C14.4A14.4%2C14.4%2C0%2C0%2C0%2C497.6%2C0ZM432%2C288H416a16%2C16%2C0%2C0%2C0-16%2C16V458a6%2C6%2C0%2C0%2C1-6%2C6H54a6%2C6%2C0%2C0%2C1-6-6V118a6%2C6%2C0%2C0%2C1%2C6-6H208a16%2C16%2C0%2C0%2C0%2C16-16V80a16%2C16%2C0%2C0%2C0-16-16H48A48%2C48%2C0%2C0%2C0%2C0%2C112V464a48%2C48%2C0%2C0%2C0%2C48%2C48H400a48%2C48%2C0%2C0%2C0%2C48-48V304A16%2C16%2C0%2C0%2C0%2C432%2C288Z%22%20class%3D%22%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E);
        box-sizing: content-box;
        padding-left: 2px;
        padding-right: 2px;
        display: inline-block;
        vertical-align: baseline;
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
    max-width: 800px;
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

    pre {
      position: relative;
    }

    pre,
    table tr:nth-child(2n),
    pre > code {
      background: var(--g-color-96);
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
