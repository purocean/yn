<template>
  <div ref="refPreviewer" :class="{'default-previewer': true, presentation}">
    <div class="action-bar" :style="{width: (width - 50) + 'px'}">
      <div :class="{ todo: !!todoCount }">
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
          <button type="button" class="tr" @click="print()">{{$t('view.print')}}</button>
          <button type="button" class="tr" @click="showExport">{{$t('export')}}</button>
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
    <div :class="{'scroll-to-top': true, 'hide': scrollTop < 30}" @click="scrollToTop">TOP</div>
    <XIFrame
      global-style
      trigger-parent-key-board-event
      :iframe-props="iframeProps"
      :html="initHTML"
      :on-load="onLoad"
    />
    <Teleport v-if="container" :to="container">
      <default-previewer-render />
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { useStore } from 'vuex'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { IFrame as XIFrame } from '@fe/support/embed'
import { getLogger } from '@fe/utils'
import { registerHook, removeHook, triggerHook } from '@fe/core/hook'
import { disableSyncScrollAwhile, getHeadings, getViewDom, Heading, scrollTopTo } from '@fe/services/view'
import { print, showExport } from '@fe/services/document'
import { useI18n } from '@fe/services/i18n'
import type { AppState } from '@fe/support/store'
import { getEditor } from '@fe/services/editor'

import DefaultPreviewerRender from './DefaultPreviewerRender.ce.vue'
import SvgIcon from './SvgIcon.vue'
import Outline from './Outline.vue'

useI18n()

const logger = getLogger('preview')

const iframeProps = {
  width: '100%',
  height: '100%',
  sandbox: 'allow-scripts allow-same-origin allow-popups',
}

const initHTML = '<div id="app">Loading……</div>'

const store = useStore<AppState>()

const filePath = computed(() => store.state.currentFile?.path)
const presentation = computed(() => store.state.presentation)

const container = shallowRef<HTMLIFrameElement | null>(null)
const width = ref(1024)
const height = ref(768)
const todoCount = ref(0)
const todoDoneCount = ref(0)
const scrollTop = ref(0)
const pinOutline = ref(false)
const heads = ref<Heading[]>([])
const refPreviewer = ref<HTMLDivElement | null>(null)

function onLoad (iframe: HTMLIFrameElement) {
  logger.debug('iframe loaded')

  const contentDocument = iframe.contentDocument!
  const contentWindow = iframe.contentWindow!

  contentWindow.addEventListener('scroll', handleScroll)

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
    width.value = refPreviewer.value.clientWidth
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

onMounted(() => {
  registerHook('GLOBAL_RESIZE', handleResize)
  registerHook('VIEW_RENDERED', handleRendered)
  handleResize()
})

onBeforeUnmount(() => {
  removeHook('GLOBAL_RESIZE', handleResize)
  removeHook('VIEW_RENDERED', handleRendered)
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

  &.presentation {
    .action-bar {
      display: none;
    }
  }
}

.action-bar {
  position: fixed;
  width: 27vw;
  padding: 0;
  right: 20px;
  top: 10px;
  box-sizing: border-box;
  z-index: 1000;
  pointer-events: none;

  & > div {
    &.todo {
      background-color: rgba(var(--g-color-80-rgb), 0.6);
      backdrop-filter: var(--g-backdrop-filter);
    }

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
    opacity: 0.8;
    z-index: 999;

    div {
      font-size: 12px;
      line-height: 15px;
      color: #ddd;
      text-align: right;
      box-sizing: border-box;
      transition: all .1s ease-in-out;
      white-space: nowrap;
    }
  }

  .action-btns {
    font-size: 14px;
    pointer-events: initial;
  }
}

.outline {
  position: fixed;
  right: 2em;
  top: 3em;
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
</style>
