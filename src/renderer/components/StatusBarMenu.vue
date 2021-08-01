<template>
  <div class="status-bar-menu-wrapper">
    <div
      :class="{'status-bar-menu': true, hidden: menu.hidden}"
      v-for="menu in list"
      :key="menu.id"
      @click="menu.onClick && menu.onClick(menu)">
      <div class="title" :title="menu.tips">
        <svg-icon v-if="menu.icon" :name="menu.icon" class="title-icon" />
        <div v-if="menu.title" class="title-text">{{menu.title}}</div>
      </div>
      <ul class="list" v-if="showList && menu.list && menu.list.length">
        <li v-for="item in menu.list" :key="item.id" :title="item.tips" @click="handleItemClick(item)">
          <div class="menu-item-title">{{item.title}}</div>
          <div v-if="item.subTitle" class="menu-item-sub-title">{{item.subTitle}}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, ref } from 'vue'
import { getMenus, MenuItem } from '@fe/context/status-bar'
import { hookAction } from '@fe/context/action'
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
      item.onClick && item.onClick(item)
      showList.value = false
      setTimeout(() => {
        showList.value = true
      }, 0)
    }

    const updateMenu = () => {
      list.value = getMenus(props.position)
    }

    const cleanup = hookAction('before-run', 'status-bar.refresh-menu', updateMenu)
    onBeforeUnmount(() => {
      cleanup()
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

.status-bar-menu.hidden {
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
  background: #2f3031;
}

.status-bar-menu:hover .list {
  display: block;
}

.list {
  min-width: 70px;
  margin: 0;
  list-style: none;
  background: #37393a;
  padding: 4px 0;
  display: none;
  position: fixed;
  bottom: 20px;
  box-sizing: border-box;
}

.list li {
  padding: 4px .8em;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  display: flex;
  justify-content: space-between;

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
