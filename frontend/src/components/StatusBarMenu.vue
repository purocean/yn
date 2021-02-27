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
import { defineComponent, nextTick, onBeforeUnmount, ref } from 'vue'
import { useBus } from '../useful/bus'
import { getStatusBarMenus, StatusBarMenuItem } from '../useful/plugin'

export default defineComponent({
  name: 'status-bar-menu',
  setup () {
    const bus = useBus()
    const list = ref(getStatusBarMenus())
    const showList = ref(true)

    const handleItemClick = (item: StatusBarMenuItem) => {
      item.onClick && item.onClick(item)
      showList.value = false
      nextTick(() => {
        showList.value = true
      })
    }

    const updateMenu = () => {
      list.value = getStatusBarMenus()
      console.log('rest', getStatusBarMenus())
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
  width: 100px;
  cursor: pointer;
  user-select: none;
}

.title {
  padding: 0 .3em;
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
  padding: 4px .6em;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.list li:hover {
  background: #2f3031;
}
</style>
