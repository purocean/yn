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
        <li v-for="item in menu.list" :key="item.id" :title="item.tips" @click="handleItemClick(item)">{{item.title}}</li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, ref } from 'vue'
import { useBus } from '../useful/bus'
import { getMenus, MenuItem } from '../useful/plugin/status-bar'
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
    const bus = useBus()
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

    bus.on('status-bar-menu-update', updateMenu)
    onBeforeUnmount(() => {
      bus.off('status-bar-menu-update', updateMenu)
    })

    return {
      list,
      showList,
      handleItemClick
    }
  },
})
</script>

<style scoped>
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
  padding-right: 4px;
  display: block;
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
  width: 100px;
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
}

.list li:hover {
  background: #2f3031;
}
</style>
