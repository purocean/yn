<template>
  <XMask :show="showPanel" @close="close" :maskCloseable="false">
    <Setting @close="close" />
  </XMask>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import store from '@fe/support/store'
import XMask from './Mask.vue'
import Setting from './Setting.vue'

export default defineComponent({
  name: 'setting-panel',
  components: { XMask, Setting },
  setup () {
    const showPanel = computed(() => store.state.showSetting)

    const close = () => {
      store.state.showSetting = false
    }

    return { showPanel, close }
  },
})
</script>
