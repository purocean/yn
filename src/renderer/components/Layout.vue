<template>
  <div ref="layout" :class="{layout: true, presentation, electron: isElectron}">
    <div class="header" v-show="isElectron && !isFullscreen">
      <slot name="header"></slot>
    </div>
    <div class="main">
      <div class="left" ref="aside" v-show="showSide">
        <slot name="left"></slot>
        <div class="sash-right" @dblclick="resetSize('right', 'aside')" @mousedown="e => initResize('right', 'aside', 130, 700, e)"></div>
      </div>
      <div class="right" ref="right">
        <div class="right-before">
          <slot name="right-before" />
        </div>
        <div class="content" ref="content">
          <div class="editor" ref="editor" v-show="showEditor">
            <slot name="editor"></slot>
          </div>
          <div ref="preview" :class="{preview: true, 'preview-hidden': !presentation && !showView}">
            <div v-if="showView && showEditor" class="sash-left" @dblclick="resetSize('right', 'editor')" @mousedown="initEditorResize"></div>
            <slot name="preview"></slot>
          </div>
          <div class="content-right-side" ref="contentRightSide" v-show="showContentRightSide">
            <div class="sash-left" @dblclick="resetSize('left', 'contentRightSide')" @mousedown="initContentRightSideResize"></div>
            <slot name="content-right-side" />
          </div>
        </div>
        <div class="terminal" ref="terminal" v-show="showXterm">
          <slot name="terminal"></slot>
          <div class="sash-top" @dblclick="resetSize('top', 'terminal')" @mousedown="e => initResize('top', 'terminal', 70, 500, e)"></div>
        </div>
      </div>
    </div>
    <div class="footer" v-show="showFooter">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, ref, toRefs, watchPostEffect } from 'vue'
import { $args, FLAG_DISABLE_XTERM } from '@fe/support/args'
import { emitResize, setContainerDom, toggleEditor, toggleSide, toggleView, toggleContentRightSide, toggleXterm } from '@fe/services/layout'
import { isElectron } from '@fe/support/env'
import store from '@fe/support/store'

let resizeOrigin: any = null

export default defineComponent({
  name: 'layout',
  setup () {
    const { showView, showXterm, showSide, showEditor, presentation, isFullscreen, showContentRightSide } = toRefs(store.state)

    const layout = ref<HTMLElement | null>(null)
    const aside = ref<HTMLElement | null>(null)
    const right = ref<HTMLElement | null>(null)
    const editor = ref<HTMLElement | null>(null)
    const preview = ref<HTMLElement | null>(null)
    const terminal = ref<HTMLElement | null>(null)
    const content = ref<HTMLElement | null>(null)
    const contentRightSide = ref<HTMLElement | null>(null)
    const refs: any = { aside, editor, terminal, contentRightSide }
    const containerRefs = [
      ['layout', layout],
      ['aside', aside],
      ['right', right],
      ['content', content],
      ['editor', editor],
      ['preview', preview],
      ['terminal', terminal],
      ['contentRightSide', contentRightSide],
    ] as const

    function resizeOutOfRange (ref: string, outOfRange: null | 'min' | 'max') {
      if (ref === 'aside' && outOfRange === 'min') {
        toggleSide(false)
        return true
      }

      if (ref === 'terminal' && outOfRange === 'min') {
        toggleXterm(false)
        return true
      }

      if (ref === 'contentRightSide' && outOfRange === 'min') {
        toggleContentRightSide(false)
        return true
      }

      if (ref === 'editor') {
        if (outOfRange === 'min') {
          toggleEditor(false)
        } else if (outOfRange === 'max') {
          toggleView(false)
        }

        return false
      }

      return false
    }

    function getContainerSibling (ref: HTMLElement, resizeOrigin: any): HTMLElement | null {
      return (resizeOrigin.type === 'right'
        ? ref.nextElementSibling
        : ref.previousElementSibling) as HTMLElement | null
    }

    function clearResize () {
      if (resizeOrigin) {
        const ref = refs[resizeOrigin.ref].value
        ref.style.filter = ''
        ref.style.pointerEvents = ''

        const sibling = getContainerSibling(ref, resizeOrigin)
        if (sibling) {
          sibling.style.pointerEvents = ''
        }

        resizeOrigin = null
      }
    }

    function resizeFrame (e: MouseEvent) {
      if (e.buttons !== 1) {
        clearResize()
        return
      }

      if (!resizeOrigin) {
        return
      }

      const ref = refs[resizeOrigin.ref].value

      function checkOutOfRange (value: number) {
        if (value < resizeOrigin.min || value > resizeOrigin.max) {
          ref.style.filter = 'opacity(0.5)'
          resizeOrigin.outOfRange = value < resizeOrigin.min ? 'min' : 'max'
        } else {
          ref.style.filter = ''
          resizeOrigin.outOfRange = null
        }
      }

      // prevent pointer events when mouse in container range
      const sibling = getContainerSibling(ref, resizeOrigin)
      if (sibling) {
        ref.style.pointerEvents = 'none'
        sibling.style.pointerEvents = 'none'
      }

      if (resizeOrigin.type === 'right') {
        const offsetX = e.clientX - resizeOrigin.mouseX
        const width = (resizeOrigin.targetWidth + offsetX)

        checkOutOfRange(width)

        const fixedWidth = Math.min(resizeOrigin.max, Math.max(resizeOrigin.min, width)) + 'px'
        ref.style.width = fixedWidth
        ref.style.minWidth = fixedWidth
        ref.style.maxWidth = fixedWidth
      } else if (resizeOrigin.type === 'left') {
        const offsetX = -(e.clientX - resizeOrigin.mouseX)
        const width = (resizeOrigin.targetWidth + offsetX)

        checkOutOfRange(width)

        const fixedWidth = Math.min(resizeOrigin.max, Math.max(resizeOrigin.min, width)) + 'px'
        ref.style.width = fixedWidth
        ref.style.minWidth = fixedWidth
        ref.style.maxWidth = fixedWidth
      } else if (resizeOrigin.type === 'top') {
        const offsetY = -(e.clientY - resizeOrigin.mouseY)
        const height = (resizeOrigin.targetHeight + offsetY)

        checkOutOfRange(height)

        ref.style.height = Math.min(resizeOrigin.max, Math.max(resizeOrigin.min, height)) + 'px'
      }
      emitResize()
    }

    function resizeDone () {
      if (!resizeOrigin) {
        return
      }

      const ref = refs[resizeOrigin.ref].value

      if (resizeOrigin.outOfRange) {
        if (resizeOutOfRange(resizeOrigin.ref, resizeOrigin.outOfRange)) {
          if (resizeOrigin.type === 'right' || resizeOrigin.type === 'left') {
            ref.style.width = resizeOrigin.targetWidth + 'px'
            ref.style.maxWidth = ref.style.width
            ref.style.minWidth = ref.style.width
          }

          if (resizeOrigin.type === 'top') {
            ref.style.height = resizeOrigin.targetHeight + 'px'
          }
        }
      }

      clearResize()
    }

    function resetSize (type: any, ref: any) {
      const refEl = refs[ref].value

      if (type === 'right' || type === 'left') {
        refEl.style.width = ''
        refEl.style.minWidth = ''
        refEl.style.maxWidth = ''
      } else if (type === 'top') {
        refEl.style.height = ''
      }

      emitResize()
    }

    function initResize (type: any, ref: any, min: any, max: any, e: any) {
      const refEl = refs[ref].value
      if (!resizeOrigin && type) {
        resizeOrigin = {
          min,
          max,
          type,
          ref,
          mouseX: e.clientX,
          mouseY: e.clientY,
          targetWidth: refEl.clientWidth,
          targetHeight: refEl.clientHeight,
          targetLeft: refEl.clientLeft,
          targetTop: refEl.clientTop,
          outOfRange: null, // min max
        }
      }
    }

    function initEditorResize (e: MouseEvent) {
      if (content.value && contentRightSide.value) {
        const maxWidth = content.value.clientWidth - 200 - contentRightSide.value.clientWidth
        initResize('right', 'editor', 200, maxWidth, e)
      }
    }

    function initContentRightSideResize (e: MouseEvent) {
      if (content.value && editor.value) {
        const maxWidth = content.value.clientWidth - 200 - editor.value.clientWidth
        initResize('left', 'contentRightSide', 200, maxWidth, e)
      }
    }

    watchPostEffect(() => {
      // clean width for editor when only one view
      if (showEditor.value !== showView.value) {
        if (editor.value) {
          editor.value.style.width = ''
          editor.value.style.minWidth = ''
          editor.value.style.maxWidth = ''
        }
      }
    })

    onMounted(() => {
      containerRefs.forEach(([name, element]) => setContainerDom(name, element.value))

      window.addEventListener('resize', emitResize)
      window.document.addEventListener('mousemove', resizeFrame)
      window.document.addEventListener('mouseup', resizeDone)
    })

    onBeforeUnmount(() => {
      containerRefs.forEach(([name]) => setContainerDom(name, null))

      window.removeEventListener('resize', emitResize)
      window.document.removeEventListener('mousemove', resizeFrame)
      window.document.removeEventListener('mouseup', resizeDone)
    })

    const showFooter = $args().get('show-status-bar') !== 'false'

    return {
      resetSize,
      initResize,
      initEditorResize,
      initContentRightSideResize,
      showSide,
      showXterm: FLAG_DISABLE_XTERM ? false : showXterm,
      showFooter,
      showView,
      showEditor,
      showContentRightSide,
      presentation,
      isElectron,
      isFullscreen,
      layout,
      aside,
      right,
      editor,
      preview,
      terminal,
      content,
      contentRightSide,
    }
  },
})
</script>

<style lang="scss" scoped>
.layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;

  &.presentation {
    .terminal,
    .left,
    .right-before,
    .editor,
    .header,
    .footer {
      display: none;
    }

    &.electron {
      .header {
        display: block;
      }
    }

    .preview {
      width: 100%;
      display: block !important;
    }
  }
}

.header {
  height: 30px;
}

.main {
  display: flex;
  height: 0;
  width: 100%;
  flex: 1;
}

.left {
  position: relative;
  width: 17vw;
  flex: none;
  height: 100%;
  border-right: 1px solid var(--g-color-86);
  display: flex;
  flex-direction: column;
  background: var(--g-color-98);

  ::v-deep(.action-bar .btns) {
    opacity: 0;
    transition: 0.2s;
  }

  &:hover ::v-deep(.action-bar .btns) {
    opacity: 1;
  }
}

.sash-left {
  z-index: 11;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  cursor: ew-resize;
  pointer-events: auto;
}

.sash-right {
  z-index: 11;
  height: 100%;
  position: absolute;
  right: -2px;
  top: 0;
  width: 4px;
  cursor: ew-resize;
  pointer-events: auto;
}

.sash-top {
  z-index: 11;
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 4px;
  cursor: ns-resize;
  pointer-events: auto;
}

.right {
  flex: 1;
  width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.right-before {
  flex: none;
}

.content {
  flex: 1;
  height: 0;
  display: flex;
  overflow: hidden;
}

.editor {
  height: 100%;
  position: relative;
  flex: 1 1 50%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--g-color-86);
}

.terminal {
  height: 200px;
  flex: none;
  position: relative;
}

.preview {
  height: 100%;
  flex: 1 1 50%;
  min-width: 0;
  box-sizing: border-box;
  position: relative;

  &.preview-hidden {
    visibility: hidden;
    width: 0;
    flex: none;
  }
}

.content-right-side {
  height: 100%;
  width: 300px;
  flex: none;
  position: relative;
  border-left: 1px solid var(--g-color-86);
  background: var(--g-color-98);
}

.footer {
  width: 100vw;
  height: 20px;
  flex: none;
}

@media print {
  .terminal,
  .left,
  .editor,
  .header,
  .footer {
    display: none;
  }

  .preview {
    width: 100%;
    height: fit-content;
  }

  .layout {
    height: auto;
  }

  .right {
    display: block;
  }

  .content {
    height: initial;
  }
}
</style>
