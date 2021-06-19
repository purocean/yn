<template>
  <XMask :show="show" @close="callback = null">
    <QuickOpen @choose-file="callback ?? undefined" @close="callback = null" :with-marked="withMarked"></QuickOpen>
  </XMask>
</template>

<script lang="ts">
import { useStore } from 'vuex'
import { computed, defineComponent, onMounted, onUnmounted, ref, toRef } from 'vue'
import { encodeMarkdownLink } from '../useful/utils'
import { getCurrentAction } from '../useful/shortcut'
import { useBus } from '../useful/bus'
import XMask from './Mask.vue'
import QuickOpen from './QuickOpen.vue'

export default defineComponent({
  name: 'x-filter',
  components: { QuickOpen, XMask },
  setup () {
    const store = useStore()
    const bus = useBus()

    const currentFile = toRef(store.state, 'currentFile')
    const callback = ref<Function | null>(null)
    const withMarked = ref(true)

    function keydownHandler (e: KeyboardEvent) {
      switch (getCurrentAction(e)) {
        case 'insert-document':
          callback.value = (f: any) => {
            const file = currentFile.value
            if (file) {
              const relativePath = f.path.replace(file.path.substr(0, file.path.lastIndexOf('/')), '.')
              bus.emit('editor-insert-value', `[${f.name.replace(/\.[^.]+$/, '')}](${encodeMarkdownLink(relativePath)})`)
            }
            callback.value = null
          }
          withMarked.value = false
          e.preventDefault()
          e.stopPropagation()
          break
        case 'show-quick-open':
          callback.value = (f: any) => {
            store.commit('setCurrentFile', f)
            callback.value = null
          }
          withMarked.value = true
          e.preventDefault()
          e.stopPropagation()
          break
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
      withMarked,
    }
  },
})
</script>
