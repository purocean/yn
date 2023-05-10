<template>
  <Mask transparent :show="items && items.length > 0" @close="hide" :style="{ zIndex: 2147483646 }">
    <ul class="menu" ref="refMenu" @contextmenu.prevent>
      <template v-for="(item, i) in items">
        <li v-if="item.type === 'separator'" v-show="!item.hidden" :key="i" :class="item.type" />
        <li v-else :key="item.id" v-show="!item.hidden" @click="handleClick(item)" :class="item.type || 'normal'">
          <svg-icon class="checked-icon" v-if="item.checked" name="check-solid" />
          <span v-if="(typeof item.label === 'string')">{{item.label}}</span>
          <component v-else :is="item.label" />
        </li>
      </template>
    </ul>
  </Mask>
</template>

<script lang="ts">
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Components } from '@fe/types'
import Mask from './Mask.vue'
import SvgIcon from './SvgIcon.vue'

export default defineComponent({
  name: 'context-menu',
  components: { SvgIcon, Mask },
  setup () {
    const refMenu = ref<HTMLUListElement | null>(null)
    const items = ref<Components.ContextMenu.Item[]>([])

    let mouseX = 0
    let mouseY = 0

    function hide () {
      items.value = []
    }

    function handleClick (item: Components.ContextMenu.NormalItem) {
      item.onClick(item)
      hide()
    }

    function recordMousePosition (e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    function setPosition (opts?: Components.ContextMenu.ShowOpts) {
      if (!refMenu.value) {
        return
      }

      const _mouseX = opts?.mouseX
        ? (typeof opts.mouseX === 'function' ? opts.mouseX(mouseX) : opts.mouseX)
        : mouseX
      const _mouseY = opts?.mouseY
        ? (typeof opts.mouseY === 'function' ? opts.mouseY(mouseY) : opts.mouseY)
        : mouseY

      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      const menuWidth = refMenu.value.offsetWidth
      const menuHeight = refMenu.value.offsetHeight

      const x = _mouseX + menuWidth > windowWidth ? _mouseX - menuWidth : _mouseX
      const y = _mouseY + menuHeight > windowHeight ? _mouseY - menuHeight : _mouseY

      refMenu.value.style.left = x + 'px'
      refMenu.value.style.height = y < 0 ? `${menuHeight + y}px` : 'unset'
      refMenu.value.style.top = y < 0 ? '0px' : y + 'px'
    }

    function show (menuItems: Components.ContextMenu.Item[], opts?: Components.ContextMenu.ShowOpts) {
      items.value = menuItems

      if (refMenu.value) {
        refMenu.value.style.height = 'unset'
      }

      nextTick(() => {
        setPosition(opts)
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
      items,
      hide,
      show,
      handleClick,
    }
  },
})
</script>

<style lang="scss" scoped>
.menu {
  list-style: none;
  padding: 1px;
  margin: 0;
  position: fixed;
  left: -99999px;
  top: -99999px;
  overflow-y: auto;
  background: rgba(var(--g-color-77-rgb), 0.65);
  backdrop-filter: var(--g-backdrop-filter);
  border: 1px var(--g-color-84) solid;
  border-left: 0;
  border-top: 0;
  z-index: 2147483647;
  color: var(--g-foreground-color);
  min-width: 9em;
  cursor: default;
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
  user-select: none;
}

.menu > li.separator {
  border-top: 1px rgba(var(--g-color-90-rgb), 0.7) solid;
  border-bottom: 1px rgba(var(--g-color-70-rgb), 0.7) solid;
  margin: 3px 6px;

  &:first-child,
  &:last-child,
  & + li.separator {
    display: none;
  }
}

.menu > li.normal {
  padding: 5px 20px;
  cursor: default;
  font-size: 12px;
  border-radius: var(--g-border-radius);

  .checked-icon {
    position: absolute;
    width: 10px;
    height: 10px;
    transform: translateX(-14px) translateY(0px) scaleX(0.8);
  }
}

.menu > li.normal:hover {
  background: var(--g-color-active-b);
}
</style>
