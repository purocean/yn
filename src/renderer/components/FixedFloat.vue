<template>
  <teleport to="body">
    <div
      class="fixed-float"
      v-fixed-float="{
        onClose: (type: 'byClickSelf' | 'blur' | 'esc') => emits('close', type),
        onBlur: (byClickSelf: any) => emits('blur', byClickSelf),
        onEsc: () => emits('esc'),
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
      <div v-if="closeBtn" class="close-btn" @click="close" :title="$t('close') + ' ' + getKeyLabel(Escape)">
        <svg-icon name="times" width="14px" height="14px" />
      </div>
      <slot />
    </div>
  </teleport>
</template>

<script lang="ts" setup>
import SvgIcon from '@fe/components/SvgIcon.vue'
import { getKeyLabel, Escape } from '@fe/core/keybinding'
import { useI18n } from '@fe/services/i18n'

useI18n()

interface Props {
  top?: string
  right?: string
  bottom?: string
  left?: string
  disableAutoFocus?: boolean
  closeBtn?: boolean
}

const props = defineProps<Props>()

// eslint-disable-next-line func-call-spacing
const emits = defineEmits<{
  (e: 'close', type: 'byClickSelf' | 'blur' | 'esc' | 'btn'): void
  (e: 'blur', byClickSelf: boolean): void
  (e: 'esc'): void
}>()

function close () {
  emits('close', 'btn')
}
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
  min-width: 50px;
  cursor: default;
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
  overflow: hidden;
  backdrop-filter: var(--g-backdrop-filter);

  .close-btn {
    position: absolute;
    right: 3px;
    top: 3px;
    width: 20px;
    height: 20px;
    padding: 3px;
    box-sizing: border-box;
    color: var(--g-color-30);
    z-index: 10;

    &:hover {
      color: var(--g-color-0);
      background-color: var(--g-color-80);
      border-radius: 50%;
    }

    .svg-icon {
      display: block;
    }
  }
}
</style>
