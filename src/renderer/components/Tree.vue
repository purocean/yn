<template>
  <aside
    v-if="hasRepo"
    class="side"
    @contextmenu.exact.prevent="showContextMenu"
    @dblclick="refresh"
    ref="asideRef"
    :title="$t('tree.db-click-refresh')">
    <div class="loading" v-if="tree === null"> {{$t('loading')}} </div>
    <template v-else>
      <TreeNode v-for="item in tree" :item="item" :key="item.path" />
    </template>
  </aside>
  <aside v-else class="side">
    <div class="add-repo-btn" @click="showSettingPanel()">
      {{$t('tree.add-repo')}}
      <div class="add-repo-desc">{{$t('tree.add-repo-hint')}}</div>
    </div>
  </aside>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, ref, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import { useContextMenu } from '@fe/support/ui/context-menu'
import { refreshTree } from '@fe/services/tree'
import { fetchSettings, showSettingPanel } from '@fe/services/setting'
import { registerAction, removeAction } from '@fe/core/action'
import { useI18n } from '@fe/services/i18n'
import { createDir, createDoc } from '@fe/services/document'
import type { Components } from '@fe/types'
import TreeNode from './TreeNode.vue'

export default defineComponent({
  name: 'tree',
  components: { TreeNode },
  setup () {
    const { t } = useI18n()
    const store = useStore()
    const contextMenu = useContextMenu()
    const asideRef = ref<HTMLElement>()

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

    function revealCurrentNode () {
      const currentNode = asideRef.value?.querySelector('.tree-node > .name.selected')
      currentNode?.scrollIntoView({ block: 'center' })
    }

    watch(currentRepo, refreshTree, { immediate: true })

    registerAction({
      name: 'tree.reveal-current-node',
      handler: revealCurrentNode
    })

    onBeforeUnmount(() => {
      removeAction('tree.reveal-current-node')
    })

    return {
      asideRef,
      tree,
      refresh,
      showContextMenu,
      showSettingPanel,
      hasRepo,
    }
  },
})
</script>

<style lang="scss" scoped>
.side {
  color: var(--g-foreground-color);
  contain: strict;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow: auto;
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

aside > ::v-deep(.tree-node) {
  & > details[data-count="0"] > summary .item-action,
  & > details[data-count="1"] > summary .item-action {
    display: flex;
  }

  details[data-count="0"][open] > summary::after {
    content: '(Empty)';
    font-style: italic;
    padding-left: 1em;
    line-height: 20px;
    display: block;
    height: 20px;
    color: var(--g-color-40);
    font-size: 14px;
  }
}
</style>
