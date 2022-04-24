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
        <div v-if="filePath" class="action-btns">
          <button type="button" @click="print()">{{$t('view.print')}}</button>
          <button type="button" @click="showExport">{{$t('export')}}</button>
        </div>
      </div>
    </div>
    <div v-if="heads && heads.length > 0" :class="{outline: true, pined: pinOutline}">
      <div class="outline-title">
        <svg-icon class="outline-title-icon" name="list" />
        <b class="outline-title-text"> {{ $t('view.outline') }}</b>
        <div class="outline-pin" @click="togglePinOutline">
          <SvgIcon style="width: 12px; height: 12px" name="thumbtack" />
        </div>
      </div>
      <div class="catalog" :style="{maxHeight: `min(${(height - 120) + 'px'}, 70vh)`}">
        <Outline />
      </div>
    </div>
    <div :class="{'scroll-to-top': true, 'hide': scrollTop < 30}" :style="scrollToTopStyle" @click="scrollToTop">TOP</div>
    <article ref="refView" class="markdown-body" @dblclick.capture="handleDbClick" @click.capture="handleClick" @contextmenu.capture="handleContextMenu">
      <Render @render="handleRender" @rendered="handleRendered" :content="renderContent" />
    </article>
  </div>
</template>

<script lang="ts">
import { debounce } from 'lodash-es'
import { useStore } from 'vuex'
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue'
import { extname } from '@fe/utils/path'
import { isElectron } from '@fe/support/env'
import { markdown } from '@fe/services/markdown'
import { registerHook, removeHook, triggerHook } from '@fe/core/hook'
import { registerAction, removeAction } from '@fe/core/action'
import { getEditor } from '@fe/services/editor'
import { showExport, toUri } from '@fe/services/document'
import { getContextMenuItems, getHeadings, Heading } from '@fe/services/view'
import { useContextMenu } from '@fe/support/ui/context-menu'
import { DOM_ATTR_NAME } from '@fe/support/args'
import { useI18n } from '@fe/services/i18n'
import { getLogger } from '@fe/utils'
import type { RenderEnv } from '@fe/types'
import type { AppState } from '@fe/support/store'

import Render from './Render.vue'
import SvgIcon from './SvgIcon.vue'
import Outline from './Outline.vue'

import 'highlight.js/styles/atom-one-dark.css'
import 'katex/dist/katex.min.css'

const logger = getLogger('preview')

export default defineComponent({
  name: 'xview',
  components: { Render, SvgIcon, Outline },
  setup () {
    useI18n()

    const store = useStore<AppState>()

    const pinOutline = ref(false)
    const { currentContent, currentFile, autoPreview, presentation, inComposition } = toRefs(store.state)
    const fileName = computed(() => currentFile.value?.name)
    const filePath = computed(() => currentFile.value?.path)
    const fileUri = computed(() => toUri(currentFile.value))

    const refViewWrapper = ref<HTMLElement | null>(null)
    const refView = ref<HTMLElement | null>(null)

    const renderContent = ref()

    const getViewDom = () => refView.value

    const width = ref(1024)
    const height = ref(1024)
    const heads = ref<Heading[]>([])
    const todoCount = ref(0)
    const todoDoneCount = ref(0)
    const scrollTop = ref(0)
    const scrollToTopStyle = computed(() => ({
      bottom: `max(100vh - ${height.value - (isElectron ? 0 : 20)}px, 40px)`
    }))

    let renderEnv: RenderEnv | null = null
    const getRenderEnv = () => renderEnv

    let renderCount = 0

    function togglePinOutline () {
      pinOutline.value = !pinOutline.value
    }

    function resizeHandler () {
      width.value = refViewWrapper.value!.clientWidth
      height.value = refViewWrapper.value!.clientHeight
    }

    function updateOutline () {
      heads.value = getHeadings()
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
      triggerHook('VIEW_RENDER')
    }

    function handleRendered () {
      updateOutline()
      updateTodoCount()
      triggerHook('VIEW_RENDERED')
    }

    let updateRender = debounce(render, 25)

    function render (checkInComposition = false) {
      if (checkInComposition && inComposition.value) {
        logger.debug('render in composition, skip')
        return
      }

      logger.debug('render')

      let content = currentContent.value

      // not markdown file, displace as code.
      if (filePath.value && !filePath.value.endsWith('.md')) {
        content = '```' + extname(fileName.value || '').replace(/^\./, '') + '\n' + currentContent.value + '\n```'
      }

      const startTime = performance.now()
      renderEnv = { tokens: [], source: content, file: currentFile.value, renderCount: renderCount++ }
      try {
        renderContent.value = markdown.render(content, renderEnv)
      } catch (error: any) {
        logger.error('render', error)
        renderContent.value = h('div', [
          h('h2', { style: 'color: red' }, 'Error'),
          h('pre', error.stack || error.toString())
        ])
      }
      const renderTime = performance.now() - startTime

      logger.debug('rendered', 'cost', renderTime)

      updateRender = debounce(render.bind(null, true), Math.max(25, renderTime * (renderTime < 100 ? 1.2 : 1.8)))
    }

    const renderDebounce = debounce(render, 100, { leading: true })

    async function keydownHandler (e: KeyboardEvent) {
      triggerHook('VIEW_KEY_DOWN', { e, view: getViewDom()! }, { breakable: true })
    }

    function handleScroll (e: any) {
      scrollTop.value = e.target.scrollTop || 0
      triggerHook('VIEW_SCROLL', { e })
    }

    function scrollTopTo (top: number) {
      refViewWrapper.value!.scrollTo(0, top)
    }

    function scrollToTop () {
      scrollTopTo(0)
      getEditor().revealLineInCenter(1)
    }

    function handleDbClick (e: MouseEvent) {
      triggerHook('VIEW_ELEMENT_DBCLICK', { e, view: getViewDom()! }, { breakable: true })
    }

    function handleClick (e: MouseEvent) {
      triggerHook('VIEW_ELEMENT_CLICK', { e, view: getViewDom()! }, { breakable: true })
    }

    function handleContextMenu (e: MouseEvent) {
      const tagName = (e.target as HTMLElement).tagName
      const allowTags = ['TD', 'TH']
      if (isElectron || e.altKey || allowTags.includes(tagName)) {
        const contextMenuItems = getContextMenuItems(e)
        if (contextMenuItems.length > 0) {
          useContextMenu().show(contextMenuItems)
          e.stopPropagation()
          e.preventDefault()
        }
      }
    }

    function revealLine (startLine: number) {
      if (startLine <= 1) {
        scrollTopTo(0)
        return
      }

      const nodes = refViewWrapper.value!.querySelectorAll<HTMLElement>(`.markdown-body [${DOM_ATTR_NAME.SOURCE_LINE_START}]`)
      let prevEl: HTMLElement | undefined
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i]

        if (
          el.tagName === 'TD' ||
          el.tagName === 'TH' ||
          el.tagName === 'THEAD' ||
          el.tagName === 'TBODY') {
          continue
        }

        const lineNumber = parseInt(el.dataset.sourceLine || '0')

        if (lineNumber < startLine) {
          if (i === nodes.length - 1) {
            refViewWrapper.value!.scrollTop = refViewWrapper.value!.scrollHeight - refViewWrapper.value!.clientHeight
            break
          }

          prevEl = el
          continue
        }

        if (lineNumber === startLine) {
          el.scrollIntoView()
          break
        }

        if (prevEl) {
          const wrapperOffset = refViewWrapper.value!.scrollTop - refViewWrapper.value!.getBoundingClientRect().top
          const prevOffset = wrapperOffset + prevEl.getBoundingClientRect().top
          const elOffset = wrapperOffset + el.getBoundingClientRect().top
          const prevLine = parseInt(prevEl.dataset.sourceLine || '0')
          const top = Math.round((elOffset * (startLine - prevLine) + prevOffset * (lineNumber - startLine)) / (lineNumber - prevLine))
          refViewWrapper.value!.scrollTop = top
          break
        }
      }
    }

    async function print () {
      await triggerHook('DOC_BEFORE_EXPORT', { type: 'pdf' }, { breakable: true })
      window.print()
    }

    function getContentHtml () {
      return refView.value?.outerHTML || ''
    }

    function refresh () {
      logger.debug('refresh')
      triggerHook('VIEW_BEFORE_REFRESH')
      renderDebounce()
      triggerHook('VIEW_AFTER_REFRESH')
    }

    onMounted(() => {
      nextTick(renderDebounce)
      triggerHook('VIEW_MOUNTED')
      registerAction({ name: 'view.render-immediately', handler: render.bind(null, false) })
      registerAction({ name: 'view.render', handler: renderDebounce })
      registerAction({ name: 'view.refresh', handler: refresh })
      registerAction({ name: 'view.reveal-line', handler: revealLine })
      registerAction({ name: 'view.scroll-top-to', handler: scrollTopTo })
      registerAction({ name: 'view.get-content-html', handler: getContentHtml })
      registerAction({ name: 'view.get-view-dom', handler: getViewDom })
      registerAction({ name: 'view.get-render-env', handler: getRenderEnv })
      registerHook('GLOBAL_RESIZE', resizeHandler)
      window.addEventListener('keydown', keydownHandler, true)
      resizeHandler()
    })

    onBeforeUnmount(() => {
      removeAction('view.render-immediately')
      removeAction('view.render')
      removeAction('view.refresh')
      removeAction('view.reveal-line')
      removeAction('view.scroll-top-to')
      removeAction('view.get-content-html')
      removeAction('view.get-view-dom')
      removeAction('view.get-render-env')
      removeHook('GLOBAL_RESIZE', resizeHandler)
      window.removeEventListener('keydown', keydownHandler)
    })

    watch([currentContent, fileUri, inComposition], () => {
      autoPreview.value && updateRender()
    })

    watch(fileUri, () => {
      renderCount = 0
      updateRender = debounce(render, 25)
      triggerHook('VIEW_FILE_CHANGE')
    })

    return {
      filePath,
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
      handleRendered: debounce(handleRendered, 60),
      scrollToTop,
      handleClick,
      handleDbClick,
      handleContextMenu,
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
  max-height: 34px;
  max-width: 30px;
  overflow: hidden;
  transition: .1s ease-in-out;
  z-index: 500;
  border-radius: var(--g-border-radius);
  margin-top: 1em;

  .catalog {
    max-height: 70vh;
    cursor: pointer;
    overflow: auto;
    overflow-x: hidden;
  }

  .outline-title {
    padding: .5em;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .outline-title-icon {
      width: 16px;
      height: 16px;
      opacity: 1;
      transition: opacity .1s;
      position: absolute;
    }

    .outline-title-text {
      white-space: nowrap;
      opacity: 0;
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
      transform: rotate(90deg);
      transition: transform .2s;

      &:hover {
        background: var(--g-color-75);
      }
    }
  }

  &.pined .outline-pin {
    background: var(--g-color-70);
    transform: rotate(0);
  }

  &.pined, &:hover {
    max-height: 75vh;
    max-width: 28em;
    box-shadow: rgba(0, 0, 0 , 0.3) 2px 2px 10px;

    .outline-pin {
      left: 3px;
    }

    .outline-title-icon {
      opacity: 0;
    }

    .outline-title-text {
      opacity: 1;
    }
  }
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

    mark {
      background: #fff8c5 !important;
    }

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
      --skip-contain: 1;
      cursor: zoom-in;
    }

    img {
      display: block;
      margin-left: auto;
      margin-right: auto;

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

    table a::after {
      display: none !important;
    }
  }
}

@include dark-theme {
  .markdown-body {
    mark {
      background: #998b10 !important;
      color: inherit;
    }

    .reduce-brightness, img {
      transition: all .1s ease-in-out;
      filter: brightness(84%);

      &:hover {
        filter: none;
      }
    }
  }
}

@media screen {
  .markdown-view {
    position: absolute;
    width: 100%;
    height: 100%;
  }

  .markdown-view .markdown-body {
    max-width: 1024px;
    margin: 0 auto;
    color: var(--g-color-0);
    margin-top: 1em;

    a {
      color: #4c93e2;
    }

    tr {
      background: inherit;
    }

    *:not(button) {
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
