<template>
  <div class="status-bar">
    <StatusBarMenu class="left" position="left" />
    <div class="right">
      <StatusBarMenu class="right" position="right" />
      <div class="document-info">
        <span>行：{{documentInfo.line}}</span>
        <span>列：{{documentInfo.column}}</span>
        <span>总行数：{{documentInfo.lineCount}}</span>
        <span>字符数：{{documentInfo.textLength}}</span>
        <span v-if="documentInfo.selectedLength > 0">已选中：{{documentInfo.selectedLength}}</span>
      </div>
      <div class="action" @click="toggleSide" :title="getActionLabel('toggle-side')">切换侧栏</div>
      <div class="action" @click="toggleWrap" :title="getActionLabel('toggle-wrap')">切换换行</div>
      <div class="action" @click="toggleView" :title="getActionLabel('toggle-view')">切换预览</div>
      <div class="action" @click="toggleXterm" :title="getActionLabel('toggle-xterm')">切换终端</div>
      <div class="action" @click="toggleReadme" :title="getActionLabel('toggle-readme')">README</div>
      <div class="action" @click="toggleFeature">特色功能说明</div>
      <div class="action" @click="toggleRender">{{autoPreview ? '同步渲染-已开启' : '同步渲染-已关闭'}}</div>
      <svg-icon v-if="!autoPreview" class="action action-icon" name="sync-alt-solid" @click="rerenderView" title="强制重新渲染" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, toRefs } from 'vue'
import { useStore } from 'vuex'
import { useBus } from '../useful/bus'
import StatusBarMenu from './StatusBarMenu.vue'
import SvgIcon from '../components/SvgIcon.vue'
import { isAction, getActionLabel } from '../useful/shortcut'

export default defineComponent({
  name: 'status-bar',
  components: { StatusBarMenu, SvgIcon },
  setup () {
    const bus = useBus()
    const store = useStore()
    const { documentInfo, autoPreview } = toRefs(store.state)

    function toggleSide () {
      bus.emit('toggle-side')
    }

    function toggleView () {
      bus.emit('toggle-view')
    }

    function toggleXterm () {
      bus.emit('toggle-xterm')
    }

    function toggleFeature () {
      store.dispatch('showHelp', 'FEATURES.md')
    }

    function toggleReadme () {
      store.dispatch('showHelp', 'README.md')
    }

    function toggleWrap () {
      bus.emit('editor-toggle-wrap')
    }

    function toggleRender () {
      store.commit('setAutoPreview', !autoPreview.value)
    }

    function rerenderView () {
      bus.emit('view-rerender')
    }

    function keydownHandler (e: KeyboardEvent) {
      if (isAction(e, 'toggle-side')) {
        toggleSide()
        e.preventDefault()
        e.stopPropagation()
      }

      if (isAction(e, 'toggle-view')) {
        toggleView()
        e.preventDefault()
        e.stopPropagation()
      }

      if (isAction(e, 'toggle-xterm')) {
        toggleXterm()
        e.preventDefault()
        e.stopPropagation()
      }

      if (isAction(e, 'toggle-wrap')) {
        toggleWrap()
        e.preventDefault()
        e.stopPropagation()
      }

      if (isAction(e, 'toggle-readme')) {
        toggleReadme()
        e.preventDefault()
        e.stopPropagation()
      }
    }

    onMounted(() => {
      window.addEventListener('keydown', keydownHandler, true)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', keydownHandler)
    })

    return {
      documentInfo,
      autoPreview,
      toggleSide,
      toggleWrap,
      toggleView,
      toggleXterm,
      toggleReadme,
      toggleFeature,
      toggleRender,
      rerenderView,
      getActionLabel,
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
