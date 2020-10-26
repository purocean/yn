<template>
  <aside class="side" @contextmenu.exact.prevent="showContextMenu" @dblclick="refreshRepo" title="双击此处刷新目录树">
    <div class="loading" v-if="tree === null"> 加载中 </div>
    <template v-else>
      <TreeNode v-for="item in tree" :item="item" :key="item.path" />
    </template>
  </aside>
</template>

<script lang="ts">
import { defineComponent, onBeforeMount, onBeforeUnmount, toRefs, watch } from 'vue'
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

    const { currentRepo, tree } = toRefs(store.state)

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

    return {
      tree,
      refreshRepo,
      showContextMenu,
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
  color: #848181;
}
</style>
