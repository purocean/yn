<template>
  <aside v-if="hasRepo" class="side" @contextmenu.exact.prevent="showContextMenu" @dblclick="refreshRepo" title="双击此处刷新目录树">
    <div class="loading" v-if="tree === null"> 加载中 </div>
    <template v-else>
      <TreeNode v-for="item in tree" :item="item" :key="item.path" />
    </template>
  </aside>
  <aside v-else class="side">
    <div class="add-repo-btn" @click="showSetting">
      添加仓库
      <div class="add-repo-desc">选择一个位置保存笔记</div>
    </div>
  </aside>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeMount, onBeforeUnmount, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import { useBus } from '../useful/bus'
import { useContextMenu } from '../useful/context-menu'
import TreeNode from './TreeNode.vue'

export default defineComponent({
  name: 'tree',
  components: { TreeNode },
  setup () {
    const bus = useBus()
    const store = useStore()
    const contextMenu = useContextMenu()

    const { currentRepo, tree, repositories } = toRefs(store.state)

    function refreshTree () {
      store.dispatch('fetchTree', currentRepo.value)
    }

    function refreshRepo () {
      refreshTree()
      store.dispatch('fetchRepositories')
    }

    function showContextMenu () {
      contextMenu.show([
        {
          id: 'refresh',
          label: '刷新目录树',
          onClick: refreshRepo
        }
      ])
    }

    function showSetting () {
      bus.emit('show-setting')
    }

    onBeforeMount(() => {
      bus.on('file-created', refreshTree)
      bus.on('file-moved', refreshTree)
      bus.on('file-deleted', refreshTree)
      bus.on('file-uploaded', refreshTree)
      bus.on('file-marked', refreshTree)
      bus.on('file-unmarked', refreshTree)
      bus.on('tree-refresh', refreshTree)
      refreshTree()
    })

    onBeforeUnmount(() => {
      bus.off('file-created', refreshTree)
      bus.off('file-moved', refreshTree)
      bus.off('file-deleted', refreshTree)
      bus.off('file-uploaded', refreshTree)
      bus.off('file-marked', refreshTree)
      bus.off('file-unmarked', refreshTree)
      bus.off('tree-refresh', refreshTree)
    })

    watch(currentRepo, refreshTree)

    const hasRepo = computed(() => Object.keys(repositories.value).length > 0)

    return {
      tree,
      refreshRepo,
      showContextMenu,
      showSetting,
      hasRepo
    }
  },
})
</script>

<style scoped>
.side {
  color: #ddd;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow: auto;
}

.loading {
  font-size: 24px;
  text-align: center;
  padding-top: 50%;
  color: #818284;
}

.add-repo-desc {
  color: #69696b;
  text-align: center;
  font-size: 14px;
  padding-top: 10px;
}

.add-repo-btn {
  cursor: pointer;
  font-size: 24px;
  text-align: center;
  color: #818284;
  margin-top: 20vh;
}
</style>
