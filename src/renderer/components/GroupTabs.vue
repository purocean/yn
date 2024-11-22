<template>
  <div :class="{ tabs: true, small: size === 'small' }">
    <div
      v-for="tab of tabs"
      :key="tab.value"
      :data-key="tab.value"
      :class="{tab: true, selected: modelValue === tab.value}"
      @click="$emit('update:modelValue', tab.value)"
    >{{tab.label}}</div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { LabelValueItem } from '@share/types'

export default defineComponent({
  name: 'group-tabs',
  props: {
    modelValue: String,
    size: String as () => 'small',
    tabs: {
      type: Array as () => LabelValueItem<string>[],
      required: true,
    }
  },
})
</script>

<style lang="scss" scoped>
@import '@fe/styles/mixins.scss';

.tabs {
  display: flex;
  background: var(--g-color-active-a);
  border-radius: var(--g-border-radius);
  border: 1px solid var(--g-color-70);
  margin-bottom: 16px;
  user-select: none;

  .tab {
    cursor: pointer;
    font-size: 14px;
    line-height: 2;
    padding: 0 1em;
    color: var(--g-color-20);
    border-radius: var(--g-border-radius);

    &:hover {
      background: var(--g-color-83);
    }

    &.selected {
      color: var(--g-color-0);
      font-weight: 500;
      background: var(--g-color-94);
    }
  }

  &.small {
    display: inline-flex;
    margin-bottom: 0;
    z-index: 1;
    flex: none;
    justify-self: center;

    .tab {
      line-height: 1.5;
      font-size: 14px;
    }
  }
}

@include dark-theme {
  .tabs .tab.selected {
    background: var(--g-color-65);
  }
}
</style>
