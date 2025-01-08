<template>
  <XMask :show="show" @close="close">
    <QuickOpen
      @choose-file="chooseFile"
      @close="close"
      :filter-item="filterItem"
      :only-current-repo="onlyCurrentRepo" />
  </XMask>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { registerAction, removeAction } from '@fe/core/action'
import { CtrlCmd } from '@fe/core/keybinding'
import { switchDoc } from '@fe/services/document'
import { t } from '@fe/services/i18n'
import type { Doc, BaseDoc } from '@fe/types'
import XMask from './Mask.vue'
import QuickOpen from './QuickOpen.vue'
import { isMarkdownFile } from '@share/misc'

export default defineComponent({
  name: 'x-filter',
  components: { QuickOpen, XMask },
  setup () {
    const callback = ref<Function | null>(null)
    const onlyCurrentRepo = ref(false)
    const filterItem = shallowRef<(item: BaseDoc) => boolean>()

    function showQuickOpen () {
      onlyCurrentRepo.value = false
      callback.value = (f: any) => {
        switchDoc(f)
        callback.value = null
        filterItem.value = undefined
      }
    }

    function chooseFile (file: any) {
      if (callback.value) {
        callback.value(file)
      }
    }

    function chooseDocument (filter = (item: BaseDoc) => isMarkdownFile(item.path)) {
      return new Promise<Doc>(resolve => {
        callback.value = (f: Doc) => {
          resolve(f)
          callback.value = null
          filterItem.value = undefined
        }

        onlyCurrentRepo.value = true
        filterItem.value = filter
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
      filterItem,
    }
  },
})
</script>
