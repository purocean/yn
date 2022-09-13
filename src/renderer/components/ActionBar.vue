<template>
  <div class="action-bar">
    <div class="btns">
      <div>
        <div class="btn flat" @click="toggleOutline()" :title="$t(showOutline ? 'files' : 'outline')">
          <svg-icon v-if="showOutline" name="folder-tree-solid" />
          <svg-icon v-else name="list" />
        </div>
      </div>
    </div>
    <div class="title">{{$t(showOutline ? 'outline' : 'files')}}</div>
    <div class="btns" v-if="navigation">
      <div v-for="(item, i) in navigation.items" :key="i">
        <div
          v-if="item.showInActionBar && item.type === 'btn'"
          :class="{ btn: true, flat: item.flat, disabled: item.disabled, checked: item.checked }"
          :title="item.title"
          @click.stop="item.onClick"
        >
          <svg-icon :name="item.icon" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, ref, toRef } from 'vue'
import { useStore } from 'vuex'
import { registerAction, removeAction } from '@fe/core/action'
import { getSchema, Schema } from '@fe/services/control-center'
import type { AppState } from '@fe/support/store'
import SvgIcon from './SvgIcon.vue'
import { useI18n } from '@fe/services/i18n'
import { toggleOutline } from '@fe/services/layout'

const store = useStore<AppState>()
const navigation = ref<Schema['navigation']>()
const showOutline = toRef(store.state, 'showOutline')

useI18n()

registerAction({
  name: 'action-bar.refresh',
  handler () {
    navigation.value = getSchema().navigation
  }
})

onBeforeUnmount(() => {
  removeAction('action-bar.refresh')
})
</script>

<style lang="scss" scoped>
.action-bar {
  height: 30px;
  flex: none;
  border-bottom: 1px solid var(--g-color-87);
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;

  & > .title {
    position: absolute;
    margin: auto;
    width: 100%;
    text-align: center;
    display: block;
    font-size: 14px;
    color: var(--g-color-20);
    z-index: -1;
    user-select: none;
  }

  & > div {
    display: flex;
  }

  & > .btns {
    background: var(--g-color-98);
  }

  .btn {
    width: 30px;
    height: 30px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 12px;
    color: var(--g-color-20);
    border-radius: var(--g-border-radius);
    margin: 4px;
    transition: .1s ease-in-out;

    &.flat {
      width: 30px;
      height: 30px;
      margin: 0;
    }

    &.checked {
      background: var(--g-color-active-c);
    }

    .svg-icon {
      width: 12px;
      height: 12px;
      pointer-events: none;
    }

    &:not(.disabled):not(.checked):hover {
      background: var(--g-color-active-b);
    }

    &.disabled {
      color: var(--g-color-50);
      cursor: default;
    }
  }
}
</style>
