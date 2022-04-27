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
      @mouseup="e => e.button === 1 ? removeTabs([item]) : null"
      @click="switchTab(item)">
      <div class="label">{{item.label}}</div>
      <div v-if="item.fixed" class="icon" :title="$t('tabs.unpin')" @click.prevent.stop="toggleFix(item)">
        <svg-icon name="thumbtack" style="width: 10px; height: 10px;" />
      </div>
      <div v-else class="icon" :title="$t('close')" @click.prevent.stop="removeTabs([item])">
        <svg-icon name="times" style="width: 12px; height: 12px;" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Sortable from 'sortablejs'
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import { useContextMenu } from '@fe/support/ui/context-menu'
import { useI18n } from '@fe/services/i18n'
import type { Components } from '@fe/types'
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
    const { t } = useI18n()

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
        fixed: x.key === item.key ? !item.fixed : x.fixed
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

    onMounted(() => {
      initSortable()
      window.addEventListener('keydown', handleKeydown, true)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleKeydown, true)
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

    return {
      refTabs,
      switchTab,
      showContextMenu,
      removeTabs,
      tabList,
      toggleFix,
    }
  }
})
</script>

<style lang="scss" scoped>
.tabs {
  flex: none;
  height: 30px;
  background: var(--g-color-87);
  display: flex;
  z-index: 1;
  box-shadow: 0px 3px 3px -3px var(--g-color-90);
}

.tab {
  width: 100%;
  max-width: 150px;
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
</style>
