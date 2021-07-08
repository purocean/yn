<template>
  <div class="status-bar">
    <StatusBarMenu class="left" position="left" />
    <div class="right">
      <div class="document-info">
        <span>行：{{selectionInfo.line}}</span>
        <span>列：{{selectionInfo.column}}</span>
        <span>总行数：{{selectionInfo.lineCount}}</span>
        <span>字符数：{{selectionInfo.textLength}}</span>
        <span v-if="selectionInfo.selectedLength > 0">已选中：{{selectionInfo.selectedLength}}</span>
      </div>
      <StatusBarMenu class="right" position="right" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, toRefs } from 'vue'
import { useStore } from 'vuex'
import StatusBarMenu from './StatusBarMenu.vue'

export default defineComponent({
  name: 'status-bar',
  components: { StatusBarMenu },
  setup () {
    const store = useStore()
    const { selectionInfo, autoPreview } = toRefs(store.state)

    return { selectionInfo, autoPreview }
  },
})
</script>

<style scoped>
.left {
  display: flex;
}

.right {
  display: flex;
}

.status-bar {
  box-sizing: border-box;
  padding: 0 1em;
  color: #eee;
  background: #4e4e4e;
  font-size: 12px;
  line-height: 20px;
  height: 100%;
  display: flex;
  justify-content: space-between;
}

.document-info {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 0.3em;
}

.document-info > span {
  display: inline-block;
  padding: 0 .2em;
}

.action {
  padding: 0 .5em;
  /* margin-left: 1em; */
  cursor: pointer;
  user-select: none;
  flex: none;
}

.action-icon {
  width: 10px;
  height: 20px;
}

.action:hover {
  background: #2e2e2e;
}
</style>
