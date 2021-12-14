<template>
  <div class="tree-node">
    <details
      ref="refDir"
      v-if="itemNode.type === 'dir'"
      class="name"
      :title="itemNode.path"
      :open="itemNode.path === '/'"
      @keydown.enter.prevent>
      <summary
        :class="{folder: true, 'folder-selected': selected}"
        :style="`padding-left: ${itemNode.level}em`"
        @contextmenu.exact.prevent.stop="showContextMenu(itemNode)">
        <div class="item">
          <div class="item-label">
            {{ itemNode.name === '/' ? currentRepoName : itemNode.name }} <span class="count">({{itemNode.children ? itemNode.children.length : 0}})</span>
          </div>
          <div class="item-action">
            <svg-icon class="icon" name="folder-plus-solid" @click.exact.stop.prevent="createFolder()" :title="$t('tree.context-menu.create-dir')"></svg-icon>
            <svg-icon class="icon" name="plus" @click.exact.stop.prevent="createFile()" :title="$t('tree.context-menu.create-doc')"></svg-icon>
          </div>
        </div>
      </summary>
      <tree-node v-for="x in (itemNode.children || [])" :key="x.path" :item="x"></tree-node>
    </details>
    <div
      ref="refFile"
      v-else
      :class="{name: true, 'file-name': true, selected}"
      :style="`padding-left: ${itemNode.level}em`"
      :title="itemNode.path + '\n\n' + fileTitle"
      @click.exact.prevent="select(item)"
      @contextmenu.exact.prevent.stop="showContextMenu(itemNode)">
      <div :class="{'item-label': true, marked, 'type-md': itemNode.name.endsWith('.md')}"> {{ itemNode.name }} </div>
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
import { createDir, createDoc, getMarked, openInOS, switchDoc } from '@fe/services/document'
import SvgIcon from './SvgIcon.vue'
import { useI18n } from '@fe/services/i18n'

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
    const { t } = useI18n()

    const store = useStore()
    const contextMenu = useContextMenu()

    const refDir = ref<any>(null)
    const refFile = ref<any>(null)
    const localMarked = ref<boolean | null>(null)

    const itemNode = computed(() => ({ ...props.item, marked: props.item.type === 'file' && getMarked(props.item) }))

    watch(() => props.item, () => {
      localMarked.value = null
    })

    const { currentFile, currentRepo } = toRefs(store.state)

    async function createFile () {
      await createDoc({ repo: props.item.repo }, props.item)
    }

    async function createFolder () {
      await createDir({ repo: props.item.repo }, props.item)
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

      if (itemNode.value.type === 'dir') {
        return currentFile.value.repo === itemNode.value.repo && currentFile.value.path.startsWith(itemNode.value.path + '/')
      }

      return currentFile.value.repo === itemNode.value.repo && currentFile.value.path === itemNode.value.path
    })

    const shouldOpen = computed(() => {
      return itemNode.value.type === 'dir' && currentFile.value && currentFile.value.path.startsWith(itemNode.value.path + '/') && currentFile.value.repo === itemNode.value.repo
    })

    const marked = computed(() => localMarked.value ?? itemNode.value.marked)

    watch(selected, val => {
      if (val && itemNode.value.type === 'file') {
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
      t('tree.created-at', itemNode.value.birthtime ? new Date(itemNode.value.birthtime).toLocaleString() : '-'),
      t('tree.updated-at', itemNode.value.mtime ? new Date(itemNode.value.mtime).toLocaleString() : '-'),
    ].join('\n'))

    return {
      itemNode,
      refDir,
      refFile,
      fileTitle,
      currentRepoName,
      selected,
      marked,
      showContextMenu,
      select,
      createFile,
      createFolder,
    }
  },
})
</script>

<style scoped>
.tree-node {
  font-size: 15px;
  line-height: 26px;
  cursor: default;
  color: var(--g-color-5);
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
  background: var(--g-color-90);
}

.folder-selected {
  background: var(--g-color-93)
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
  height: 26px;
}

.item-action {
  display: none;
  align-content: center;
  justify-content: space-around;
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
  background: var(--g-color-70);
  color: var(--g-color-25);
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
  border-left: 4px solid transparent;
}

.file-name.selected {
  background: var(--g-color-85);
  border-left-color: var(--g-color-50);
}

.file-name:hover {
  background: var(--g-color-85);
}

.file-name .item-label::before {
  display: inline-block;
  width: 12px;
  height: 24px;
  margin-right: 4px;
  content: url(data:image/svg+xml;base64,PHN2ZyBhcmlhLWhpZGRlbj0idHJ1ZSIgZm9jdXNhYmxlPSJmYWxzZSIgZGF0YS1wcmVmaXg9ImZhbCIgZGF0YS1pY29uPSJmaWxlLWNoYXJ0LXBpZSIgcm9sZT0iaW1nIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIiBjbGFzcz0ic3ZnLWlubGluZS0tZmEgZmEtZmlsZS1jaGFydC1waWUgZmEtdy0xMiI+PHBhdGggZmlsbD0iIzk5OSIgZD0iTTM2OS45IDk3Ljk4TDI4Ni4wMiAxNC4xYy05LTktMjEuMi0xNC4xLTMzLjg5LTE0LjFINDcuOTlDMjEuNS4xIDAgMjEuNiAwIDQ4LjA5djQxNS45MkMwIDQ5MC41IDIxLjUgNTEyIDQ3Ljk5IDUxMmgyODguMDJjMjYuNDkgMCA0Ny45OS0yMS41IDQ3Ljk5LTQ3Ljk5VjEzMS45N2MwLTEyLjY5LTUuMS0yNC45OS0xNC4xLTMzLjk5ek0yNTYuMDMgMzIuNTljMi44LjcgNS4zIDIuMSA3LjQgNC4ybDgzLjg4IDgzLjg4YzIuMSAyLjEgMy41IDQuNiA0LjIgNy40aC05NS40OFYzMi41OXptOTUuOTggNDMxLjQyYzAgOC44LTcuMiAxNi0xNiAxNkg0Ny45OWMtOC44IDAtMTYtNy4yLTE2LTE2VjQ4LjA5YzAtOC44IDcuMi0xNi4wOSAxNi0xNi4wOWgxNzYuMDR2MTA0LjA3YzAgMTMuMyAxMC43IDIzLjkzIDI0IDIzLjkzaDEwMy45OHYzMDQuMDF6TTE5MiAxOTJ2MTI4aDEyNy45OWMuMDEgMCAwLS4wMSAwLS4wMi0uMDEtNzAuNjgtNTcuMjktMTI3Ljk3LTEyNy45Ny0xMjcuOThIMTkyem0zMiAzNy40OWMyNy4yMiA5LjY2IDQ4Ljg1IDMxLjI4IDU4LjUgNTguNTFIMjI0di01OC41MXpNMTc2IDQxNmMtNDQuMTIgMC04MC0zNS44OS04MC04MCAwLTM4LjYzIDI3LjUyLTcwLjk1IDY0LTc4LjM4di0zMmMtNTQuMTMgNy44NS05NiA1NC4xMS05NiAxMTAuMzggMCA2MS43NSA1MC4yNSAxMTIgMTEyIDExMiA1Ni4yNyAwIDEwMi41NC00MS44NyAxMTAuMzgtOTZoLTMyYy03LjQzIDM2LjQ3LTM5Ljc0IDY0LTc4LjM4IDY0eiIgY2xhc3M9IiI+PC9wYXRoPjwvc3ZnPg==);
  vertical-align: middle;
}

.file-name .item-label.type-md::before {
  content: url(data:image/svg+xml;base64,PHN2ZyBhcmlhLWhpZGRlbj0idHJ1ZSIgZm9jdXNhYmxlPSJmYWxzZSIgZGF0YS1wcmVmaXg9ImZhbCIgZGF0YS1pY29uPSJmaWxlLWFsdCIgcm9sZT0iaW1nIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIiBjbGFzcz0ic3ZnLWlubGluZS0tZmEgZmEtZmlsZS1hbHQgZmEtdy0xMiI+PHBhdGggZmlsbD0iIzk5OSIgZD0iTTM2OS45IDk3LjlMMjg2IDE0QzI3NyA1IDI2NC44LS4xIDI1Mi4xLS4xSDQ4QzIxLjUgMCAwIDIxLjUgMCA0OHY0MTZjMCAyNi41IDIxLjUgNDggNDggNDhoMjg4YzI2LjUgMCA0OC0yMS41IDQ4LTQ4VjEzMS45YzAtMTIuNy01LjEtMjUtMTQuMS0zNHptLTIyLjYgMjIuN2MyLjEgMi4xIDMuNSA0LjYgNC4yIDcuNEgyNTZWMzIuNWMyLjguNyA1LjMgMi4xIDcuNCA0LjJsODMuOSA4My45ek0zMzYgNDgwSDQ4Yy04LjggMC0xNi03LjItMTYtMTZWNDhjMC04LjggNy4yLTE2IDE2LTE2aDE3NnYxMDRjMCAxMy4zIDEwLjcgMjQgMjQgMjRoMTA0djMwNGMwIDguOC03LjIgMTYtMTYgMTZ6bS00OC0yNDR2OGMwIDYuNi01LjQgMTItMTIgMTJIMTA4Yy02LjYgMC0xMi01LjQtMTItMTJ2LThjMC02LjYgNS40LTEyIDEyLTEyaDE2OGM2LjYgMCAxMiA1LjQgMTIgMTJ6bTAgNjR2OGMwIDYuNi01LjQgMTItMTIgMTJIMTA4Yy02LjYgMC0xMi01LjQtMTItMTJ2LThjMC02LjYgNS40LTEyIDEyLTEyaDE2OGM2LjYgMCAxMiA1LjQgMTIgMTJ6bTAgNjR2OGMwIDYuNi01LjQgMTItMTIgMTJIMTA4Yy02LjYgMC0xMi01LjQtMTItMTJ2LThjMC02LjYgNS40LTEyIDEyLTEyaDE2OGM2LjYgMCAxMiA1LjQgMTIgMTJ6IiBjbGFzcz0iIj48L3BhdGg+PC9zdmc+);
}

.file-name .item-label:active {
  transform: translateX(2px);
}

.marked {
  color: #569bd5;
}

.name {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
</style>
