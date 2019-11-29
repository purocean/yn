<template>
  <div class="tabs">
    <div
      v-for="item in list"
      :key="item.key"
      :class="{tab: true, current: item.key === value}"
      :title="item.description"
      @click="switchTab(item)">
      <div class="label">{{item.label}}</div>
      <div class="close" @click.prevent.stop="removeTab(item)">
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
    switchTab (item) {
      this.$emit('input', item.key)
      this.$emit('switch', item)
    },
    removeTab (item) {
      this.$emit('remove', item)
    }
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
