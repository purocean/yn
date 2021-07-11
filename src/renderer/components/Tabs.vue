<template>
  <div ref="refTabs" class="tabs">
    <div
      v-for="item in tabList"
      :key="item.key"
      :data-id="item.key"
      :class="{tab: true, current: item.key === value, fixed: item.fixed}"
      :title="item.description"
      :data-key="item.key"
      @contextmenu.exact.prevent.stop="showContextMenu(item)"
      @click="switchTab(item)">
      <div class="label">{{item.label}}</div>
      <div v-if="!item.fixed" class="close" @click.prevent.stop="removeTabs([item])">
        <svg-icon name="times-solid" title="关闭" style="width: 12px; height: 12px;" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Sortable from 'sortablejs'
import { computed, defineComponent, nextTick, onMounted, ref, watch } from 'vue'
import { useContextMenu } from '@fe/support/context-menu'
import { Components } from '@fe/support/types'
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
  },
  setup (props, { emit }) {
    const refTabs = ref<HTMLElement | null>(null)
    const contextMenu = useContextMenu()

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

    function swapTab (oldIndex: number, newIndex: number) {
      const list = props.list
      const tmp = list[oldIndex]
      list[oldIndex] = list[newIndex]
      list[newIndex] = tmp
      emit('change-list', sortTabs([...list]))
    }

    let sortable: Sortable
    function initSortable () {
      sortable = Sortable.create(refTabs.value!, {
        animation: 250,
        ghostClass: 'on-sort',
        direction: 'horizontal',
        onEnd: ({ oldIndex, newIndex }: { oldIndex?: number; newIndex?: number }) => {
          swapTab(oldIndex || 0, newIndex || 0)
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
        fixed: x.key === item.key ? !item.fixed : x.fixed
      })))
    }

    function showContextMenu (item: Components.Tabs.Item) {
      contextMenu.show([
        { id: 'close', label: '关闭', onClick: () => removeTabs([item]) },
        { id: 'close-other', label: '关闭其他', onClick: () => removeOther(item) },
        { id: 'close-right', label: '关闭到右侧', onClick: () => removeRight(item) },
        { id: 'close-left', label: '关闭到左侧', onClick: () => removeLeft(item) },
        { id: 'close-all', label: '全部关闭', onClick: () => removeAll() },
        { type: 'separator' },
        { id: 'fix', label: item.fixed ? '取消固定' : '固定', onClick: () => toggleFix(item) },
      ])
    }

    onMounted(() => {
      initSortable()
    })

    const tabList = computed(() => sortTabs(props.list))

    watch(tabList, (val) => {
      if (sortable && val) {
        nextTick(() => {
          sortable.sort(val.map(x => x.key))
        })
      }
    })

    return {
      refTabs,
      switchTab,
      showContextMenu,
      removeTabs,
      tabList
    }
  }
})
</script>

<style lang="scss" scoped>
.tabs {
  flex: none;
  height: 30px;
  background: var(--g-background-color);
  display: flex;
  z-index: 1;
  box-shadow: 0px 3px 3px -3px var(--g-color-100);
}

.tab {
  width: 100%;
  max-width: 150px;
  height: 100%;
  margin-bottom: -3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-right: 1px;
  color: var(--g-color-25);
  cursor: default;
  font-size: 12px;
  background: var(--g-color-93);
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
}

.close {
  color: var(--g-color-50);
  height: 18px;
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 5px;
}

.close:hover {
  color: var(--g-color-40);
  background: var(--g-color-80);
}

.tab.on-sort {
  background: var(--g-color-75);
}

.tab.fixed {
  font-weight: bold;
  border-left: 2px var(--g-color-70) solid;
}
</style>
