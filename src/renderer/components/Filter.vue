<template>
  <XMask :show="show" @close="close">
    <QuickOpen
      ref="quickOpen"
      @choose-item="chooseItem"
      @close="close"
      :filter-item="filterItem" />
  </XMask>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { registerAction, removeAction } from '@fe/core/action'
import { CtrlCmd } from '@fe/core/keybinding'
import { switchDoc } from '@fe/services/document'
import { t } from '@fe/services/i18n'
import type { BaseDoc, Components, Doc } from '@fe/types'
import { isMarkdownFile } from '@share/misc'
import store from '@fe/support/store'
import XMask from './Mask.vue'
import QuickOpen from './QuickOpen.vue'

export default defineComponent({
  name: 'x-filter',
  components: { QuickOpen, XMask },
  setup () {
    const callback = ref<((item: Components.QuickOpen.DataItem | null) => void) | null>(null)
    const filterItem = shallowRef<(item: Components.QuickOpen.DataItem) => boolean>()
    const quickOpen = ref<InstanceType<typeof QuickOpen> | null>(null)

    function showQuickOpen (options?: { query?: string, tab?: Components.QuickOpen.TabKey }) {
      callback.value = (f: Components.QuickOpen.DataItem | null) => {
        if (f?.type === 'file') {
          switchDoc(f.payload as Doc)
        }

        callback.value = null
        filterItem.value = undefined
      }

      nextTick(() => {
        if (options?.tab) {
          quickOpen.value?.switchTab(options.tab)
        }

        if (typeof options?.query === 'string') {
          quickOpen.value?.updateSearchText(options.query)
        }
      })
    }

    function chooseItem (item: Components.QuickOpen.DataItem | null) {
      if (callback.value) {
        callback.value(item)
      }
    }

    function chooseDocument (filter = (item: BaseDoc) => isMarkdownFile(item.path)) {
      return new Promise<BaseDoc | null>(resolve => {
        callback.value = (item: Components.QuickOpen.DataItem | null) => {
          resolve((item && item.type === 'file') ? item.payload : null)
          callback.value = null
          filterItem.value = undefined
        }

        filterItem.value = (item: Components.QuickOpen.DataItem) => {
          return item.type === 'file' &&
            item.payload.repo === store.state.currentRepo?.name && // only current repo
            filter(item.payload as BaseDoc)
        }
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
      chooseItem,
      filterItem,
      quickOpen,
    }
  },
})
</script>
