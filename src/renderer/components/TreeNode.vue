<template>
  <div class="tree-node">
    <details ref="refDir" @keydown.enter.prevent v-if="item.type === 'dir'" class="name" :title="item.name" :open="item.path === '/'">
      <summary
        :class="{folder: true, 'folder-selected': selected}"
        @contextmenu.exact.prevent.stop="showContextMenu(item)">
        <div class="item">
          <div class="item-label">
            {{ item.name === '/' ? currentRepoName : item.name }} <span class="count">({{item.children ? item.children.length : 0}})</span>
          </div>
          <div class="item-action">
            <svg-icon class="icon" name="folder-plus-solid" @click.exact.stop.prevent="createFile()" title="创建文件"></svg-icon>
          </div>
        </div>
      </summary>
      <tree-node v-for="x in item.children" :key="x.path" :item="x"></tree-node>
    </details>
    <div
      ref="refFile"
      v-else
      :class="{name: true, 'file-name': true, selected}"
      :title="item.name + '\n\n' + fileTitle"
      @click.exact.prevent="select(item)"
      @contextmenu.exact.prevent.stop="showContextMenu(item)">
      <div class="item">
        <div :class="{'item-label': true, marked}"> {{ item.name }} </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, PropType, ref, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import { useContextMenu } from '@fe/support/ui/context-menu'
import extensions from '@fe/others/extensions'
import { triggerHook } from '@fe/core/hook'
import { getContextMenuItems } from '@fe/services/tree'
import type { Components } from '@fe/types'
import { createDoc, openInOS, switchDoc } from '@fe/services/document'
import SvgIcon from './SvgIcon.vue'

export default defineComponent({
  name: 'tree-node',
  components: { SvgIcon },
  props: {
    item: {
      type: Object as PropType<Components.Tree.Node>,
      required: true,
    }
  },
  setup (props) {
    const store = useStore()
    const contextMenu = useContextMenu()

    const refDir = ref<any>(null)
    const refFile = ref<any>(null)
    const localMarked = ref<boolean | null>(null)

    watch(() => props.item, () => {
      localMarked.value = null
    })

    const { currentFile, currentRepo } = toRefs(store.state)

    async function createFile () {
      await createDoc({ repo: props.item.repo }, props.item)
    }

    async function select (node: Components.Tree.Node) {
      if (node.type !== 'dir') {
        if (extensions.supported(node.name)) {
          switchDoc(node)
        } else {
          if (!(await triggerHook('TREE_NODE_SELECT', { node }, { breakable: true }))) {
            openInOS(node)
          }
        }
      }
    }

    function showContextMenu (item: any) {
      contextMenu.show([...getContextMenuItems(item, { localMarked })])
    }

    const currentRepoName = computed(() => currentRepo.value?.name ?? '/')

    const selected = computed(() => {
      if (!currentFile.value) {
        return false
      }

      if (props.item.type === 'dir') {
        return currentFile.value.repo === props.item.repo && currentFile.value.path.startsWith(props.item.path + '/')
      }

      return currentFile.value.repo === props.item.repo && currentFile.value.path === props.item.path
    })

    const shouldOpen = computed(() => {
      return props.item.type === 'dir' && currentFile.value && currentFile.value.path.startsWith(props.item.path + '/') && currentFile.value.repo === props.item.repo
    })

    const marked = computed(() => localMarked.value ?? props.item.marked)

    watch(selected, val => {
      if (val && props.item.type === 'file') {
        nextTick(() => {
          refFile.value.scrollIntoViewIfNeeded()
        })
      }
    }, { immediate: true })

    watch(shouldOpen, val => {
      if (val) {
        nextTick(() => {
          refDir.value.open = true
        })
      }
    }, { immediate: true })

    const fileTitle = computed(() => [
      `创建于：${props.item.birthtime ? new Date(props.item.birthtime).toLocaleString() : '无'}`,
      `更新于：${props.item.mtime ? new Date(props.item.mtime).toLocaleString() : '无'}`,
    ].join('\n'))

    return {
      refDir,
      refFile,
      fileTitle,
      currentRepoName,
      selected,
      marked,
      showContextMenu,
      select,
      createFile,
    }
  },
})
</script>

<style scoped>
.tree-node {
  border-left: 1px var(--g-color-80) solid;
  font-size: 16px;
  line-height: 1.4em;
  padding-left: 1em;
  cursor: default;
}

.tree-node * {
  user-select: none;
}

summary {
  outline: none;
}

summary.folder::-webkit-details-marker,
summary.folder::marker {
  flex: none;
  width: 10px;
  margin: 0;
  margin-right: 5px;
}

.folder {
  align-items: center;
}

.folder:hover {
  background: var(--g-color-80);
}

.folder-selected {
  background: var(--g-color-85)
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

summary > .item {
  display: inline-flex;
  width: calc(100% - 20px);
}

.item-label {
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}

.item-action {
  display: none;
  align-content: center;
  justify-content: space-around;
  padding-right: 8px;
  flex: none;
}

.item-action .icon {
  padding: 4px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  color: var(--g-color-45);
}

.item-action .icon:hover {
  background: var(--glor-65);
  color: var(--g-color-35);
}

.item:hover .item-action {
  display: flex;
}

.item .count {
  color: var(--g-color-30);
  font-size: 12px;
  vertical-align: bottom;

  opacity: 0;
}

.item:hover .count {
  opacity: 1;
}

.name {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.file-name {
  padding-left: 0.2em;
  transition: 50ms ease;
}

.file-name.selected {
  background: var(--g-color-80);
}

.file-name:hover {
  background: var(--g-color-80);
}

.file-name:active {
  padding-left: 0.3em;
}

.marked {
  color: #569bd5;
}

.name {
  border-radius: var(--g-border-radius);
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
</style>
