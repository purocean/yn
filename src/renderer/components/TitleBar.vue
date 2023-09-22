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
      <div :title="$t('title-bar.pin')" :class="{btn: true, pin: true, ontop: isAlwaysOnTop}" @click="toggleAlwaysOnTop">
        <svg-icon color="hsla(0, 0%, 100%, .5)" name="thumbtack-solid"></svg-icon>
      </div>
      <div :title="$t('title-bar.minimize')" class="btn" @click="minimize">
        <div class="icon minimize"></div>
      </div>
      <div :title="$t('title-bar.unmaximize')" v-if="isMaximized" class="btn" @click="unmaximize">
        <div class="icon unmaximize"></div>
      </div>
      <div :title="$t('title-bar.maximize')" v-else class="btn" @click="maximize">
        <div class="icon maximize"></div>
      </div>
      <div :title="$t('close')" class="btn btn-close" @click="close">
        <div class="icon close"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import { HELP_REPO_NAME } from '@fe/support/args'
import { getElectronRemote, isElectron, isMacOS, nodeRequire } from '@fe/support/env'
import { isEncrypted, isOutOfRepo } from '@fe/services/document'
import { useI18n } from '@fe/services/i18n'
import SvgIcon from './SvgIcon.vue'
import type { Doc } from '@fe/types'

export default defineComponent({
  name: 'title-bar',
  components: { SvgIcon },
  setup () {
    const store = useStore()
    const { t } = useI18n()

    const { currentFile } = toRefs(store.state)
    const isSaved = computed(() => store.getters.isSaved)

    let win: any = null

    const hasWin = ref(false)
    const isMaximized = ref(false)
    const isAlwaysOnTop = ref(false)
    const isFocused = ref(false)

    function handleFullscreenEnter () {
      store.commit('setIsFullscreen', true)
    }

    function handleFullscreenLeave () {
      store.commit('setIsFullscreen', false)
    }

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
      // unpin window after maximize.
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

      setTimeout(() => {
        updateWindowStatus()
      }, 500)
    }

    function close () {
      win && win.close()
    }

    onMounted(() => {
      if (!isElectron) {
        window.onbeforeunload = () => {
          return !isSaved.value || null
        }
      }

      if (isElectron && nodeRequire) {
        win = getElectronRemote().getCurrentWindow()
        hasWin.value = true
        updateWindowStatus()
        win.on('maximize', updateWindowStatus)
        win.on('restore', updateWindowStatus)
        win.on('unmaximize', updateWindowStatus)
        win.on('always-on-top-changed', updateWindowStatus)
        win.on('focus', updateWindowStatus)
        win.on('blur', updateWindowStatus)

        // win.isFullScreen() not work
        win.on('enter-full-screen', handleFullscreenEnter)
        win.on('leave-full-screen', handleFullscreenLeave)
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
        win.removeListener('enter-full-screen', handleFullscreenEnter)
        win.removeListener('leave-full-screen', handleFullscreenLeave)
      }

      win = null
      hasWin.value = false
    })

    const statusText = computed(() => {
      let status = ''

      const file: Doc = currentFile.value

      if (file) {
        if (file.repo === HELP_REPO_NAME) {
          return file.title
        }

        if (!isSaved.value) {
          status = t('file-status.unsaved')
        } else if (file.status === 'saved') {
          status = t('file-status.saved')
        } else if (file.status === 'save-failed') {
          status = t('file-status.save-failed')
        } else if (file.status === 'loaded') {
          status = t('file-status.loaded')
        } else {
          status = t('file-status.loading')
        }

        const repoStr = isOutOfRepo(file)
          ? ''
          : `[${file.repo}]`

        if (file.path && file.repo) {
          return `${repoStr} ${isSaved.value ? '' : '*'}${file.path}-${status}`
        } else {
          return file.name
        }
      } else {
        return t('file-status.no-file')
      }
    })

    const titleBarStyles = computed(() => {
      if (isElectron && !isFocused.value) {
        return { background: '#6e6e6e' }
      }

      if (
        (currentFile.value && !isSaved.value && isEncrypted(currentFile.value)) ||
        currentFile.value?.status === 'save-failed'
      ) {
        return { background: '#ff9800ad' }
      }

      return undefined
    })

    watch(statusText, () => {
      document.title = currentFile.value ? (currentFile.value.name || currentFile.value.title || 'Yank Note') : t('file-status.no-file')
    }, { immediate: true })

    watch(isSaved, (val: boolean) => {
      // expose save state for electron usage.
      window.documentSaved = val
      if (win && isMacOS) {
        win.setDocumentEdited(!val)
      }
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
  transition: all .1s ease-in-out;
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
