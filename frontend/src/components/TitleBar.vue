<template>
  <div class="title-bar" :style="saved ? '' : 'background: orange'">
    <h4 class="title">
      <img v-if="win" @dblclick="close" class="logo" src="~@/assets/icon.png" alt="logo">
      <span>{{statusText}}</span>
    </h4>
    <div class="action" v-if="win">
      <div title="置顶窗口" :class="{btn: true, pin: true, ontop: isAlwaysOnTop}" @click="toggleAlwaysOnTop">
        <y-icon class="pin-icon" name="thumbtack"></y-icon>
      </div>
      <div class="btn" @click="minimize">
        <div class="icon minimize"></div>
      </div>
      <div v-if="isMaximized" class="btn" @click="unmaximize">
        <div class="icon unmaximize"></div>
      </div>
      <div v-else class="btn" @click="maximize">
        <div class="icon maximize"></div>
      </div>
      <div class="btn" @click="close">
        <div class="icon close"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import env from '@/lib/env'
import 'vue-awesome/icons/thumbtack'

const isElectron = env.isElectron

export default {
  name: 'title-bar',
  data () {
    return {
      win: null,
      isMaximized: false,
      isAlwaysOnTop: false,
    }
  },
  mounted () {
    if (!isElectron) {
      window.onbeforeunload = () => {
        return !this.saved || null
      }
    }

    if (isElectron && env.require) {
      this.win = env.require('electron').remote.getCurrentWindow()
      this.isMaximized = this.win.isMaximized()
      this.win.on('maximize', this.changeWindowStatus)
      this.win.on('restore', this.changeWindowStatus)
      this.win.on('unmaximize', this.changeWindowStatus)
      this.win.on('always-on-top-changed', this.changeWindowStatus)
    }
  },
  beforeDestroy () {
    if (!isElectron) {
      window.onbeforeunload = null
    }

    if (this.win) {
      this.win.removeListener('maximize', this.changeWindowStatus)
      this.win.removeListener('restore', this.changeWindowStatus)
      this.win.removeListener('unmaximize', this.changeWindowStatus)
      this.win.removeListener('minimize', this.changeWindowStatus)
      this.win.removeListener('always-on-top-changed', this.changeWindowStatus)
    }
  },
  computed: {
    ...mapState('app', ['currentFile', 'savedAt', 'previousContent', 'currentContent']),
    saved () {
      return this.previousContent === this.currentContent
    },
    status () {
      if (this.savedAt === null && this.currentFile) {
        return '加载完毕'
      } else if (this.savedAt) {
        return '保存于：' + this.savedAt.toLocaleString()
      }

      return ''
    },
    statusText () {
      const file = this.currentFile
      if (file) {
        if (file.repo === '__help__') {
          return file.title
        }

        if (file.path && file.repo) {
          return `${file.path}-${this.status} [${file.repo}]`
        } else {
          return file.name
        }
      } else {
        return '未打开文件'
      }
    }
  },
  watch: {
    statusText: {
      immediate: true,
      handler (val) {
        document.title = val + ' - Yank Note 一款面向程序员的 Markdown 编辑器'
      },
    },
    saved: {
      immediate: true,
      handler (val) {
        window.documentSaved = val
      },
    },
  },
  methods: {
    changeWindowStatus () {
      if (this.win) {
        this.isMaximized = this.win.isMaximized()
        this.isAlwaysOnTop = this.win.isAlwaysOnTop()
      }
    },
    toggleAlwaysOnTop () {
      this.win && this.win.setAlwaysOnTop(!this.win.isAlwaysOnTop())
    },
    unmaximize () {
      this.win && this.win.unmaximize()
    },
    minimize () {
      this.win && this.win.minimize()
    },
    maximize () {
      // 最大化后取消窗口置顶
      this.win && this.win.maximize()
      this.win && this.win.setAlwaysOnTop(false)
    },
    close () {
      this.win && this.win.close()
    },
  },
}
</script>

<style scoped>

.title-bar {
  background: #4e4e4e;
  color: #eee;
  height: 100%;
  transition: all .3s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-user-select: none;
  -webkit-app-region: drag;
}

.title {
  margin: 0;
  text-align: center;
  height: 100%;
  display: flex;
  align-items: center;
}

.logo {
  height: 60%;
  margin: 0 5px;
  -webkit-app-region: no-drag;
}

.action {
  display: flex;
  flex-grow: 0;
  flex-shrink: 0;
  text-align: center;
  position: relative;
  z-index: 3000;
  -webkit-app-region: no-drag;
  height: 100%;
  width: 138px;
  margin-left: auto;
}

.action .btn {
  display: inline-block;
  -webkit-app-region: no-drag;
  height: 100%;
  width: 33.34%;
}

.action .icon {
  background-color: #cccccc;
  height: 100%;
  width: 100%;
  mask-size: 23.1%;
}

.action .icon.unmaximize {
  mask: url(~@/assets/window-unmaximize.svg) no-repeat 50% 50%;
}

.action .icon.maximize {
  mask: url(~@/assets/window-maximize.svg) no-repeat 50% 50%;
}

.action .icon.minimize {
  mask: url(~@/assets/window-minimize.svg) no-repeat 50% 50%;
}

.action .icon.close {
  mask: url(~@/assets/window-close.svg) no-repeat 50% 50%;
}

.action .btn:hover {
  background-color:  hsla(0, 0%, 100%, .1)
}

.action .btn.pin {
  display: flex;
  align-items: center;
  justify-content: center;
}

.action .btn.pin.ontop {
  background-color: hsla(0, 0%, 100%, .3)
}

.action .btn.pin .pin-icon {
  fill: hsla(0, 0%, 100%, .5)
}
</style>
