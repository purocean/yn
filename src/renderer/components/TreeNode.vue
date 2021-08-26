<template>
  <div class="tree-node">
    <details ref="refDir" @keydown.enter.prevent v-if="item.type === 'dir'" class="name" :title="item.name" :open="item.path === '/'">
      <summary
        :class="{folder: true, 'folder-selected': selected}"
        @contextmenu.exact.prevent.stop="showContextMenu(item)">
        <div class="item">
          <div class="item-label">
            {{ item.name === '/' ? currentRepoName : item.name }} <span class="count">({{item.children.length}})</span>
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
import { computed, defineComponent, nextTick, ref, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import { useContextMenu } from '@fe/support/context-menu'
import Extensions from '@fe/support/extensions'
import { triggerHook } from '@fe/context/plugin'
import { getContextMenuItems, refreshTree } from '@fe/context/tree'
import { FLAG_DISABLE_XTERM } from '@fe/support/global-args'
import { Components } from '@fe/support/types'
import { getActionHandler } from '@fe/context/action'
import { createDoc, deleteDoc, duplicateDoc, isEncrypted, markDoc, moveDoc, openInOS, switchDoc, unmarkDoc } from '@fe/context/document'
import { join } from '@fe/utils/path'
import SvgIcon from './SvgIcon.vue'

export default defineComponent({
  name: 'tree-node',
  components: { SvgIcon },
  props: ['item'],
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

    async function duplicateFile () {
      await duplicateDoc(props.item)
    }

    async function toggleMark () {
      if (props.item.marked) {
        localMarked.value = false
        await unmarkDoc(props.item)
      } else {
        localMarked.value = true
        await markDoc(props.item)
      }
    }

    async function select (item: any) {
      if (item.type !== 'dir') {
        if (Extensions.supported(item.name)) {
          switchDoc(item)
        } else {
          if (!(await triggerHook('ON_TREE_NODE_SELECT', item))) {
            openInOS(item)
          }
        }
      }
    }

    function revealInExplorer () {
      openInOS(props.item)
    }

    function revealInXterminal () {
      const path = currentRepo.value ? join(currentRepo.value.path, props.item.path) : ''

      getActionHandler('xterm.run')(`--yank-note-run-command-cd-- ${path}`)
    }

    async function moveFile () {
      await moveDoc(props.item)
    }

    async function deleteFile () {
      await deleteDoc(props.item)
    }

    function buildContextMenu (item: any) {
      const menu: Components.ContextMenu.Item[] = [
        { type: 'separator' },
        { id: 'openInOS', label: '在系统中打开', onClick: () => revealInExplorer() },
        { id: 'refreshTree', label: '刷新目录树', onClick: refreshTree },
      ]

      if (item.path !== '/') {
        menu.unshift(...[
          { id: 'rename', label: '重命名 / 移动', onClick: () => moveFile() },
          { id: 'delete', label: '删除', onClick: () => deleteFile() },
        ] as Components.ContextMenu.Item[])
      }

      if (item.type === 'dir') {
        const other = FLAG_DISABLE_XTERM ? [] : [{ id: 'openInTerminal', label: '在终端中打开', onClick: () => revealInXterminal() }]

        return [
          { id: 'create', label: '创建新文件', onClick: () => createFile() },
          ...menu,
          ...other
        ]
      } else {
        // markdown 文件可以被标记
        if (props.item.path.endsWith('.md')) {
          const additional: Components.ContextMenu.Item[] = [
            { id: 'mark', label: props.item.marked ? '取消标记' : '标记文件', onClick: () => toggleMark() },
          ]

          // 非加密文件增加复制重复菜单
          if (!isEncrypted(props.item)) {
            additional.push({ id: 'duplicate', label: '重复文件', onClick: () => duplicateFile() })
          }

          return [
            ...additional,
            ...menu,
            { id: 'create', label: '当前目录创建新文件', onClick: () => createFile() }
          ]
        } else {
          return menu
        }
      }
    }

    function showContextMenu (item: any) {
      const buildInMenuItems = buildContextMenu(item)
      contextMenu.show(buildInMenuItems.concat(getContextMenuItems(item)))
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

.folder-selected {
  background: var(--g-color-90)
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
  cursor: pointer;
  padding: 0 2px;
  display: flex;
  align-items: center;
  height: 14px;
  width: 14px;
  border-radius: 2px;
  color: var(--g-color-50);
}

.item-action .icon:hover {
  background: var(--g-color-80);
  color: var(--g-color-50);
}

.item:hover .item-action {
  display: flex;
}

.item .count {
  color: #989898;
  font-size: 12px;
  vertical-align: text-bottom;

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
  background: var(--g-color-90);
}

.file-name:active {
  padding-left: 0.3em;
}

.marked {
  color: #569bd5;
}
</style>
