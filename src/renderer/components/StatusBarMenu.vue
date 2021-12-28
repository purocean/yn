<template>
  <div class="status-bar-menu-wrapper">
    <div
      :class="{'status-bar-menu': true, hidden: menu.hidden}"
      v-for="menu in list"
      :key="menu.id"
      @mousedown="menu.onMousedown && menu.onMousedown(menu)"
      @click="menu.onClick && menu.onClick(menu)">
      <div class="title" :title="menu.tips">
        <svg-icon v-if="menu.icon" :name="menu.icon" class="title-icon" />
        <div v-if="menu.title" class="title-text">{{menu.title}}</div>
      </div>
      <ul class="list" v-if="showList && menu.list && menu.list.length">
        <li
          v-for="item in menu.list"
          :key="item.id"
          :class="{disabled: item.disabled, hidden: item.hidden}"
          :title="item.tips"
          @click="handleItemClick(item)">
          <div class="menu-item-title">{{item.title}}</div>
          <div v-if="item.subTitle" class="menu-item-sub-title">{{item.subTitle}}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, ref } from 'vue'
import { getMenus, MenuItem } from '@fe/services/status-bar'
import { registerHook, removeHook } from '@fe/core/hook'
import type { BuildInActionName } from '@fe/types'
import SvgIcon from './SvgIcon.vue'

export default defineComponent({
  components: { SvgIcon },
  name: 'status-bar-menu',
  props: {
    position: {
      type: String,
      default: 'left'
    }
  },
  setup (props) {
    const list = ref(getMenus(props.position))
    const showList = ref(true)

    const handleItemClick = (item: MenuItem) => {
      if (item.disabled) {
        return
      }

      item.onClick && item.onClick(item)
      showList.value = false
      setTimeout(() => {
        showList.value = true
      }, 0)
    }

    const updateMenu = ({ name }: { name: BuildInActionName }) => {
      if (!name || name === 'status-bar.refresh-menu') {
        list.value = getMenus(props.position)
      }
      return false
    }

    registerHook('ACTION_BEFORE_RUN', updateMenu as any)
    registerHook('I18N_CHANGE_LANGUAGE', updateMenu as any)
    onBeforeUnmount(() => {
      removeHook('ACTION_BEFORE_RUN', updateMenu as any)
      removeHook('I18N_CHANGE_LANGUAGE', updateMenu as any)
    })

    return {
      list,
      showList,
      handleItemClick
    }
  },
})
</script>

<style lang="scss" scoped>
.status-bar-menu {
  cursor: pointer;
  user-select: none;
  z-index: 99999;
  position: relative;
  overflow-x: hidden;
}

.status-bar-menu.hidden,
.status-bar-menu .hidden {
  display: none;
}

.title {
  width: 100%;
  padding: 0 .8em;
  box-sizing: border-box;
  width: fit-content;
  display: flex;
  align-content: center;
}

.title-icon {
  width: 12px;
  height: 20px;
  display: block;
}

.title-icon + .title-text {
  padding-left: 4px;
}

.title-text {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.status-bar-menu:hover {
  background: #4a4b4d;
}

.status-bar-menu:hover .list {
  display: block;
}

.list {
  min-width: 70px;
  margin: 0;
  list-style: none;
  background: #4a4b4d;
  padding: 4px 0;
  display: none;
  position: fixed;
  bottom: 20px;
  box-sizing: border-box;
  box-shadow: rgba(0, 0, 0 , 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.list li {
  padding: 4px .8em;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  border-radius: var(--g-border-radius);

  &.disabled {
    cursor: default;

    &:hover {
      background: unset;
    }

    .menu-item-title {
      color: var(--g-color-50);
    }
  }

  .menu-item-sub-title {
    font-size: 12px;
    color: var(--g-color-50);
    margin-left: 1em;
  }
}

.list li:hover {
  background: #2f3031;
}
</style>
