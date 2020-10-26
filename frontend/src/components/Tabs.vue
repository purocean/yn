<template>
  <div ref="refTabs" class="tabs">
    <div
      v-for="item in list"
      :key="item.key"
      :class="{tab: true, current: item.key === value}"
      :title="item.description"
      :data-key="item.key"
      @contextmenu.exact.prevent.stop="showContextMenu(item)"
      @click="switchTab(item)">
      <div class="label">{{item.label}}</div>
      <div class="close" @click.prevent.stop="removeTabs([item])">
        <svg-icon name="times-solid" title="关闭" style="width: 12px; height: 12px;" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Sortable from 'sortablejs'
import { defineComponent, onMounted, ref } from 'vue'
import { useContextMenu } from '../useful/context-menu'
import { Components } from '../types'
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
      removeTabs(props.list.filter(x => x.key !== item.key))
    }

    function removeRight (item: Components.Tabs.Item) {
      removeTabs(props.list.slice(props.list.findIndex(x => x.key === item.key) + 1))
    }

    function removeLeft (item: Components.Tabs.Item) {
      removeTabs(props.list.slice(0, props.list.findIndex(x => x.key === item.key)))
    }

    function removeAll () {
      removeTabs(props.list)
    }

    function swapTab (oldIndex: number, newIndex: number) {
      const list = props.list
      const tmp = list[oldIndex]
      list[oldIndex] = list[newIndex]
      list[newIndex] = tmp
      emit('change-list', list)
    }

    function showContextMenu (item: Components.Tabs.Item) {
      contextMenu.show([
        { id: 'close', label: '关闭', onClick: () => removeTabs([item]) },
        { id: 'close-other', label: '关闭其他', onClick: () => removeOther(item) },
        { id: 'close-right', label: '关闭到右侧', onClick: () => removeRight(item) },
        { id: 'close-left', label: '关闭到左侧', onClick: () => removeLeft(item) },
        { id: 'close-all', label: '全部关闭', onClick: () => removeAll() },
      ])
    }

    onMounted(() => {
      Sortable.create(refTabs.value!!, {
        animation: 250,
        ghostClass: 'on-sort',
        direction: 'horizontal',
        onEnd: ({ oldIndex, newIndex }: { oldIndex?: number; newIndex?: number }) => {
          swapTab(oldIndex || 0, newIndex || 0)
        }
      })
    })

    return {
      refTabs,
      switchTab,
      showContextMenu,
      removeTabs,
    }
  }
})
</script>

<style scoped>
.tabs {
  flex: none;
  height: 30px;
  background: #333;
  display: flex;
}

.tab {
  width: 100%;
  max-width: 150px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-right: 1px;
  color: #888;
  cursor: default;
  font-size: 12px;
  background: #282828;
  overflow: hidden;
}

.label {
  padding: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab.current {
  color: #eee;
  background: #1d1f21;
}

.close {
  color: #999;
  height: 18px;
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 5px;
}

.close:hover {
  color: rgb(212, 212, 212);
  background: #444;
}

.tab.on-sort {
  background: rgb(112, 112, 112);
}
</style>
