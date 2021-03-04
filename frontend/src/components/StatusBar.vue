<template>
  <div class="status-bar">
    <StatusBarMenu class="left" position="left" />
    <div class="right">
      <div class="document-info">
        <span>行：{{documentInfo.line}}</span>
        <span>列：{{documentInfo.column}}</span>
        <span>总行数：{{documentInfo.lineCount}}</span>
        <span>字符数：{{documentInfo.textLength}}</span>
        <span v-if="documentInfo.selectedLength > 0">已选中：{{documentInfo.selectedLength}}</span>
      </div>
      <StatusBarMenu class="right" position="right" />
      <div class="action" @click="toggleRender">{{autoPreview ? '同步渲染-已开启' : '同步渲染-已关闭'}}</div>
      <svg-icon v-if="!autoPreview" class="action action-icon" name="sync-alt-solid" @click="rerenderView" title="强制重新渲染" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, toRefs } from 'vue'
import { useStore } from 'vuex'
import { useBus } from '../useful/bus'
import StatusBarMenu from './StatusBarMenu.vue'
import SvgIcon from '../components/SvgIcon.vue'

export default defineComponent({
  name: 'status-bar',
  components: { StatusBarMenu, SvgIcon },
  setup () {
    const bus = useBus()
    const store = useStore()
    const { documentInfo, autoPreview } = toRefs(store.state)

    function toggleRender () {
      store.commit('setAutoPreview', !autoPreview.value)
    }

    function rerenderView () {
      bus.emit('view-rerender')
    }

    return {
      documentInfo,
      autoPreview,
      toggleRender,
      rerenderView,
    }
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
