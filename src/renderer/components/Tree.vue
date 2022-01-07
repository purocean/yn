<template>
  <aside
    v-if="hasRepo"
    class="side"
    @contextmenu.exact.prevent="showContextMenu"
    @dblclick="refresh"
    :title="$t('tree.db-click-refresh')">
    <div class="loading" v-if="tree === null"> {{$t('loading')}} </div>
    <template v-else>
      <TreeNode v-for="item in tree" :item="item" :key="item.path" />
    </template>
  </aside>
  <aside v-else class="side">
    <div class="add-repo-btn" @click="showSettingPanel">
      {{$t('tree.add-repo')}}
      <div class="add-repo-desc">{{$t('tree.add-repo-hint')}}</div>
    </div>
  </aside>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import { useContextMenu } from '@fe/support/ui/context-menu'
import { refreshTree } from '@fe/services/tree'
import { fetchSettings, showSettingPanel } from '@fe/services/setting'
import { useI18n } from '@fe/services/i18n'
import TreeNode from './TreeNode.vue'
import { createDir, createDoc } from '@fe/services/document'
import type { Components } from '@fe/types'

export default defineComponent({
  name: 'tree',
  components: { TreeNode },
  setup () {
    const { t } = useI18n()
    const store = useStore()
    const contextMenu = useContextMenu()

    const { currentRepo, tree } = toRefs(store.state)
    const hasRepo = computed(() => !!currentRepo.value)

    async function refresh () {
      await fetchSettings()
      await refreshTree()
    }

    function showContextMenu () {
      const items: Components.ContextMenu.Item[] = [
        {
          id: 'refresh',
          label: t('tree.context-menu.refresh'),
          onClick: refresh
        },
      ]

      if (currentRepo.value && tree.value && tree.value.length) {
        items.push(
          {
            id: 'create-doc',
            label: t('tree.context-menu.create-doc'),
            onClick: () => createDoc({ repo: currentRepo.value.name }, tree.value[0])
          },
          {
            id: 'create-dir',
            label: t('tree.context-menu.create-dir'),
            onClick: () => createDir({ repo: currentRepo.value.name }, tree.value[0])
          }
        )
      }

      contextMenu.show(items)
    }

    watch(currentRepo, refreshTree, { immediate: true })

    return {
      tree,
      refresh,
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
