<template>
  <div class="status-bar-menu-wrapper" @contextmenu.prevent @click.capture="onMenuClick">
    <div
      :class="{'status-bar-menu': true, hidden: menu.hidden, 'custom-title': menu._customTitle}"
      v-for="menu in list.sort((a: any, b: any) => ((a.order || 0) - (b.order || 0)))"
      :key="menu.id"
      :data-id="menu.id"
      @mousedown="menu.onMousedown && menu.onMousedown(menu)"
      @click="menu.onClick && menu.onClick(menu)">
      <div v-if="menu._customTitle" class="custom-title">
        <component :is="menu.title" />
      </div>
      <div v-else class="title" :title="menu.tips">
        <svg-icon v-if="menu.icon" :name="menu.icon" class="title-icon" />
        <div v-if="menu.title" class="title-text">{{menu.title}}</div>
      </div>
      <ul v-if="showList && menu.list && menu.list.length" :class="{list: true, 'has-checked': menu.list.some((x: any) => x.type === 'normal' && x.checked)}">
        <template v-for="item in menu.list.sort((a: any, b: any) => ((a.order || 0) - (b.order || 0)))" :key="item.id">
          <li v-if="item.type === 'separator' && !item.hidden" :class="item.type"></li>
          <li
            v-else-if="item.type !== 'separator' && !item.hidden"
            :class="{[item.type]: true, disabled: item.disabled, ellipsis: item.ellipsis}"
            :title="item.tips"
            @click="handleItemClick(item)">
            <svg-icon class="checked-icon" v-if="item.checked" name="check-solid" />
            <div class="menu-item-title">{{item.title}}</div>
            <div v-if="item.subTitle" class="menu-item-sub-title">{{item.subTitle}}</div>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, ref, shallowRef } from 'vue'
import { getMenus, MenuItem, refreshMenu } from '@fe/services/status-bar'
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
    const _list = shallowRef(getMenus(props.position))
    const list: any = computed(() => _list.value.map((menu: any) => ({
      ...menu,
      _customTitle: menu.title &&
        typeof menu.title !== 'string' &&
        !Object.prototype.hasOwnProperty.call(menu.title, 'toString')
    })))

    const showList = ref(true)

    const handleItemClick = (item: MenuItem & { type: 'normal' }) => {
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
        _list.value = getMenus(props.position)
      }
      return false
    }

    const onMenuClick = () => {
      setTimeout(refreshMenu, 50)
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
      handleItemClick,
      onMenuClick
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
  font-variant-numeric: tabular-nums;
}

.status-bar-menu.hidden {
  display: none;
}

.custom-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: initial;
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
  overflow: hidden;
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
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  margin: 0;
  list-style: none;
  background: #4a4b4d;
  padding: 4px 0;
  display: none;
  position: fixed;
  bottom: 20px;
  box-sizing: border-box;
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;

  &.has-checked li.normal {
    padding-left: 20px;
  }
}

.list li.normal {
  padding: 4px 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: var(--g-border-radius);

  &:hover {
    background: #2f3031;
  }

  &.disabled {
    cursor: default;

    &:hover {
      background: unset;
    }

    .menu-item-title {
      color: var(--g-color-50);
    }
  }

  &.ellipsis {
    .menu-item-title {
      &::after {
        content: '...';
      }
    }
  }

  .checked-icon {
    position: absolute;
    width: 12px;
    height: 12px;
    transform: translateX(-14px) translateY(-2px) scaleX(0.8);
  }

  .menu-item-sub-title {
    font-size: 12px;
    color: var(--g-color-50);
    margin-left: 1em;
  }
}

.list li.separator {
  border-top: 1px #757677 solid;
  border-bottom: 1px #4e4f50 solid;
  margin: 3px 0;

  &:first-child,
  &:last-child,
  & + li.separator {
    display: none;
  }
}

</style>
