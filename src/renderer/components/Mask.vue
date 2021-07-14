<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="show" class="mask" :style="maskStyle" @click="() => maskCloseable && $emit('close')">
        <div class="close-btn"></div>
        <slot></slot>
      </div>
    </transition>
  </teleport>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'

let zIndex = 199998

export default defineComponent({
  name: 'x-mask',
  props: {
    show: Boolean,
    maskCloseable: {
      type: Boolean,
      default: true,
    },
    escCloseable: {
      type: Boolean,
      default: true,
    },
    style: {
      type: [Object, String],
      default: () => ({}),
    }
  },
  setup (props, { emit }) {
    const zIndexRef = ref(zIndex++)

    function keydownHandler (e: KeyboardEvent) {
      if (e.key === 'Escape' && props.show) {
        props.escCloseable && emit('close')
      } else if (e.key === 'Enter' && props.show) {
        emit('key-enter')
      }
    }

    watch(() => props.show, (val) => {
      if (val) {
        zIndex++
        zIndexRef.value = zIndex
      }
    })

    const maskStyle = computed(() => (typeof props.style === 'string' ? props.style : { zIndex: zIndexRef.value, ...props.style }))

    onMounted(() => {
      window.addEventListener('keypress', keydownHandler, true)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keypress', keydownHandler)
    })

    return { maskStyle }
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
  background: rgba(0, 0, 0, 0.3);
  z-index: 199998;
  padding-top: 6em;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .2s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
