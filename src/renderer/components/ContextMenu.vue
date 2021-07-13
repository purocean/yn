<template>
  <div class="context-menu">
    <div class="mask" v-if="isShow" @click="hide" @contextmenu.prevent.stop="hide"></div>
    <ul class="menu" ref="refMenu" :style="{visibility: isShow ? 'visible' : 'hidden'}">
      <template v-for="(item, i) in items">
        <li v-if="item.type === 'separator'" :key="i" :class="item.type || 'normal'"></li>
        <li v-else :key="item.id" @click="handleClick(item)" :class="item.type || 'normal'">{{item.label}}</li>
      </template>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Components } from '@fe/support/types'

export default defineComponent({
  name: 'context-menu',
  setup () {
    const refMenu = ref<HTMLUListElement | null>(null)
    const items = ref<Components.ContextMenu.Item[]>([])
    const isShow = ref(false)

    let mouseX = 0
    let mouseY = 0

    function hideMenu () {
      isShow.value = false
    }

    function hide () {
      items.value = []
      hideMenu()
    }

    function handleClick (item: Components.ContextMenu.NormalItem) {
      item.onClick(item)
      hide()
    }

    function recordMousePosition (e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    function showMenu () {
      if (!refMenu.value) {
        return
      }

      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      const menuWidth = refMenu.value.offsetWidth
      const menuHeight = refMenu.value.offsetHeight

      const x = mouseX + menuWidth > windowWidth ? mouseX - menuWidth : mouseX
      const y = mouseY + menuHeight > windowHeight ? mouseY - menuHeight : mouseY

      refMenu.value.style.left = x + 'px'
      refMenu.value.style.top = y + 'px'

      isShow.value = true
    }

    function show (menuItems: Components.ContextMenu.Item[]) {
      items.value = menuItems
      nextTick(() => {
        showMenu()
      })
    }

    onMounted(() => {
      window.addEventListener('blur', hide)
      window.addEventListener('mousemove', recordMousePosition)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('blur', hide)
      window.removeEventListener('mousemove', recordMousePosition)
    })

    return {
      refMenu,
      isShow,
      items,
      hide,
      show,
      handleClick,
    }
  },
})
</script>

<style scoped>
.mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.menu {
  list-style: none;
  padding: 1px;
  margin: 0;
  position: fixed;
  left: -99999px;
  top: -99999px;
  visibility: hidden;
  background: var(--g-color-95);
  border: 1px var(--g-color-84) solid;
  border-left: 0;
  border-top: 0;
  z-index: 9999999999;
  color: var(--g-foreground-color);
  min-width: 9em;
  cursor: default;
}

.menu > li.separator {
  border-top: 1px var(--g-color-80) solid;
  border-bottom: 1px var(--g-color-70) solid;
  margin: 3px 0;
}

.menu > li.normal {
  padding: 5px 20px;
  cursor: default;
  font-size: 12px;
}

.menu > li.normal:hover {
  background: var(--g-color-80);
}

</style>
