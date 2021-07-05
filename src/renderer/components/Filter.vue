<template>
  <XMask :show="show" @close="callback = null">
    <QuickOpen @choose-file="chooseFile" @close="callback = null" :with-marked="withMarked"></QuickOpen>
  </XMask>
</template>

<script lang="ts">
import { useStore } from 'vuex'
import { computed, defineComponent, onMounted, onUnmounted, ref, toRef } from 'vue'
import { encodeMarkdownLink } from '@fe/utils'
import { getCurrentAction } from '@fe/context/shortcut'
import { dirname, isBelongTo, join, relative } from '@fe/utils/path'
import { insertValue } from '@fe/context/editor'
import { switchDoc } from '@fe/context/document'
import XMask from './Mask.vue'
import QuickOpen from './QuickOpen.vue'

export default defineComponent({
  name: 'x-filter',
  components: { QuickOpen, XMask },
  setup () {
    const store = useStore()

    const currentFile = toRef(store.state, 'currentFile')
    const callback = ref<Function | null>(null)
    const withMarked = ref(true)

    function keydownHandler (e: KeyboardEvent) {
      switch (getCurrentAction(e)) {
        case 'insert-document':
          callback.value = (f: any) => {
            const file = currentFile.value
            if (file) {
              const cwd = dirname(file.path)
              const filePath = isBelongTo(cwd, f.path)
                ? relative(cwd, f.path)
                : join('/', f.path)
              const fileName = f.name.replace(/\.[^.]*$/, '')
              insertValue(`[${fileName}](${encodeMarkdownLink(filePath)})`)
            }
            callback.value = null
          }
          withMarked.value = false
          e.preventDefault()
          e.stopPropagation()
          break
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

    onMounted(() => {
      window.addEventListener('keydown', keydownHandler, true)
    })

    onUnmounted(() => {
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
