<template>
  <div class="action-bar">
    <div class="btns">
      <div>
        <div class="btn flat" @click="toggleOutline()" :title="$t(showOutline ? 'files' : 'outline') + ' ' + getKeysLabel('layout.toggle-outline')">
          <svg-icon v-if="showOutline" name="folder-tree-solid" />
          <svg-icon v-else name="list" />
        </div>
      </div>
      <template v-if="!showOutline">
        <div class="btn flat" @click="showSortMenu()" :title="$t(('tree.sort.by-' + treeSort.by) as any, $t(('tree.sort.' + treeSort.order) as any))">
          <svg-icon v-if="treeSort.order === 'asc'" name="arrow-up-wide-short-solid" />
          <svg-icon v-else name="arrow-down-short-wide-solid" />
        </div>
        <div class="btn flat" @click="findInFolder()" :title="$t('search-panel.search-files') + ' ' + getKeysLabel('tree.find-in-folder')">
          <svg-icon name="search-solid" />
        </div>
      </template>
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
import { useContextMenu } from '@fe/support/ui/context-menu'
import type { AppState } from '@fe/support/store'
import { useI18n } from '@fe/services/i18n'
import { toggleOutline } from '@fe/services/layout'
import { findInFolder } from '@fe/services/tree'
import { getKeysLabel } from '@fe/core/command'
import type { FileSort } from '@fe/types'
import SvgIcon from './SvgIcon.vue'

const store = useStore<AppState>()
const navigation = ref<Schema['navigation']>()
const showOutline = toRef(store.state, 'showOutline')
const treeSort = toRef(store.state, 'treeSort')

const { t } = useI18n()

function showSortMenu () {
  const buildItem = ({ by, order }: FileSort) => {
    const sort = store.state.treeSort
    const id = `${by}-${order}`
    return {
      id,
      label: t(('tree.sort.by-' + by) as any, t(('tree.sort.' + order) as any)),
      checked: sort.by === by && sort.order === order,
      onClick: () => {
        store.commit('setTreeSort', { by, order })
      },
    }
  }

  useContextMenu().show([
    buildItem({ by: 'name', order: 'asc' }),
    buildItem({ by: 'name', order: 'desc' }),
    { type: 'separator' },
    buildItem({ by: 'serial', order: 'asc' }),
    buildItem({ by: 'serial', order: 'desc' }),
    { type: 'separator' },
    buildItem({ by: 'birthtime', order: 'asc' }),
    buildItem({ by: 'birthtime', order: 'desc' }),
    { type: 'separator' },
    buildItem({ by: 'mtime', order: 'asc' }),
    buildItem({ by: 'mtime', order: 'desc' }),
  ], { mouseX: x => x - 20, mouseY: y => y + 16 })
}

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
  padding: 0 3px;

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
    width: 24px;
    height: 24px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 12px;
    color: var(--g-color-20);
    border-radius: var(--g-border-radius);
    margin: 3px;
    transition: .1s ease-in-out;

    &.flat {
      width: 24px;
      height: 24px;
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
