<template>
  <div class="title-bar" :style="{'--navigation-safe-width': `${navigationSafeWidth}px`}">
    <div class="navigation-buttons">
      <div
        v-for="(item, i) in items"
        :key="i"
        :class="{btn: true, disabled: item.disabled, checked: item.checked}"
        :title="item.title"
        @click.stop="item.onClick"
      >
        <svg-icon :name="item.icon" />
      </div>
    </div>
    <div ref="tabsContainer" class="tabs-container"></div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { registerAction, removeAction } from '@fe/core/action'
import { registerHook, removeHook } from '@fe/core/hook'
import { titleBarTabsContainer, setTitleBarTabsContainer } from '@fe/support/title-bar'
import { ControlCenter } from '@fe/services/workbench'
import type { Components } from '@fe/types'
import SvgIcon from './SvgIcon.vue'

const tabsContainer = ref<HTMLElement | null>(null)
const navigation = ref<Components.ControlCenter.Schema['navigation']>()
const items = computed(() => navigation.value?.items.filter((item): item is Extract<Components.ControlCenter.Item, {type: 'btn'}> => {
  return item.type === 'btn' && !!item.showInActionBar
}) || [])
const navigationSafeWidth = computed(() => 27 + items.value.length * 24)

function refresh () {
  navigation.value = ControlCenter.getSchema().navigation
}

registerAction({ name: 'action-bar.refresh', handler: refresh })
registerHook('COMMAND_KEYBINDING_CHANGED', refresh)

onMounted(() => {
  setTitleBarTabsContainer(tabsContainer.value)
  refresh()
})

onBeforeUnmount(() => {
  removeAction('action-bar.refresh')
  removeHook('COMMAND_KEYBINDING_CHANGED', refresh)

  if (titleBarTabsContainer.value === tabsContainer.value) {
    setTitleBarTabsContainer(null)
  }
})
</script>

<style lang="scss" scoped>
.title-bar {
  position: relative;
  width: 100%;
  height: 30px;
  overflow: hidden;
  box-sizing: border-box;
  background: var(--g-color-87);
  border-bottom: 1px solid var(--g-color-86);
  -webkit-user-select: none;
  user-select: none;
  -webkit-app-region: drag;
  app-region: drag;
}

.navigation-buttons {
  position: absolute;
  top: 0;
  left: calc(env(titlebar-area-x, 0px) + 3px);
  height: 30px;
  display: flex;
  align-items: center;
  z-index: 2;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.btn {
  width: 24px;
  height: 24px;
  flex: none;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  border-radius: var(--g-border-radius);
  color: var(--g-color-20);
  transition: .1s ease-in-out;

  .svg-icon {
    width: 12px;
    height: 12px;
    pointer-events: none;
  }

  &:not(.disabled):not(.checked):hover {
    background: var(--g-color-active-b);
  }

  &.checked {
    background: var(--g-color-active-c);
  }

  &.disabled {
    color: var(--g-color-50);
    cursor: default;
  }
}

.tabs-container {
  position: absolute;
  top: 0;
  bottom: 0;
  left: max(var(--tabs-left, 0px), calc(env(titlebar-area-x, 0px) + var(--navigation-safe-width)));
  right: calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw));
  min-width: 0;
  overflow: hidden;
  z-index: 1;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}
</style>
