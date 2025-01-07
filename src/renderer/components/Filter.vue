<template>
  <XMask :show="show" @close="close">
    <QuickOpen @choose-file="chooseFile" @close="close" :only-current-repo="onlyCurrentRepo"></QuickOpen>
  </XMask>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue'
import type { Doc } from '@fe/types'
import { registerAction, removeAction } from '@fe/core/action'
import { CtrlCmd } from '@fe/core/keybinding'
import { switchDoc } from '@fe/services/document'
import { t } from '@fe/services/i18n'
import XMask from './Mask.vue'
import QuickOpen from './QuickOpen.vue'

export default defineComponent({
  name: 'x-filter',
  components: { QuickOpen, XMask },
  setup () {
    const callback = ref<Function | null>(null)
    const onlyCurrentRepo = ref(false)

    function showQuickOpen () {
      onlyCurrentRepo.value = false
      callback.value = (f: any) => {
        switchDoc(f)
        callback.value = null
      }
    }

    function chooseFile (file: any) {
      if (callback.value) {
        callback.value(file)
      }
    }

    function chooseDocument () {
      return new Promise<Doc>(resolve => {
        callback.value = (f: Doc) => {
          resolve(f)
          callback.value = null
        }
        onlyCurrentRepo.value = true
      })
    }

    function close () {
      if (callback.value) {
        callback.value(null)
      }

      callback.value = null
    }

    onMounted(() => {
      registerAction({
        name: 'workbench.show-quick-open',
        description: t('command-desc.workbench_show-quick-open'),
        handler: showQuickOpen,
        forUser: true,
        keys: [CtrlCmd, 'p']
      })
      registerAction({ name: 'filter.choose-document', handler: chooseDocument })
    })

    onUnmounted(() => {
      removeAction('workbench.show-quick-open')
      removeAction('filter.choose-document')
    })

    const show = computed(() => !!callback.value)

    return {
      show,
      close,
      callback,
      chooseFile,
      onlyCurrentRepo,
    }
  },
})
</script>
