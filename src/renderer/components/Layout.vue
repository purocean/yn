<template>
  <div :class="{layout: true, presentation, electron: isElectron}">
    <div class="header" v-show="isElectron && !isFullscreen">
      <slot name="header"></slot>
    </div>
    <div class="main">
      <div class="left" ref="aside" v-show="showSide">
        <slot name="left"></slot>
        <div class="sash-right" @mousedown="e => initResize('right', 'aside', 100, 700, e)"></div>
      </div>
      <div class="right">
        <div class="content">
          <div class="editor" ref="editor" v-show="showEditor">
            <slot name="editor"></slot>
            <!-- <div class="sash-right" @mousedown="e => initResize('right', 'editor', 100, 99999999999, e)"></div> -->
          </div>
          <div class="preview" v-show="showView">
            <slot name="preview"></slot>
          </div>
        </div>
        <div class="terminal" ref="terminal" v-show="showXterm">
          <slot name="terminal"></slot>
          <div class="sash-top" @mousedown="e => initResize('top', 'terminal', 70, 500, e)"></div>
        </div>
      </div>
    </div>
    <div class="footer" v-show="showFooter">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, ref, toRefs } from 'vue'
import { useStore } from 'vuex'
import { $args, FLAG_DISABLE_XTERM } from '@fe/support/args'
import { emitResize } from '@fe/services/layout'
import { isElectron } from '@fe/support/env'

let resizeOrigin: any = null

export default defineComponent({
  name: 'layout',
  setup () {
    const store = useStore()

    const { showView, showXterm, showSide, showEditor, presentation, isFullscreen } = toRefs(store.state)

    const aside = ref(null)
    const editor = ref(null)
    const terminal = ref(null)
    const refs: any = { aside, editor, terminal }

    function resizeFrame (e: MouseEvent) {
      if (e.buttons !== 1) {
        resizeOrigin = null
        return
      }

      if (!resizeOrigin) {
        return
      }

      const ref = refs[resizeOrigin.ref].value

      if (resizeOrigin.type === 'right') {
        const offsetX = e.clientX - resizeOrigin.mouseX
        const width = (resizeOrigin.targetWidth + offsetX)
        ref.style.width = Math.min(resizeOrigin.max, Math.max(resizeOrigin.min, width)) + 'px'
      } else if (resizeOrigin.type === 'top') {
        const offsetY = -(e.clientY - resizeOrigin.mouseY)
        const height = (resizeOrigin.targetHeight + offsetY)
        ref.style.height = Math.min(resizeOrigin.max, Math.max(resizeOrigin.min, height)) + 'px'
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
        }
      }
    }

    onMounted(() => {
      window.addEventListener('resize', emitResize)
      window.document.addEventListener('mousemove', resizeFrame)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('resize', emitResize)
      window.document.removeEventListener('mousemove', resizeFrame)
    })

    const showFooter = $args().get('show-status-bar') !== 'false'

    return {
      initResize,
      showSide,
      showXterm: FLAG_DISABLE_XTERM ? false : showXterm,
      showFooter,
      showView,
      showEditor,
      presentation,
      isElectron,
      isFullscreen,
      aside,
      editor,
      terminal,
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
}

.sash-right {
  z-index: 1;
  height: 100%;
  position: absolute;
  right: 0;
  top: 0;
  width: 4px;
  cursor: ew-resize;
}

.sash-top {
  z-index: 1;
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 4px;
  cursor: ns-resize;
}

.right {
  flex: 1;
  width: 0;
  display: flex;
  flex-direction: column;
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
  min-width: 50%;
  display: flex;
  flex-direction: column;
}

.terminal {
  height: 200px;
  flex: none;
  position: relative;
}

.preview {
  height: 100%;
  flex: 1 1 50%;
  min-width: 50%;
  box-sizing: border-box;
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
