<template>
  <transition name="fade">
    <div v-if="show" class="mask" @click="() => maskCloseable && $emit('close')">
      <slot></slot>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted } from 'vue'

export default defineComponent({
  name: 'x-mask',
  props: {
    show: Boolean,
    maskCloseable: {
      type: Boolean,
      default: true,
    },
    escClooseable: {
      type: Boolean,
      default: true,
    },
  },
  setup (props, { emit }) {
    function keydownHandler (e: KeyboardEvent) {
      if (e.key === 'Escape' && props.show) {
        props.escClooseable && emit('close')
      } else if (e.key === 'Enter' && props.show) {
        emit('key-enter')
      }
    }

    onMounted(() => {
      window.addEventListener('keydown', keydownHandler, true)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', keydownHandler)
    })
  },
})
</script>

<style scoped>
.mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.089);
  z-index: 99999;
  padding-top: 6em;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .2s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
