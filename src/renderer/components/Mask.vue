<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="show" :class="{'mask-wrapper': true, transparent}" :style="style" v-auto-z-index="{ layer, onEsc }">
        <div class="mask" @click="() => maskCloseable && $emit('close')" @contextmenu.prevent.stop="$emit('close')" />
        <div class="content" @click.self="() => maskCloseable && $emit('close')">
          <slot></slot>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

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
    layer: {
      type: String as () => 'popup' | 'context-menu' | 'max' | 'modal',
      default: 'modal'
    },
  },
  emits: ['close'],
  setup (props, { emit }) {
    function onEsc () {
      if (props.show) {
        props.escCloseable && emit('close')
      }
    }

    return { onEsc }
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

.content {
  position: relative;
  z-index: 1;
}
</style>
