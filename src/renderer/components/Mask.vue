<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="show" :class="{'mask-wrapper': true, transparent}" :style="wrapperStyle">
        <div class="mask" @click="() => maskCloseable && $emit('close')" @contextmenu.prevent.stop="$emit('close')" />
        <div class="content">
          <slot></slot>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { registerHook, removeHook } from '@fe/core/hook'

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
    transparent: {
      type: Boolean,
      default: false,
    },
    style: {
      type: [Object, String],
      default: () => ({}),
    },
  },
  emits: ['close', 'key-enter'],
  setup (props, { emit }) {
    const zIndexRef = ref(zIndex++)

    function keypressHandler (e: KeyboardEvent) {
      if (e.key === 'Enter' && props.show) {
        emit('key-enter')
      }
    }

    function keydownHandler (e: KeyboardEvent) {
      if (e.key === 'Escape' && props.show) {
        props.escCloseable && emit('close')
        e.stopPropagation()
      }
    }

    watch(() => props.show, (val) => {
      if (val) {
        zIndex++
        zIndexRef.value = zIndex
      }
    })

    const wrapperStyle = computed(() => (typeof props.style === 'string' ? props.style : { zIndex: zIndexRef.value, ...props.style }))

    onMounted(() => {
      window.addEventListener('keypress', keypressHandler, true)
      registerHook('GLOBAL_KEYDOWN', keydownHandler)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keypress', keypressHandler, true)
      removeHook('GLOBAL_KEYDOWN', keydownHandler)
    })

    return { wrapperStyle }
  },
})
</script>

<style scoped>
.mask-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 199998;
  padding-top: 6em;
}

.mask {
  background: rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(0.5px);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.mask-wrapper.transparent .mask {
  background: transparent;
  backdrop-filter: none;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .2s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
