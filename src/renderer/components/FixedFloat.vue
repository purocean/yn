<template>
  <teleport to="body">
    <div
      class="fixed-float"
      v-fixed-float="{
        onClose: (byClickSelf: any) => emits('close', byClickSelf),
        onBlur: (byClickSelf: any) => emits('blur', byClickSelf),
        disableAutoFocus: props.disableAutoFocus
      }"
      v-auto-z-index="{ layer: 'popup' }"
      @click.stop
      v-bind="$attrs"
      :style="{
        top: props.top,
        right: props.right,
        bottom: props.bottom,
        left: props.left,
      }"
    >
      <slot />
    </div>
  </teleport>
</template>

<script lang="ts" setup>
interface Props {
  top?: string
  right?: string
  bottom?: string
  left?: string
  disableAutoFocus?: boolean
}

const props = defineProps<Props>()

// eslint-disable-next-line func-call-spacing
const emits = defineEmits<{
  (e: 'close', byClickSelf: boolean): void
  (e: 'blur', byClickSelf: boolean): void
}>()
</script>

<style lang="scss" scoped>
.fixed-float {
  position: fixed;
  padding: 1px;
  margin: 0;
  background: var(--g-color-backdrop);
  border: 1px var(--g-color-84) solid;
  border-left: 0;
  border-top: 0;
  color: var(--g-foreground-color);
  min-width: 9em;
  max-width: 20em;
  cursor: default;
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
  overflow: hidden;
  backdrop-filter: var(--g-backdrop-filter);
}
</style>
