<template>
  <div
    :class="{'title-bar': true, 'in-electron': hasWin, 'is-macos': isMacOS}"
    :style="titleBarStyles"
    @dblclick.capture="toggleMaximize">
    <div v-if="hasWin && !isMaximized" class="resizer"></div>
    <h4 class="title">
      <img v-if="hasWin" @dblclick="close" class="logo" src="~@fe/assets/icon.png" alt="logo">
      <span>{{statusText}}</span>
    </h4>
    <div class="action" v-if="hasWin">
      <div title="置顶窗口" :class="{btn: true, pin: true, ontop: isAlwaysOnTop}" @click="toggleAlwaysOnTop">
        <svg-icon color="hsla(0, 0%, 100%, .5)" name="thumbtack-solid"></svg-icon>
      </div>
      <div title="最小化" class="btn" @click="minimize">
        <div class="icon minimize"></div>
      </div>
      <div title="还原" v-if="isMaximized" class="btn" @click="unmaximize">
        <div class="icon unmaximize"></div>
      </div>
      <div title="最大化" v-else class="btn" @click="maximize">
        <div class="icon maximize"></div>
      </div>
      <div title="关闭" class="btn btn-close" @click="close">
        <div class="icon close"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import env from '@fe/useful/env'
import File from '@fe/useful/file'
import SvgIcon from './SvgIcon.vue'

const { isElectron, isMacOS } = env

export default defineComponent({
  name: 'title-bar',
  components: { SvgIcon },
  setup () {
    const store = useStore()

    const { currentFile, savedAt, currentContent, previousContent } = toRefs(store.state)
    const saved = computed(() => currentContent.value === previousContent.value)

    let win: any = null

    const hasWin = ref(false)
    const isMaximized = ref(false)
    const isAlwaysOnTop = ref(false)
    const isFocused = ref(false)

    function updateWindowStatus () {
      if (win) {
        isMaximized.value = win.isMaximized()
        isAlwaysOnTop.value = win.isAlwaysOnTop()
        isFocused.value = win.isFocused()
      }
    }

    function toggleAlwaysOnTop () {
      win && win.setAlwaysOnTop(!win.isAlwaysOnTop())
    }

    function unmaximize () {
      win && win.unmaximize()
    }

    function minimize () {
      win && win.minimize()
    }

    function maximize () {
      // 最大化后取消窗口置顶
      win && win.maximize()
      win && win.setAlwaysOnTop(false)
    }

    function toggleMaximize () {
      if (hasWin.value && isMacOS) {
        if (isMaximized.value) {
          unmaximize()
        } else {
          maximize()
        }
      }
    }

    function close () {
      win && win.close()
    }

    onMounted(() => {
      if (!isElectron) {
        window.onbeforeunload = () => {
          return !saved.value || null
        }
      }

      if (isElectron && env.require) {
        win = env.require('electron').remote.getCurrentWindow()
        hasWin.value = true
        updateWindowStatus()
        win.on('maximize', updateWindowStatus)
        win.on('restore', updateWindowStatus)
        win.on('unmaximize', updateWindowStatus)
        win.on('always-on-top-changed', updateWindowStatus)
        win.on('focus', updateWindowStatus)
        win.on('blur', updateWindowStatus)
      }
    })

    onBeforeUnmount(() => {
      if (!isElectron) {
        window.onbeforeunload = null
      }

      if (win) {
        win.removeListener('maximize', updateWindowStatus)
        win.removeListener('restore', updateWindowStatus)
        win.removeListener('unmaximize', updateWindowStatus)
        win.removeListener('minimize', updateWindowStatus)
        win.removeListener('always-on-top-changed', updateWindowStatus)
        win.removeListener('focus', updateWindowStatus)
        win.removeListener('blur', updateWindowStatus)
      }

      win = null
      hasWin.value = false
    })

    const statusText = computed(() => {
      let status = ''

      if (savedAt.value === null && currentFile.value) {
        status = '加载完毕'
      } else if (savedAt.value) {
        status = saved.value ? '已保存' : '未保存'
      }

      const file = currentFile.value
      if (file) {
        if (file.repo === '__help__') {
          return file.title
        }

        if (file.path && file.repo) {
          return `${file.path}-${status} [${file.repo}]`
        } else {
          return file.name
        }
      } else {
        return '未打开文件'
      }
    })

    const titleBarStyles = computed(() => {
      if (isElectron && !isFocused.value) {
        return { background: '#818181' }
      }

      if (!saved.value && File.isEncryptedFile(currentFile.value)) {
        return { background: '#ff9800ad' }
      }

      return undefined
    })

    watch(statusText, () => {
      document.title = currentFile.value ? (currentFile.value.name || currentFile.value.title || 'Yank Note') : '未打开文件'
    }, { immediate: true })

    watch(saved, val => {
      // 暴露文档保存状态给 Electron 用
      (window as any).documentSaved = val
    }, { immediate: true })

    return {
      hasWin,
      isMacOS,
      isMaximized,
      isAlwaysOnTop,
      isFocused,
      toggleAlwaysOnTop,
      maximize,
      unmaximize,
      minimize,
      close,
      statusText,
      titleBarStyles,
      toggleMaximize
    }
  },
})
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
  position: relative;
  z-index: 199999;
}

.resizer {
  position: absolute;
  top: 0;
  width: 100%;
  height: 20%;
  -webkit-app-region: no-drag;
}

.title {
  margin: 0;
  text-align: center;
  height: 100%;
  display: flex;
  align-items: center;
  font-size: .8em;
}

.logo {
  height: 60%;
  margin: 0 5px;
  -webkit-app-region: no-drag;
}

.action {
  display: flex;
  justify-content: flex-end;
  flex-grow: 0;
  flex-shrink: 0;
  text-align: center;
  position: relative;
  z-index: 3000;
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
  mask: url(@fe/assets/window-unmaximize.svg) no-repeat 50% 50%;
}

.action .icon.maximize {
  mask: url(@fe/assets/window-maximize.svg) no-repeat 50% 50%;
}

.action .icon.minimize {
  mask: url(@fe/assets/window-minimize.svg) no-repeat 50% 50%;
}

.action .icon.close {
  mask: url(@fe/assets/window-close.svg) no-repeat 50% 50%;
}

.action .btn.btn-close:hover {
  background-color: rgba(232, 17, 35, .9)
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

.title-bar.in-electron.is-macos .title {
  justify-content: center;
  padding-left: 138px;
  width: 100%;
}

.title-bar.in-electron.is-macos .title .logo,
.title-bar.in-electron.is-macos .action .btn:not(.pin) {
  display: none;
}
</style>
