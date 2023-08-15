<template>
  <div ref="refPreviewer" :class="{'default-previewer': true}">
    <div v-show="scrollTop > 0" class="scroll-decoration"></div>
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
    <div :class="{'scroll-to-top': true, 'hide': scrollTop < 30}" @click="scrollToTop">TOP</div>
    <FindInPreview />
    <XIFrame
      v-if="iframeVisible"
      global-style
      trigger-parent-key-board-event
      :iframe-props="iframeProps"
      :html="initHTML"
      :on-load="onLoad"
    />
    <Teleport v-if="iframeVisible && container" :to="container">
      <default-previewer-render />
    </Teleport>
  </div>
</template>

<script lang="tsx" setup>
import { useStore } from 'vuex'
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { IFrame as XIFrame } from '@fe/support/embed'
import { getLogger } from '@fe/utils'
import { registerHook, removeHook, triggerHook } from '@fe/core/hook'
import { disableSyncScrollAwhile, getHeadings, getViewDom, Heading, scrollTopTo } from '@fe/services/view'
import { printCurrentDocument, toggleExportPanel } from '@fe/services/export'
import { useI18n } from '@fe/services/i18n'
import { getEditor } from '@fe/services/editor'
import type { AppState } from '@fe/support/store'
import { useToast } from '@fe/support/ui/toast'
import { isElectron } from '@fe/support/env'
import type { Components } from '@fe/types'

import DefaultPreviewerRender from './DefaultPreviewerRender.ce.vue'
import SvgIcon from './SvgIcon.vue'
import Outline from './Outline.vue'
import FindInPreview from './FindInPreview.vue'
import { FileTabs } from '@fe/services/workbench'
import { isMarkdownFile } from '@fe/services/document'

const { t } = useI18n()

const logger = getLogger('preview')

const iframeProps = {
  width: '100%',
  height: '100%',
  sandbox: 'allow-scripts allow-same-origin allow-popups allow-modals',
}

const initHTML = '<div id="app">Loading……</div>'

const store = useStore<AppState>()

const filePath = computed(() => store.state.currentFile?.path)

const container = shallowRef<HTMLIFrameElement | null>(null)
const height = ref(768)
const todoCount = ref(0)
const todoDoneCount = ref(0)
const scrollTop = ref(0)
const pinOutline = ref(false)
const iframeVisible = ref(true)
const heads = ref<Heading[]>([])
const refPreviewer = ref<HTMLDivElement | null>(null)

function onLoad (iframe: HTMLIFrameElement) {
  logger.debug('iframe loaded')

  const contentDocument = iframe.contentDocument!
  const contentWindow = iframe.contentWindow!

  contentWindow.addEventListener('scroll', handleScroll)
  contentWindow.addEventListener('beforeunload', (e) => {
    if (isElectron) {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    logger.warn('iframe beforeunload')
    iframeVisible.value = false
    setTimeout(() => {
      useToast().show('warning', 'IFrame Error!')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    }, 3000)
  })

  container.value = contentDocument.getElementById('app')! as HTMLIFrameElement

  if (container.value) {
    container.value.innerHTML = ''
  }

  iframe.style.position = 'absolute'
  iframe.style.willChange = 'transform'

  const styles = DefaultPreviewerRender.styles || []

  styles.forEach((style: string) => {
    const styleElement = iframe.contentDocument!.createElement('style')
    styleElement.innerHTML = style
    iframe.contentDocument!.head.appendChild(styleElement)
  })

  nextTick(() => {
    triggerHook('VIEW_RENDER_IFRAME_READY', { iframe })
  })
}

function updateOutline () {
  heads.value = getHeadings()
}

function updateTodoCount () {
  const viewDom = getViewDom()
  if (!viewDom) {
    return
  }

  const nodes = viewDom.querySelectorAll<HTMLInputElement>('input[type=checkbox]')
  todoCount.value = nodes.length

  let done = 0
  nodes.forEach(node => {
    if (node.checked) {
      done++
    }
  })
  todoDoneCount.value = done
}

function togglePinOutline () {
  pinOutline.value = !pinOutline.value
}

function handleResize () {
  if (refPreviewer.value) {
    height.value = refPreviewer.value.clientHeight
  }
}

function handleScroll (e: Event) {
  scrollTop.value = (e.target as Document).documentElement.scrollTop
  triggerHook('VIEW_SCROLL', { e })
}

function handleRendered () {
  if ((window as any).requestIdleCallback) {
    (window as any).requestIdleCallback(() => {
      updateOutline()
      updateTodoCount()
    }, { timeout: 80 })
  } else {
    setTimeout(() => {
      updateOutline()
      updateTodoCount()
    }, 80)
  }
}

const Progress = defineComponent({
  props: {
    total: {
      type: Number,
      required: true,
    },
    done: {
      type: Number,
      required: true,
    },
  },
  setup (props) {
    const text = computed(() => `${props.done} of ${props.total} task` + (props.total > 1 ? 's' : ''))
    const offset = computed(() => 38 - (props.done / props.total) * 38)
    const percent = computed(() => ((props.done / props.total) * 100).toFixed(2) + '%')

    return () => <div class="todo-progress" style={{ display: 'flex', margin: '0 4px', fontVariantNumeric: 'tabular-nums' }} title={percent.value}>
      <svg key="123" width="16" height="16" style={{ marginRight: '5px', transform: 'rotate(-90deg)' }}>
        <circle stroke="var(--g-color-70)" stroke-width="3" fill="transparent" cx="50%" cy="50%" r="6"></circle>
        <circle style="transition: stroke-dashoffset 0.35s; transform: rotate(7.105263157894736deg); transform-origin: center"
        stroke="var(--g-color-anchor)"
        stroke-width="3"
        stroke-dasharray="38"
        stroke-dashoffset={ offset.value }
        stroke-linecap="round" fill="transparent" cx="50%" cy="50%" r="6"></circle>
      </svg>
      <span style={{ fontSize: '12px', whiteSpace: 'nowrap', lineHeight: '16px' }}>{text.value}</span>
    </div>
  }
})

const tabsActionBtnTapper = (btns: Components.Tabs.ActionBtn[]) => {
  if (!filePath.value) {
    return
  }

  const order = 8000

  if (todoCount.value > 0) {
    btns.push(
      { type: 'separator', order },
      {
        type: 'custom',
        order,
        component: h(Progress, {
          total: todoCount.value,
          done: todoDoneCount.value,
        }),
      },
    )
  }

  if (
    (!store.state.previewer || store.state.previewer === 'default') &&
    store.state.currentFile && isMarkdownFile(store.state.currentFile)
  ) {
    btns.push(
      { type: 'separator', order },
      {
        type: 'normal',
        icon: 'print-solid',
        title: t('print'),
        onClick: () => printCurrentDocument(),
        order,
      },
      {
        type: 'normal',
        icon: 'file-export-solid',
        title: t('export'),
        onClick: () => toggleExportPanel(),
        order,
      }
    )
  }
}

watch([filePath, todoCount, todoDoneCount], () => {
  FileTabs.refreshActionBtns()
})

onMounted(() => {
  registerHook('GLOBAL_RESIZE', handleResize)
  registerHook('VIEW_RENDERED', handleRendered)
  FileTabs.tapActionBtns(tabsActionBtnTapper)
  handleResize()
})

onBeforeUnmount(() => {
  removeHook('GLOBAL_RESIZE', handleResize)
  removeHook('VIEW_RENDERED', handleRendered)
  FileTabs.removeActionBtnTapper(tabsActionBtnTapper)
})

async function scrollToTop () {
  disableSyncScrollAwhile(() => {
    scrollTopTo(0)
    getEditor().revealLineInCenter(1)
  })
}
</script>

<style lang="scss" scoped>
.default-previewer {
  position: relative;
  height: 100%;
  width: 100%;
  transform: translateZ(0);
  user-select: none;
}

.outline {
  position: fixed;
  right: 2em;
  top: 0.5em;
  background: rgba(var(--g-color-85-rgb), 0.8);
  backdrop-filter: var(--g-backdrop-filter);
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
    box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;

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

.scroll-to-top {
  user-select: none;
  position: fixed;
  bottom: 2em;
  right: 2em;
  background: rgba(var(--g-color-85-rgb), 0.7);
  backdrop-filter: blur(10px);
  color: var(--g-color-10);
  font-size: 14px;
  overflow: hidden;
  transition: .1s ease-in-out;
  z-index: 400;
  border-radius: var(--g-border-radius);
  cursor: pointer;
  padding: 7px 5px;
  text-align: center;

  &::before {
    content: ' ';
    display: block;
    border-left: 20px transparent solid;
    border-bottom: 7px var(--g-color-40) solid;
    border-right: 20px transparent solid;
    margin-bottom: 4px;
  }

  &:hover {
    background: var(--g-color-80);
  }

  &.hide {
    opacity: 0;
    right: -60px;
  }
}

.scroll-decoration {
  content: '';
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: 6px;
  box-shadow: rgba(var(--g-color-80-rgb), 0.8) 0 6px 6px -6px inset;
}
</style>
