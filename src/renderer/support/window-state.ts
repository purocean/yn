import { computed, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue'
import { getElectronRemote, isElectron, isMacOS, nodeRequire } from '@fe/support/env'
import store from '@fe/support/store'
import { useI18n } from '@fe/services/i18n'

let win: ReturnType<ReturnType<typeof getElectronRemote>['getCurrentWindow']> | null = null

export const isWindowAlwaysOnTop = ref(false)

function updateAlwaysOnTop () {
  isWindowAlwaysOnTop.value = !!win?.isAlwaysOnTop()
}

export function toggleWindowAlwaysOnTop () {
  if (!win) {
    return
  }

  win.setAlwaysOnTop(!win.isAlwaysOnTop())
  updateAlwaysOnTop()
}

export function useWindowState () {
  const { t } = useI18n()
  const { currentFile } = toRefs(store.state)
  const isSaved = store.getters.isSaved

  function handleFullscreenEnter () {
    store.state.isFullscreen = true
  }

  function handleFullscreenLeave () {
    store.state.isFullscreen = false
  }

  function handleMaximize () {
    if (win?.isAlwaysOnTop()) {
      win.setAlwaysOnTop(false)
    }
    updateAlwaysOnTop()
  }

  function clean () {
    if (!isElectron) {
      window.onbeforeunload = null
    }

    window.removeEventListener('beforeunload', clean)

    if (win) {
      win.removeListener('maximize', handleMaximize)
      win.removeListener('always-on-top-changed', updateAlwaysOnTop)
      win.removeListener('enter-full-screen', handleFullscreenEnter)
      win.removeListener('leave-full-screen', handleFullscreenLeave)
    }

    win = null
    isWindowAlwaysOnTop.value = false
  }

  onMounted(() => {
    if (!isElectron) {
      window.onbeforeunload = () => !isSaved.value || null
      return
    }

    if (nodeRequire) {
      win = getElectronRemote().getCurrentWindow()
      updateAlwaysOnTop()
      win.on('maximize', handleMaximize)
      win.on('always-on-top-changed', updateAlwaysOnTop)
      win.on('enter-full-screen', handleFullscreenEnter)
      win.on('leave-full-screen', handleFullscreenLeave)
      window.addEventListener('beforeunload', clean)

      if (isMacOS) {
        win.setDocumentEdited(!isSaved.value)
      }
    }
  })

  onBeforeUnmount(clean)

  const documentTitle = computed(() => currentFile.value ? (currentFile.value.name || 'Yank Note') : t('file-status.no-file'))
  watch(documentTitle, title => {
    document.title = title
  }, { immediate: true })

  watch(isSaved, (val: boolean) => {
    window.documentSaved = val
    if (win && isMacOS) {
      win.setDocumentEdited(!val)
    }
  }, { immediate: true })
}
