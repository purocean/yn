<template>
  <component v-if="previewer" :is="previewer.component" />
  <default-previewer :class="previewer ? 'preview-hidden' : undefined" />
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { getAllPreviewers } from '@fe/services/view'
import type { AppState } from '@fe/support/store'
import DefaultPreviewer from './DefaultPreviewer.vue'

const store = useStore<AppState>()

const previewer = computed(() => {
  const { previewer } = store.state
  return getAllPreviewers().find(item => item.name === previewer)
})
</script>

<style scoped>
.preview-hidden {
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
