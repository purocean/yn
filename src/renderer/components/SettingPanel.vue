<template>
  <XMask :show="showPanel" @close="close" :maskCloseable="false">
    <Setting @close="close" />
  </XMask>
</template>

<script lang="ts">
import { useStore } from 'vuex'
import { computed, defineComponent } from 'vue'
import XMask from './Mask.vue'
import Setting from './Setting.vue'

export default defineComponent({
  name: 'x-filter',
  components: { XMask, Setting },
  setup () {
    const store = useStore()
    const showPanel = computed(() => store.state.showSetting)

    const close = () => store.commit('setShowSetting', false)

    return { showPanel, close }
  },
})
</script>
