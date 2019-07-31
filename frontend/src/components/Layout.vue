<template>
  <div class="layout">
    <div class="header">
      <slot name="header"></slot>
    </div>
    <div class="main">
      <div class="left" ref="aside">
        <slot name="left"></slot>
        <div class="sash-right" @mousedown="e => initResize('right', 'aside', 100, 700, e)"></div>
      </div>
      <div class="right">
        <div class="content">
          <div class="editor" ref="editor">
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
    <div class="footer">
      <slot name="footer"></slot>
    </div>
    <div v-if="toast" :class="{toast: true, [`toast-${toast.type}`]: true}">{{toast.content}}</div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

let resizeOrigin = null

export default {
  name: 'layout',
  data () {
    return {
      toast: null
    }
  },
  mounted () {
    window.document.addEventListener('mousemove', this.resizeFrame)
    this.$bus.on('show-toast', this.showToast)
    this.$bus.on('toggle-view', this.toggleView)
    this.$bus.on('toggle-xterm', this.toggleXterm)
  },
  beforeDestroy () {
    window.document.removeEventListener('mousemove', this.resizeFrame)
    this.$bus.off('toggle-view', this.toggleView)
    this.$bus.off('toggle-xterm', this.toggleXterm)
    this.$bus.off('show-toast', this.showToast)
  },
  methods: {
    showToast (type, content, timeout = 2000) {
      // TODO 暂时只有 warn type
      this.toast = { type, content }

      setTimeout(() => {
        this.toast = null
      }, timeout)
    },
    toggleView () {
      this.$store.commit('app/setShowView', !this.showView)
      this.$nextTick(() => this.$bus.emit('resize'), 500)
    },
    toggleXterm (val) {
      const showXterm = typeof val === 'boolean' ? val : !this.showXterm

      this.$store.commit('app/setShowXterm', showXterm)

      this.$nextTick(() => {
        this.$nextTick(() => this.$bus.emit('resize'), 500)

        if (showXterm) {
          this.$bus.emit('xterm-init')
        }
      })
    },
    initResize (type, ref, min, max, e) {
      if (!resizeOrigin && type) {
        resizeOrigin = {
          min,
          max,
          type,
          ref,
          mouseX: e.clientX,
          mouseY: e.clientY,
          targetWidth: this.$refs[ref].clientWidth,
          targetHeight: this.$refs[ref].clientHeight,
          targetLeft: this.$refs[ref].clientLeft,
          targetTop: this.$refs[ref].clientTop,
        }
      }
    },
    resizeFrame (e) {
      if (e.buttons !== 1) {
        resizeOrigin = null
        return
      }

      if (!resizeOrigin) {
        return
      }

      if (resizeOrigin.type === 'right') {
        const offsetX = e.clientX - resizeOrigin.mouseX
        const width = (resizeOrigin.targetWidth + offsetX)
        this.$refs[resizeOrigin.ref].style.width = Math.min(resizeOrigin.max, Math.max(resizeOrigin.min, width)) + 'px'
      } else if (resizeOrigin.type === 'top') {
        const offsetY = -(e.clientY - resizeOrigin.mouseY)
        const height = (resizeOrigin.targetHeight + offsetY)
        this.$refs[resizeOrigin.ref].style.height = Math.min(resizeOrigin.max, Math.max(resizeOrigin.min, height)) + 'px'
      }
      this.$bus.emit('resize')
    }
  },
  computed: {
    ...mapState('app', ['showView', 'showXterm'])
  }
}
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
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
}

.sash-right {
  z-index: 1;
  height: 100%;
  position: absolute;
  right: 0;
  top: 0;
  width: 4px;
  cursor: w-resize;
}

.sash-top {
  z-index: 1;
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 4px;
  cursor: s-resize;
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
  width: 50%;
  height: 100%;
  position: relative;
  flex: 1;
}

.terminal {
  height: 200px;
  flex: none;
  position: relative;
}

.preview {
  height: 100%;
  width: 50%;
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
}

.toast {
  position: fixed;
  width: 250px;
  left: 0;
  top: 100px;
  padding: 10px;
  z-index: 100;
  right: 0;
  margin: auto;
  border-radius: 50px;
  text-align: center;
  word-break: break-all;
}

.toast-warning {
  background: #d46b08;
  color: #f9ebeb;
}
</style>
