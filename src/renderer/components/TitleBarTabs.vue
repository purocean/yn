<template>
  <div ref="anchor" class="title-bar-tabs-anchor">
    <Teleport :to="titleBarTabsContainer || 'body'" :disabled="teleportDisabled">
      <FileTabs />
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { registerHook, removeHook } from '@fe/core/hook'
import { setTitleBarTabsLeft, titleBarTabsContainer } from '@fe/support/title-bar'
import { isElectron } from '@fe/support/env'
import FileTabs from './FileTabs.vue'

const anchor = ref<HTMLElement | null>(null)
const teleportDisabled = computed(() => !isElectron || !titleBarTabsContainer.value)
let resizeObserver: ResizeObserver | null = null

function updateTabsLeft () {
  if (isElectron && anchor.value) {
    setTitleBarTabsLeft(anchor.value.getBoundingClientRect().left)
  }
}

function scheduleUpdate () {
  nextTick(updateTabsLeft)
}

onMounted(() => {
  if (!isElectron) {
    return
  }

  scheduleUpdate()
  registerHook('GLOBAL_RESIZE', scheduleUpdate)
  resizeObserver = new ResizeObserver(updateTabsLeft)
  resizeObserver.observe(anchor.value!)
})

onBeforeUnmount(() => {
  if (!isElectron) {
    return
  }

  removeHook('GLOBAL_RESIZE', scheduleUpdate)
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.title-bar-tabs-anchor {
  width: 100%;
  flex: none;
}
</style>
