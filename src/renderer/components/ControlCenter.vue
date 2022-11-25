<template>
  <div
    v-if="visible && schema"
    class="control-center"
    tabindex="0"
    @blur="onBlur"
    ref="container"
  >
    <div v-for="(row, category) in schema" :key="category" class="row">
      <template v-for="(item, i) in row?.items" :key="i">
        <div
          v-if="item.type === 'btn'"
          :class="{ btn: true, flat: item.flat, disabled: item.disabled, checked: item.checked }"
          :title="item.title"
          @click.stop="item.onClick"
        >
          <svg-icon :name="item.icon" />
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { registerAction, removeAction } from '@fe/core/action'
import { ControlCenter } from '@fe/services/workbench'
import { onBeforeUnmount, ref, watch } from 'vue'
import type { Components } from '@fe/types'
import SvgIcon from './SvgIcon.vue'
import { Alt, Escape } from '@fe/core/command'

const container = ref<HTMLElement>()
const visible = ref(false)
const schema = ref<Components.ControlCenter.Schema | null>(null)

function toggle (val?: boolean) {
  visible.value = typeof val === 'boolean' ? val : !visible.value
}

function onBlur () {
  setTimeout(() => {
    toggle(false)
  }, 0)
}

registerAction({
  name: 'control-center.refresh',
  handler () {
    schema.value = ControlCenter.getSchema()
  }
})

registerAction({
  name: 'control-center.toggle',
  handler: toggle,
  keys: [Alt, 'c']
})

registerAction({
  name: 'control-center.hide',
  handler: ControlCenter.toggle.bind(null, false),
  keys: [Escape],
  when: () => visible.value
})

onBeforeUnmount(() => {
  removeAction('control-center.refresh')
})

watch(() => visible, (val) => {
  if (val) {
    setTimeout(() => {
      container.value?.focus()
    }, 0)
  }
})

</script>

<style lang="scss">
.control-center {
  position: fixed;
  right: 25px;
  bottom: 40px;
  z-index: 1000;
  outline: none;
  background: rgba(var(--g-color-85-rgb), 0.8);
  backdrop-filter: var(--g-backdrop-filter);
  color: var(--g-color-10);
  overflow: hidden;
  border-radius: var(--g-border-radius);
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;

  .row {
    display: flex;
    max-width: 180px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--g-color-70);

    &:last-of-type {
      border-bottom: none;
      justify-content: space-between;
    }

    .btn {
      width: 36px;
      height: 36px;
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      font-size: 14px;

      border-radius: var(--g-border-radius);
      margin: 4px;
      transition: .1s ease-in-out;

      &.flat {
        width: 44px;
        height: 44px;
        margin: 0;
      }

      &.checked {
        background: var(--g-color-active-b);
      }

      .svg-icon {
        width: 16px;
        height: 16px;
      }

      &:not(.disabled):not(.checked):hover {
        background: var(--g-color-active-a);
      }

      &.disabled {
        color: var(--g-color-50);
        cursor: default;
      }
    }
  }
}
</style>
