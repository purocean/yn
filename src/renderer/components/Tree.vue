<template>
  <aside v-if="hasRepo" class="side" @contextmenu.exact.prevent="showContextMenu" @dblclick="refreshRepo" title="双击此处刷新目录树">
    <div class="loading" v-if="tree === null"> 加载中 </div>
    <template v-else>
      <TreeNode v-for="item in tree" :item="item" :key="item.path" />
    </template>
  </aside>
  <aside v-else class="side">
    <div class="add-repo-btn" @click="showSettingPanel">
      添加仓库
      <div class="add-repo-desc">选择一个位置保存笔记</div>
    </div>
  </aside>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeMount, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import { useContextMenu } from '@fe/support/ui/context-menu'
import { refreshRepo, refreshTree } from '@fe/services/tree'
import TreeNode from './TreeNode.vue'
import { showSettingPanel } from '@fe/services/setting'

export default defineComponent({
  name: 'tree',
  components: { TreeNode },
  setup () {
    const store = useStore()
    const contextMenu = useContextMenu()

    const { currentRepo, tree, repositories } = toRefs(store.state)

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
      refreshTree()
    })

    watch(currentRepo, refreshTree)

    const hasRepo = computed(() => Object.keys(repositories.value).length > 0)

    return {
      tree,
      refreshRepo,
      showContextMenu,
      showSettingPanel,
      hasRepo,
    }
  },
})
</script>

<style scoped>
.side {
  color: var(--g-foreground-color);
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow: auto;
  background: var(--g-color-97);
  padding-bottom: 20px;
}

.loading {
  font-size: 24px;
  text-align: center;
  padding-top: 50%;
  color: var(--g-color-40);
}

.add-repo-desc {
  color: var(--g-color-40);
  text-align: center;
  font-size: 12px;
  padding-top: 10px;
}

.add-repo-btn {
  cursor: pointer;
  font-size: 20px;
  text-align: center;
  color: var(--g-color-20);
  margin-top: 20vh;
}
</style>
