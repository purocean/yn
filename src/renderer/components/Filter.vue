<template>
  <XMask :show="show" @close="callback = null">
    <QuickOpen @choose-file="chooseFile" @close="callback = null" :with-marked="withMarked"></QuickOpen>
  </XMask>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue'
import { getCurrentAction } from '@fe/context/shortcut'
import { switchDoc } from '@fe/context/document'
import XMask from './Mask.vue'
import QuickOpen from './QuickOpen.vue'
import { registerAction, removeAction } from '@fe/context/action'

export default defineComponent({
  name: 'x-filter',
  components: { QuickOpen, XMask },
  setup () {
    const callback = ref<Function | null>(null)
    const withMarked = ref(true)

    function keydownHandler (e: KeyboardEvent) {
      switch (getCurrentAction(e)) {
        case 'show-quick-open':
          callback.value = (f: any) => {
            switchDoc(f)
            callback.value = null
          }
          withMarked.value = true
          e.preventDefault()
          e.stopPropagation()
          break
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
      registerAction('filter.choose-document', chooseDocument)
      window.addEventListener('keydown', keydownHandler, true)
    })

    onUnmounted(() => {
      removeAction('filter.choose-document')
      window.removeEventListener('keydown', keydownHandler)
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
