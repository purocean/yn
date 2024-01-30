<template>
  <div :class="{'markdown-view': true, presentation}">
    <article ref="refView" class="markdown-body" @dblclick.capture="handleDbClick" @click.capture="handleClick" @contextmenu.capture="handleContextMenu">
      <Render :content="renderContent" />
    </article>
  </div>
</template>

<script lang="ts" setup>
import { debounce } from 'lodash-es'
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { triggerHook } from '@fe/core/hook'
import { registerAction, removeAction } from '@fe/core/action'
import { CtrlCmd } from '@fe/core/keybinding'
import { toUri, isOutOfRepo } from '@fe/services/document'
import * as renderer from '@fe/services/renderer'
import { getContextMenuItems, getRenderIframe, scrollTopTo } from '@fe/services/view'
import { useContextMenu } from '@fe/support/ui/context-menu'
import { DOM_ATTR_NAME } from '@fe/support/args'
import { getLogger, sleep } from '@fe/utils'
import { t } from '@fe/services/i18n'
import store from '@fe/support/store'
import type { RenderEnv } from '@fe/types'

const logger = getLogger('preview')

const Render = defineComponent({
  name: 'render',
  props: {
    content: [Object, String],
  },
  setup (props) {
    return () => {
      const { content } = props

      if (typeof content === 'string') {
        return h('div', { innerHTML: content })
      }

      return content
    }
  },
})

const presentation = computed(() => store.state.presentation)
const inComposition = computed(() => store.state.inComposition)
const autoPreview = computed(() => store.state.autoPreview)
const currentFile = computed(() => store.state.currentFile)
const currentContent = computed(() => store.state.currentContent)
const fileUri = computed(() => toUri(currentFile.value))

const refView = ref<HTMLElement | null>(null)
const renderContent = ref()

let renderCount = 0
let renderEnv: RenderEnv | null = null
let updateRender = debounce(render, 25)
const renderDebounce = debounce(render, 100, { leading: true })

function getRenderEnv () {
  return renderEnv
}

function getViewDom () {
  return refView.value
}

async function render (checkInComposition = false) {
  if (checkInComposition && inComposition.value) {
    logger.debug('render in composition, skip')
    return
  }

  logger.debug('render')

  renderCount++
  // first render, reset debounce time
  if (renderCount === 1) {
    updateRender = debounce(render, 25)
  }

  const content = currentContent.value

  const file = currentFile.value || null
  const safeMode = isOutOfRepo(file) // enable safe mode for root repo

  const startTime = performance.now()
  renderEnv = { tokens: [], source: content, file, renderCount, safeMode }
  try {
    renderContent.value = renderer.render(content, renderEnv)
  } catch (error: any) {
    logger.error('render', error)
    renderContent.value = h('div', [
      h('h2', { style: 'color: red' }, 'Error'),
      h('pre', error.stack || error.toString())
    ])
  }

  const parseTime = performance.now() - startTime

  triggerHook('VIEW_RENDER')
  nextTick(() => triggerHook('VIEW_RENDERED'))

  await sleep(0) // wait for paint

  const renderTime = performance.now() - startTime

  logger.debug('rendered', renderCount, 'cost', parseTime, renderTime)

  if (renderCount > 2) {
    // dynamic debounce
    updateRender = debounce(render.bind(null, true), Math.max(25, renderTime * 1.2))
  }
}

async function keydownHandler (e: KeyboardEvent) {
  triggerHook('VIEW_KEY_DOWN', { e, view: getViewDom()! }, { breakable: true })
}

function handleDbClick (e: MouseEvent) {
  triggerHook('VIEW_ELEMENT_DBCLICK', { e, view: getViewDom()! }, { breakable: true })
}

function handleClick (e: MouseEvent) {
  triggerHook('VIEW_ELEMENT_CLICK', { e, view: getViewDom()! }, { breakable: true })
}

function handleContextMenu (e: MouseEvent) {
  const contextMenuItems = getContextMenuItems(e)
  if (contextMenuItems.length > 0) {
    e.stopPropagation()
    e.preventDefault()

    const clientX = e.clientX
    const clientY = e.clientY

    getRenderIframe().then((iframe) => {
      const iframeRect = iframe.getBoundingClientRect()
      useContextMenu().show(contextMenuItems, {
        mouseX: iframeRect.left + clientX,
        mouseY: iframeRect.top + clientY,
      })
    })
  }
}

async function revealLine (startLine: number): Promise<HTMLElement | null> {
  if (startLine <= 1) {
    scrollTopTo(0)
    return null
  }

  const iframe = await getRenderIframe()
  const contentWindow = iframe.contentWindow!

  const nodes = refView.value!.querySelectorAll<HTMLElement>(`[${DOM_ATTR_NAME.SOURCE_LINE_START}]`)
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
        window.scrollTo(0, contentWindow.innerHeight + contentWindow.scrollY)

        return el
      }

      prevEl = el
      continue
    }

    if (lineNumber === startLine) {
      el.scrollIntoView()
      return el
    }

    if (prevEl) {
      const prevOffset = prevEl.getBoundingClientRect().top
      const elOffset = el.getBoundingClientRect().top
      const prevLine = parseInt(prevEl.dataset.sourceLine || '0')
      const top = contentWindow.scrollY + Math.round((elOffset * (startLine - prevLine) + prevOffset * (lineNumber - startLine)) / (lineNumber - prevLine))
      contentWindow.scrollTo(0, top)
      return prevEl
    }
  }

  return null
}

function getContentHtml (selected = false) {
  if (selected && refView.value) {
    const win = refView.value.ownerDocument.defaultView
    const selection = win?.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const container = document.createElement('div')
      container.appendChild(range.cloneContents())
      return container.innerHTML
    } else {
      return ''
    }
  }

  return refView.value?.outerHTML || ''
}

async function refresh () {
  logger.debug('refresh')
  await triggerHook('VIEW_BEFORE_REFRESH', undefined, { breakable: true })
  renderDebounce()
  triggerHook('VIEW_AFTER_REFRESH')
}

onMounted(() => {
  nextTick(renderDebounce)
  triggerHook('VIEW_MOUNTED')
  registerAction({ name: 'view.render-immediately', handler: render.bind(null, false) })
  registerAction({ name: 'view.render', handler: renderDebounce })
  registerAction({ name: 'view.reveal-line', handler: revealLine })
  registerAction({ name: 'view.get-content-html', handler: getContentHtml })
  registerAction({ name: 'view.get-view-dom', handler: getViewDom })
  registerAction({ name: 'view.get-render-env', handler: getRenderEnv })

  registerAction({
    name: 'view.refresh',
    description: t('command-desc.view_refresh'),
    handler: refresh,
    keys: [CtrlCmd, 'r'],
    forUser: true
  })

  window.addEventListener('keydown', keydownHandler, true)
})

onBeforeUnmount(() => {
  removeAction('view.render-immediately')
  removeAction('view.render')
  removeAction('view.refresh')
  removeAction('view.reveal-line')
  removeAction('view.get-content-html')
  removeAction('view.get-view-dom')
  removeAction('view.get-render-env')
  window.removeEventListener('keydown', keydownHandler, true)
})

watch([currentContent, fileUri, inComposition], () => {
  if (autoPreview.value) {
    if (renderCount === 0) {
      render()
    } else {
      updateRender()
    }
  }
}, { flush: 'post' })

watch(fileUri, () => {
  renderCount = 0
  triggerHook('VIEW_FILE_CHANGE')
})
</script>

<style lang="scss" scoped>
.markdown-view.presentation {
  .markdown-body {
    margin-top: 0;
  }
}
</style>

<style lang="scss">
@import '@fe/styles/mixins.scss';

body.find-in-preview-highlight ::selection {
  background-color: #ffeb3b !important;
}

.markdown-view {
  padding: 40px;
  padding-top: 20px;
  box-sizing: border-box;

  .markdown-body {
    position: relative;

    mark {
      background: #fff8c5 !important;
    }

    fieldset {
      border-style: solid;
      border-width: 1px;
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

    p > img[auto-center] {
      display: block;
      margin-left: auto;
      margin-right: auto;
    }

    img {
      &.inline,
      &[src*=".inline"],
      &[origin-src*=".inline"] {
        display: inline !important;
      }

      &.bgw,
      &[src*=".bgw"],
      &[origin-src*=".bgw"] {
        background-color: #fff !important;
      }
    }

    a:not([href^="#fn"])[href^="#"]:after {
      content: '\200D\2002';
      padding: 2px;
      background-repeat: no-repeat;
      background-size: 95% 95%;
      background-image: url(data:image/svg+xml,%3Csvg%20aria-hidden%3D%22true%22%20focusable%3D%22false%22%20data-prefix%3D%22far%22%20data-icon%3D%22anchor%22%20role%3D%22img%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20576%20512%22%20class%3D%22svg-inline--fa%20fa-anchor%20fa-w-18%22%3E%3Cpath%20fill%3D%22%23999999%22%20d%3D%22M571.515%20331.515l-67.029-67.029c-4.686-4.686-12.284-4.686-16.971%200l-67.029%2067.029c-7.56%207.56-2.206%2020.485%208.485%2020.485h44.268C453.531%20417.326%20380.693%20456.315%20312%20462.865V216h60c6.627%200%2012-5.373%2012-12v-24c0-6.627-5.373-12-12-12h-60v-11.668c32.456-10.195%2056-40.512%2056-76.332%200-44.183-35.817-80-80-80s-80%2035.817-80%2080c0%2035.82%2023.544%2066.138%2056%2076.332V168h-60c-6.627%200-12%205.373-12%2012v24c0%206.627%205.373%2012%2012%2012h60v246.865C195.192%20456.304%20122.424%20417.176%20102.762%20352h44.268c10.691%200%2016.045-12.926%208.485-20.485l-67.029-67.029c-4.686-4.686-12.284-4.686-16.971%200l-67.03%2067.029C-3.074%20339.074%202.28%20352%2012.971%20352h40.284C73.657%20451.556%20181.238%20512%20288%20512c113.135%200%20215.338-65.3%20234.745-160h40.284c10.691%200%2016.045-12.926%208.486-20.485zM288%2048c17.645%200%2032%2014.355%2032%2032s-14.355%2032-32%2032-32-14.355-32-32%2014.355-32%2032-32z%22%20class%3D%22%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E);
      box-sizing: content-box;
      background-position-x: center;
      background-position-y: 1px;
      margin-left: 2px;
      margin-right: 3px;
    }

    a[href=""] {
      color: var(--g-color-40);
    }

    a[href$=".md"],
    a[href*=".md#"] {
      &:after {
        content: '\200D\2002';
        padding: 1px;
        background-repeat: no-repeat;
        background-size: 95% 95%;
        background-image: url(data:image/svg+xml,%3Csvg%20aria-hidden%3D%22true%22%20focusable%3D%22false%22%20data-prefix%3D%22far%22%20data-icon%3D%22file-alt%22%20role%3D%22img%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20384%20512%22%20class%3D%22svg-inline--fa%20fa-file-alt%20fa-w-12%22%3E%3Cpath%20fill%3D%22%23999999%22%20d%3D%22M288%20248v28c0%206.6-5.4%2012-12%2012H108c-6.6%200-12-5.4-12-12v-28c0-6.6%205.4-12%2012-12h168c6.6%200%2012%205.4%2012%2012zm-12%2072H108c-6.6%200-12%205.4-12%2012v28c0%206.6%205.4%2012%2012%2012h168c6.6%200%2012-5.4%2012-12v-28c0-6.6-5.4-12-12-12zm108-188.1V464c0%2026.5-21.5%2048-48%2048H48c-26.5%200-48-21.5-48-48V48C0%2021.5%2021.5%200%2048%200h204.1C264.8%200%20277%205.1%20286%2014.1L369.9%2098c9%208.9%2014.1%2021.2%2014.1%2033.9zm-128-80V128h76.1L256%2051.9zM336%20464V176H232c-13.3%200-24-10.7-24-24V48H48v416h288z%22%20class%3D%22%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E);
        box-sizing: content-box;
        background-position-x: right;
        background-position-y: 1px;
        margin-left: 2px;
        margin-right: 4px;
      }
    }

    a[href^="//"],
    a[href^="http://"],
    a[href^="https://"] {
      &:after {
        content: '\200D\2002';
        padding: 2px;
        background-repeat: no-repeat;
        background-size: 95% 95%;
        background-image: url(data:image/svg+xml,%3Csvg%20aria-hidden%3D%22true%22%20focusable%3D%22false%22%20data-prefix%3D%22far%22%20data-icon%3D%22external-link%22%20role%3D%22img%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20512%20512%22%20class%3D%22svg-inline--fa%20fa-external-link%20fa-w-16%22%3E%3Cpath%20fill%3D%22%23999999%22%20d%3D%22M497.6%2C0%2C334.4.17A14.4%2C14.4%2C0%2C0%2C0%2C320%2C14.57V47.88a14.4%2C14.4%2C0%2C0%2C0%2C14.69%2C14.4l73.63-2.72%2C2.06%2C2.06L131.52%2C340.49a12%2C12%2C0%2C0%2C0%2C0%2C17l23%2C23a12%2C12%2C0%2C0%2C0%2C17%2C0L450.38%2C101.62l2.06%2C2.06-2.72%2C73.63A14.4%2C14.4%2C0%2C0%2C0%2C464.12%2C192h33.31a14.4%2C14.4%2C0%2C0%2C0%2C14.4-14.4L512%2C14.4A14.4%2C14.4%2C0%2C0%2C0%2C497.6%2C0ZM432%2C288H416a16%2C16%2C0%2C0%2C0-16%2C16V458a6%2C6%2C0%2C0%2C1-6%2C6H54a6%2C6%2C0%2C0%2C1-6-6V118a6%2C6%2C0%2C0%2C1%2C6-6H208a16%2C16%2C0%2C0%2C0%2C16-16V80a16%2C16%2C0%2C0%2C0-16-16H48A48%2C48%2C0%2C0%2C0%2C0%2C112V464a48%2C48%2C0%2C0%2C0%2C48%2C48H400a48%2C48%2C0%2C0%2C0%2C48-48V304A16%2C16%2C0%2C0%2C0%2C432%2C288Z%22%20class%3D%22%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E);
        box-sizing: content-box;
        background-position-x: right;
        background-position-y: 2px;
        margin-left: 2px;
        margin-right: 4px;
      }
    }

    table a::after {
      display: none !important;
    }
  }
}

@include dark-theme {
  body.find-in-preview-highlight ::selection {
    background-color: #bfb346 !important;
  }

  .markdown-body {
    mark {
      background: #746900 !important;
      color: #ebebeb;
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
  .markdown-view  .markdown-body {
    max-width: 1024px;
    margin: 0 auto;
    color: var(--g-color-0);
    margin-top: 1em;

    a {
      color: var(--g-color-anchor);
    }

    tr {
      background: inherit;
    }

    hr, h1, h2, td, th,
    fieldset, blockquote {
      border-color: var(--g-color-80);
    }

    hr {
      background-color: inherit;
    }

    code {
      background: rgba(var(--g-color-80-rgb), 0.9);
    }

    pre {
      position: relative;
    }

    pre,
    table tr:nth-child(2n),
    pre > code {
      background: var(--g-color-96);
    }

    h1, h2, h3, h4, h5, h6 {
      &:hover {
        &::after {
          content: "\0000a0\0000a0" attr(data-tag);
          color: var(--g-color-40);
          font-size: 12px;
          width: 0;
          display: inline-block;
          white-space: nowrap;
        }
      }
    }

    .preview-highlight {
      background-color: rgba(255, 183, 0, 0.6) !important;
      outline: 1px solid rgba(255, 183, 0, 0.8) !important;
    }
  }
}

@media screen and (max-width: 380px) {
  .markdown-view {
    padding-left: 15px;
    padding-right: 15px;
  }
}

@media print {
  .markdown-view {
    padding: 0;
  }
}
</style>
