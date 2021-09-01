<template>
  <div v-if="toast" :class="{toast: true, 'no-print': true, [`toast-${toast.type}`]: true}">{{toast.content}}</div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { Components } from '@fe/support/types'

interface ToastData {
  type: Components.Toast.ToastType;
  content: string;
}

export default defineComponent({
  name: 'toast',
  setup () {
    const toast = ref<ToastData | null>()

    function show (type: Components.Toast.ToastType, content: string, timeout = 2000) {
      toast.value = { type, content }

      setTimeout(() => {
        toast.value = null
      }, timeout)
    }

    return { toast, show }
  },
  methods: {
  },
})
</script>

<style scoped>
.toast {
  position: fixed;
  width: 250px;
  left: 0;
  top: 100px;
  padding: 10px;
  z-index: 999999;
  right: 0;
  margin: auto;
  border-radius: 50px;
  text-align: center;
  word-break: break-all;
  box-shadow: rgba(0, 0, 0 , 0.3) 2px 2px 10px;
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
