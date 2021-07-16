<template>
  <XMask :show="show" @close="callback = null">
    <QuickOpen @choose-file="chooseFile" @close="callback = null" :with-marked="withMarked"></QuickOpen>
  </XMask>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue'
import { switchDoc } from '@fe/context/document'
import XMask from './Mask.vue'
import { registerAction, removeAction } from '@fe/context/action'
import QuickOpen from './QuickOpen.vue'
import { CtrlCmd } from '@fe/context/shortcut'

export default defineComponent({
  name: 'x-filter',
  components: { QuickOpen, XMask },
  setup () {
    const callback = ref<Function | null>(null)
    const withMarked = ref(true)

    function showQuickOpen () {
      withMarked.value = true
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
      return new Promise(resolve => {
        callback.value = (f: any) => {
          resolve(f)
          callback.value = null
        }
        withMarked.value = false
      })
    }

    onMounted(() => {
      registerAction({ name: 'filter.show-quick-open', handler: showQuickOpen, keys: [CtrlCmd, 'p'] })
      registerAction({ name: 'filter.choose-document', handler: chooseDocument })
    })

    onUnmounted(() => {
      removeAction('filter.show-quick-open')
      removeAction('filter.choose-document')
    })

    const show = computed(() => !!callback.value)

    return {
      show,
      callback,
      chooseFile,
      withMarked,
    }
  },
})
</script>
