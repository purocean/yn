<template>
  <div class="tabs-wrapper">
    <div
      ref="refTabs"
      @mousewheel="onMouseWheel"
      @scroll="handleShadow"
      @mouseenter="handleShadow"
      @dblclick.self="onBlankDblClick"
      class="tabs">
      <div
        v-for="item in tabList"
        :key="item.key"
        :data-id="item.key"
        :class="{tab: true, current: item.key === value, fixed: item.fixed, temporary: item.temporary}"
        :title="item.description"
        :data-key="item.key"
        @contextmenu.exact.prevent.stop="showContextMenu(item)"
        @mouseup.middle="removeTabs([item])"
        @mousedown.left="switchTab(item)"
        @dblclick.stop="onItemDblClick(item)">
        <div class="label">{{item.label}}</div>
        <div v-if="item.fixed" class="icon" :title="$t('tabs.unpin')" @mousedown.prevent.stop @click.prevent.stop="toggleFix(item)">
          <svg-icon name="thumbtack" style="width: 10px; height: 10px;" />
        </div>
        <div v-else class="icon" :title="$t('close')" @mousedown.prevent.stop @click.prevent.stop="removeTabs([item])">
          <svg-icon name="times" style="width: 12px; height: 12px;" />
        </div>
      </div>
    </div>
    <div ref="refFilterBtn" class="action-btn" @click="showQuickFilter" :title="filterBtnTitle">
      <svg-icon name="chevron-down" width="12px" />
    </div>
    <template v-for="(btn, i) in [...actionBtns].filter(x => !x.hidden).sort((a: any, b: any) => ((a.order || 0) - (b.order || 0)))">
      <div  v-if="btn.type === 'separator'" class="action-btn-separator" :key="i" />
      <div v-else-if="btn.type === 'normal'" :key="btn.key || `${i}`" class="action-btn" @click="btn.onClick" :title="btn.title">
        <svg-icon :name="btn.icon" width="12px" />
      </div>
      <component v-else-if="btn.type === 'custom'" :key="btn.key || `custom-${i}`" :is="btn.component" />
    </template>
  </div>
</template>

<script lang="ts">
import Sortable from 'sortablejs'
import { throttle } from 'lodash-es'
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useContextMenu } from '@fe/support/ui/context-menu'
import { useQuickFilter } from '@fe/support/ui/quick-filter'
import { useI18n } from '@fe/services/i18n'
import type { Components } from '@fe/types'
import { registerHook, removeHook } from '@fe/core/hook'
import SvgIcon from './SvgIcon.vue'

export default defineComponent({
  name: 'tabs',
  components: { SvgIcon },
  props: {
    value: String,
    list: {
      type: Array as () => Components.Tabs.Item[],
      required: true,
    },
    filterBtnTitle: String,
    actionBtns: {
      type: Array as () => Components.Tabs.ActionBtn[],
      default: () => [],
    },
  },
  emits: ['input', 'remove', 'switch', 'change-list', 'dblclick-blank', 'dblclick-item'],
  setup (props, { emit }) {
    const { t } = useI18n()

    const refTabs = ref<HTMLElement | null>(null)
    const refFilterBtn = ref<HTMLElement | null>(null)
    const contextMenu = useContextMenu()
    const quickFilter = useQuickFilter()

    function sortTabs (tabs?: Components.Tabs.Item[]) {
      return tabs?.sort((a, b) => Number(b.fixed || 0) - Number(a.fixed || 0))
    }

    function switchTab (item: Components.Tabs.Item) {
      if (item.key !== props.value) {
        emit('input', item.key)
        emit('switch', item)
      }
    }

    function removeTabs (items: Components.Tabs.Item[]) {
      emit('remove', items)
    }

    function onItemDblClick (item: Components.Tabs.Item) {
      emit('dblclick-item', item)
    }

    function onBlankDblClick (e: MouseEvent) {
      emit('dblclick-blank', e)
    }

    function removeOther (item: Components.Tabs.Item) {
      removeTabs(props.list.filter(x => x.key !== item.key && !x.fixed))
    }

    function removeRight (item: Components.Tabs.Item) {
      if (item.fixed) {
        removeTabs(props.list.filter(x => !x.fixed))
      } else {
        removeTabs(props.list.slice(props.list.findIndex(x => x.key === item.key) + 1))
      }
    }

    function removeLeft (item: Components.Tabs.Item) {
      if (item.fixed) {
        return
      }

      const start = props.list.findIndex(x => !x.fixed)
      removeTabs(props.list.slice(start, props.list.findIndex(x => x.key === item.key)))
    }

    function removeAll () {
      removeTabs(props.list.filter(x => !x.fixed))
    }

    function changeTabOrder (oldIndex: number, newIndex: number) {
      const list = [...props.list]
      const tmp = list[oldIndex]
      list.splice(oldIndex, 1)
      list.splice(newIndex, 0, tmp)
      emit('change-list', sortTabs(list))
    }

    let sortable: Sortable
    function initSortable () {
      sortable = Sortable.create(refTabs.value!, {
        animation: 250,
        ghostClass: 'on-sort',
        direction: 'horizontal',
        onEnd: ({ oldIndex, newIndex }: { oldIndex?: number; newIndex?: number }) => {
          changeTabOrder(oldIndex || 0, newIndex || 0)
        },
        onMove (event: any) {
          if (event.related && event.dragged) {
            if (event.related.classList.contains('fixed') !== event.dragged.classList.contains('fixed')) {
              return false
            }
          }
        }
      })
    }

    function toggleFix (item: Components.Tabs.Item) {
      emit('change-list', props.list.map(x => ({
        ...x,
        fixed: x.key === item.key ? !item.fixed : x.fixed,
        temporary: x.key === item.key ? false : x.temporary,
      })))
    }

    function showContextMenu (item: Components.Tabs.Item) {
      contextMenu.show([
        { id: 'close', label: t('close'), onClick: () => removeTabs([item]) },
        { id: 'close-others', label: t('tabs.close-others'), onClick: () => removeOther(item) },
        { id: 'close-right', label: t('tabs.close-right'), onClick: () => removeRight(item) },
        { id: 'close-left', label: t('tabs.close-left'), onClick: () => removeLeft(item) },
        { id: 'close-all', label: t('tabs.close-all'), onClick: () => removeAll() },
        { type: 'separator' },
        { id: 'fix', label: item.fixed ? t('tabs.unpin') : t('tabs.pin'), onClick: () => toggleFix(item) },
      ])
    }

    function showQuickFilter () {
      const rect = refFilterBtn.value!.getBoundingClientRect()
      quickFilter.show({
        placeholder: t('tabs.search-tabs'),
        top: `${rect.bottom + 10}px`,
        right: `${document.body.clientWidth - rect.right}px`,
        list: tabList.value || [],
        current: props.value,
        onChoose: switchTab as any,
      })
    }

    function handleKeydown (e: KeyboardEvent) {
      if (e.ctrlKey && !e.altKey && !e.metaKey && e.code.startsWith('Digit')) {
        const tabIndex = Number(e.code.substring(5)) - 1

        const tab = props.list[tabIndex === -1 ? props.list.length - 1 : tabIndex]
        if (tab) {
          switchTab(tab)
        }

        e.preventDefault()
        e.stopPropagation()
      }
    }

    function onMouseWheel (e: WheelEvent) {
      if (e.deltaX === 0 && e.deltaY !== 0) {
        refTabs.value!.scrollLeft += e.deltaY

        e.preventDefault()
        e.stopPropagation()
      }
    }

    const handleShadow = throttle(() => {
      if (!refTabs.value) {
        return
      }

      const el = refTabs.value as HTMLElement
      if (el.scrollLeft === 0) {
        el.classList.add('left')
      } else {
        el.classList.remove('left')
      }

      if (el.scrollLeft + el.clientWidth === el.scrollWidth) {
        el.classList.add('right')
      } else {
        el.classList.remove('right')
      }
    }, 100)

    onMounted(() => {
      initSortable()
      registerHook('GLOBAL_KEYDOWN', handleKeydown)
      registerHook('GLOBAL_RESIZE', handleShadow)
    })

    onBeforeUnmount(() => {
      removeHook('GLOBAL_KEYDOWN', handleKeydown)
      removeHook('GLOBAL_RESIZE', handleShadow)
      sortable?.destroy()
    })

    const tabList = computed(() => sortTabs(props.list))

    watch(tabList, (val) => {
      if (sortable && val) {
        nextTick(() => {
          sortable.sort(val.map(x => x.key))
        })
      }
    })

    watch([() => props.value, () => props.actionBtns], () => {
      nextTick(() => {
        handleShadow()
        const el = refTabs.value?.querySelector<any>('.tab.current')
        el?.scrollIntoViewIfNeeded(false)
      })
    })

    return {
      refTabs,
      switchTab,
      showContextMenu,
      removeTabs,
      onItemDblClick,
      onBlankDblClick,
      tabList,
      toggleFix,
      handleShadow,
      onMouseWheel,
      refFilterBtn,
      showQuickFilter,
    }
  }
})
</script>

<style lang="scss" scoped>
.tabs-wrapper {
  flex: none;
  height: 30px;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  background: var(--g-color-87);

  .action-btn {
    flex: none;
    width: 22px;
    height: 22px;
    margin: 0 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--g-color-20);

    &:hover {
      color: var(--g-color-0);
      background-color: var(--g-color-75);
      border-radius: 50%;
    }
  }
}

.tabs {
  height: 100%;
  display: flex;
  z-index: 1;
  width: 100%;
  overflow-x: hidden;
  overflow-y: hidden;

  &::before,
  &::after {
    content: '';
    position: sticky;
    top: 0;
    width: 4px;
    flex: none;
    margin-left: -4px;
    height: 30px;
    display: block;
    pointer-events: none;
    opacity: 1;
    transition: opacity 0.3s;
  }

  &::before {
    left: 0;
    background: linear-gradient(to right, rgba(var(--g-color-70-rgb), 0.9), transparent);
  }

  &::after {
    right: 0;
    background: linear-gradient(to left, rgba(var(--g-color-70-rgb), 0.9), transparent);
  }

  &.left::before {
    opacity: 0 !important;
  }

  &.right::after {
    opacity: 0 !important;
  }

  &:hover {
    overflow-x: overlay;
  }

  &::-webkit-scrollbar {
    width: 4px !important;
    height: 4px !important;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--g-color-72) !important;
  }
}

.tab {
  width: fit-content;
  max-width: 250px;
  min-width: 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-right: 1px;
  color: var(--g-color-25);
  cursor: default;
  font-size: 12px;
  overflow: hidden;
  background: var(--g-color-87);
}

.label {
  padding: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab.current {
  color: var(--g-color-0);
  background: var(--g-color-100);
  border-radius: var(--g-border-radius);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  position: relative;
}

.icon {
  color: var(--g-color-50);
  height: 18px;
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 5px;
  flex: none;
}

.icon:hover {
  color: var(--g-color-40);
  background: var(--g-color-75);
}

.tab.on-sort {
  background: var(--g-color-75);
}

.tab.fixed {
  font-weight: bold;
  border-left: 2px var(--g-color-70) solid;
}

.tab.temporary {
  font-style: italic;
}

.action-btn-separator {
  width: 1px;
  height: 14px;
  background: var(--g-color-70);
  margin: 0 3px;
  flex: none;

  &:first-child,
  &:last-child,
  & + .action-btn-separator {
    display: none;
  }
}
</style>
