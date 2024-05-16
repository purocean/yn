<template>
  <XMask transparent :show="items && items.length > 0" @close="hide" :style="{ zIndex: 2147483646 }">
    <ul :class="{menu: true, 'item-focus': itemFocus}" ref="refMenu" @contextmenu.prevent>
      <template v-for="(item, i) in items">
        <li v-if="item.type === 'separator'" v-show="!item.hidden" :key="i" :class="item.type" />
        <li
          v-else
          :key="item.id"
          v-show="!item.hidden"
          @click="handleClick(item)"
          @mouseenter="currentItemIdx = i"
          :class="{ [item.type || 'normal']: true, ellipsis: item.ellipsis, focus: i === currentItemIdx && itemFocus }"
        >
          <svg-icon class="checked-icon" v-if="item.checked" name="check-solid" />
          <span class="label" v-if="(typeof item.label === 'string')">{{item.label}}</span>
          <component v-else :is="item.label" />
        </li>
      </template>
    </ul>
  </XMask>
</template>

<script lang="ts">
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Components } from '@fe/types'
import XMask from './Mask.vue'
import SvgIcon from './SvgIcon.vue'

export default defineComponent({
  name: 'context-menu',
  components: { SvgIcon, XMask },
  setup () {
    const refMenu = ref<HTMLUListElement | null>(null)
    const items = ref<Components.ContextMenu.Item[]>([])
    const currentItemIdx = ref(-1)
    const itemFocus = ref(false)

    let mouseX = 0
    let mouseY = 0

    function hide () {
      items.value = []
    }

    function handleClick (item: Components.ContextMenu.NormalItem) {
      if (item && item.onClick) {
        item.onClick(item)
        hide()
      }
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
      refMenu.value.style.height = y < 0 ? `${Math.min(Math.max(menuHeight + y, windowHeight - 30), menuHeight)}px` : 'unset'
      refMenu.value.style.top = y < 0 ? '0px' : y + 'px'
    }

    function show (menuItems: Components.ContextMenu.Item[], opts?: Components.ContextMenu.ShowOpts) {
      items.value = menuItems
      currentItemIdx.value = -1

      if (refMenu.value) {
        refMenu.value.style.height = 'unset'
      }

      nextTick(() => {
        setPosition(opts)
      })
    }

    function updateCurrentItemIdx (offset: 1 | -1) {
      itemFocus.value = true
      if (currentItemIdx.value === -1) {
        currentItemIdx.value = 0
      } else {
        currentItemIdx.value = (currentItemIdx.value + offset + items.value.length) % items.value.length
      }

      const currentItem = items.value[currentItemIdx.value]
      if (currentItem.type === 'separator' || currentItem.hidden) {
        updateCurrentItemIdx(offset)
      }
    }

    function handleKeyDown (e: KeyboardEvent) {
      if (!items.value.length) {
        return
      }

      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        updateCurrentItemIdx(1)
        e.stopPropagation()
        e.preventDefault()
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        updateCurrentItemIdx(-1)
        e.stopPropagation()
        e.preventDefault()
      } else if (e.key === 'Enter') {
        if (currentItemIdx.value > -1 && itemFocus.value) {
          handleClick(items.value[currentItemIdx.value] as Components.ContextMenu.NormalItem)
          e.stopPropagation()
          e.preventDefault()
        }
      }
    }

    function handleMouseMove (e: MouseEvent) {
      itemFocus.value = false
      recordMousePosition(e)
    }

    onMounted(() => {
      window.addEventListener('blur', hide)
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('keydown', handleKeyDown, true)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('blur', hide)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keydown', handleKeyDown, true)
    })

    return {
      refMenu,
      items,
      hide,
      show,
      handleClick,
      currentItemIdx,
      itemFocus,
    }
  },
})
</script>

<style lang="scss" scoped>
@import '@fe/styles/mixins.scss';

.menu {
  list-style: none;
  padding: 1px;
  margin: 0;
  position: fixed;
  left: -99999px;
  top: -99999px;
  overflow-y: auto;
  background: rgba(var(--g-color-90-rgb), 0.65);
  backdrop-filter: var(--g-backdrop-filter);
  border: 1px var(--g-color-84) solid;
  border-left: 0;
  border-top: 0;
  z-index: 2147483647;
  color: var(--g-foreground-color);
  min-width: 9em;
  cursor: default;
  box-shadow: rgba(0, 0, 0, 0.2) 2px 2px 5px;
  border-radius: var(--g-border-radius);
  user-select: none;
}

.menu > li.separator {
  border-top: 1px rgba(var(--g-color-90-rgb), 0.7) solid;
  border-bottom: 1px rgba(var(--g-color-76-rgb), 0.7) solid;
  margin: 3px 6px;

  &:first-child,
  &:last-child,
  & + li.separator {
    display: none;
  }
}

.menu > li.focus {
  outline: 1px var(--g-color-accent) dashed;
  outline-offset: -2px;
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

.menu:not(.item-focus) > li.normal:hover {
  background: var(--g-color-active-a);
}

.menu > li.ellipsis > .label::after {
  content: '...';
}

@include dark-theme {
  .menu {
    background: rgba(var(--g-color-77-rgb), 0.65);
    box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  }

  .menu > li.normal:hover {
    background: var(--g-color-active-b);
  }

  .menu > li.separator {
    border-top: 1px rgba(var(--g-color-90-rgb), 0.7) solid;
    border-bottom: 1px rgba(var(--g-color-70-rgb), 0.7) solid;
  }
}
</style>
