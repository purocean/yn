<template>
  <div class="status-bar-menu-wrapper">
    <div class="status-bar-menu" v-for="menu in list" :key="menu.id">
      <div class="title">{{menu.title}}</div>
      <ul class="list" v-if="showList">
        <li v-for="item in menu.list" :key="item.id" :title="item.tips" @click="handleItemClick(item)">{{item.title}}</li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, ref } from 'vue'
import { useBus } from '../useful/bus'
import { getMenus, MenuItem } from '../useful/plugin/status-bar'

export default defineComponent({
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
  z-index: 9999999999;
  position: relative;
  overflow-x: hidden;
}

.title {
  width: 100%;
  padding: 0 .8em;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  box-sizing: border-box;
  width: fit-content;
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
