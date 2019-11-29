<template>
  <div class="tabs">
    <div
      v-for="item in list"
      :key="item.key"
      :class="{tab: true, current: item.key === value}"
      :title="item.description"
      @contextmenu.exact.prevent.stop="showContextMenu(item)"
      @click="switchTab(item)">
      <div class="label">{{item.label}}</div>
      <div class="close" @click.prevent.stop="removeTabs([item])">
        <y-icon class="close-icon" name="times" title="关闭"></y-icon>
      </div>
    </div>
  </div>
</template>

<script>
import 'vue-awesome/icons/times'

export default {
  name: 'tabs',
  props: {
    value: String,
    list: Array,
  },
  methods: {
    showContextMenu (item) {
      this.$contextMenu.show([
        { id: 'close', label: '关闭', onClick: () => this.removeTabs([item]) },
        { id: 'close-other', label: '关闭其他', onClick: () => this.removeOther(item) },
        { id: 'close-right', label: '关闭到右侧', onClick: () => this.removeRight(item) },
        { id: 'close-left', label: '关闭到左侧', onClick: () => this.removeLeft(item) },
        { id: 'close-all', label: '全部关闭', onClick: () => this.removeAll(item) },
      ])
    },
    switchTab (item) {
      if (item.key !== this.value) {
        this.$emit('input', item.key)
        this.$emit('switch', item)
      }
    },
    removeOther (item) {
      this.removeTabs(this.list.filter(x => x.key !== item.key))
    },
    removeRight (item) {
      this.removeTabs(this.list.slice(this.list.findIndex(x => x.key === item.key) + 1))
    },
    removeLeft (item) {
      this.removeTabs(this.list.slice(0, this.list.findIndex(x => x.key === item.key)))
    },
    removeAll () {
      this.removeTabs(this.list)
    },
    removeTabs (items) {
      this.$emit('remove', items)
    },
  },
}
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
  color: #aaa;
  background: #444;
}

.close-icon {
  zoom: .6;
}
</style>
