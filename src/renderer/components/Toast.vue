<template>
  <div v-if="toast" :class="{toast: true, 'skip-print': true, [`toast-${toast.type}`]: true}">
    <template v-if="typeof toast.content === 'string'">
      {{toast.content}}
    </template>
    <component v-else :is="toast.content" />
  </div>
</template>

<script lang="ts">
import { Component, defineComponent, nextTick, shallowRef } from 'vue'
import type { Components } from '@fe/types'

interface ToastData {
  type: Components.Toast.ToastType;
  content: string | Component;
}

export default defineComponent({
  name: 'toast',
  setup () {
    const toast = shallowRef<ToastData | null>()
    let timer: any = null

    function clearTimer () {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }

    function hide () {
      clearTimer()
      toast.value = null
    }

    async function show (type: Components.Toast.ToastType, content: string | Component, timeout = 2000) {
      hide()

      await nextTick()

      toast.value = { type, content }

      if (timeout) {
        timer = setTimeout(hide, timeout)
      }
    }

    return { toast, show, hide }
  },
  methods: {
  },
})
</script>

<style scoped>
.toast {
  position: fixed;
  width: fit-content;
  max-width: 300px;
  left: 0;
  top: 100px;
  padding: 10px 20px;
  z-index: 999999;
  right: 0;
  margin: auto;
  border-radius: 50px;
  text-align: center;
  overflow-wrap: break-word;
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
}

.toast-warning {
  background: #d46b08;
  color: #f9ebeb;
}

.toast-info {
  background: #07bd52;
  color: #f9ebeb;
}
</style>
