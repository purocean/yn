<template>
  <transition name="fade">
    <div v-if="show" class="mask" @click="() => maskCloseable && $emit('close')">
      <slot></slot>
    </div>
  </transition>
</template>

<script>
export default {
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
  mounted () {
    window.addEventListener('keydown', this.keydownHandler, true)
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.keydownHandler)
  },
  methods: {
    keydownHandler (e) {
      if (e.key === 'Escape' && this.show) {
        this.escClooseable && this.$emit('close')
      } else if (e.key === 'Enter' && this.show) {
        this.$emit('enter')
      }
    },
  },
}
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
  padding-top: 4em;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
