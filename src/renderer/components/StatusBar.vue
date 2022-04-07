<template>
  <div class="status-bar">
    <StatusBarMenu class="left" position="left" />
    <div class="right">
      <div class="document-info">
        <span>L {{selectionInfo.line}},</span>
        <span>C {{selectionInfo.column}}</span>
        <span v-if="selectionInfo.selectedLength > 0">{{$t('status-bar.document-info.selected')}}: {{selectionInfo.selectedLength}}</span>
        <template v-else>
          <span>{{$t('status-bar.document-info.lines')}}: {{selectionInfo.lineCount}}</span>
          <span>{{$t('status-bar.document-info.chars')}}: {{selectionInfo.textLength}}</span>
        </template>
      </div>
      <StatusBarMenu class="right" position="right" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, toRefs } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from '@fe/services/i18n'
import StatusBarMenu from './StatusBarMenu.vue'

export default defineComponent({
  name: 'status-bar',
  components: { StatusBarMenu },
  setup () {
    useI18n()
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
  padding: 0;
  color: #eee;
  background: #38383a;
  font-size: 12px;
  line-height: 20px;
  height: 100%;
  display: flex;
  justify-content: space-between;
  overflow: hidden;
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
