<template>
  <div class="tree-node">
    <details ref="refDir" @keydown.enter.prevent v-if="item.type === 'dir'" class="name" :title="item.name" :open="item.path === '/'">
      <summary
        class="folder"
        :style="{background: selected ? '#313131' : 'none'}"
        @contextmenu.exact.prevent.stop="showContextMenu(item)">
        <div class="item">
          <div class="item-label">
            {{ item.name === '/' ? currentRepoName : item.name }} <span class="count">({{item.children.length}})</span>
          </div>
          <div class="item-action">
            <svg-icon class="icon" color="hsla(0, 0%, 100%, .5)" name="folder-plus-solid" @click.exact.stop.prevent="createFile()" title="创建文件"></svg-icon>
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
import { useBus } from '../useful/bus'
import { useToast } from '../useful/toast'
import { useModal } from '../useful/modal'
import { useContextMenu } from '../useful/context-menu'
import File from '../useful/file'
import { Components } from '../types'
import Extensions from '../useful/extensions'
import SvgIcon from './SvgIcon.vue'
import DrawioPlugin from '../plugins/DrawioPlugin'

export default defineComponent({
  name: 'tree-node',
  components: { SvgIcon },
  props: ['item'],
  setup (props) {
    const store = useStore()
    const bus = useBus()
    const toast = useToast()
    const modal = useModal()
    const contextMenu = useContextMenu()

    const refDir = ref<any>(null)
    const refFile = ref<any>(null)
    const localMarked = ref<boolean | null>(null)

    watch(() => props.item, () => {
      localMarked.value = null
    })

    const { currentFile, currentRepo } = toRefs(store.state)

    async function createFile (path: string | null = null, content: string | null = null) {
      if (path === null) {
        const currentPath = props.item.type === 'dir' ? props.item.path : File.dirname(props.item.path)

        let filename = await modal.input({
          title: '创建文件(加密文件以 .c.md 结尾)',
          hint: '文件路径',
          content: '当前路径：' + currentPath,
          value: 'new.md',
          select: true
        })

        if (!filename) {
          return
        }

        if (!filename.endsWith('.md')) {
          filename = filename.replace(/\/$/, '') + '.md'
        }

        path = currentPath.replace(/\/$/, '') + '/' + filename
      }

      if (!path) {
        return
      }

      const filename = File.basename(path)

      const file = {
        type: 'file',
        repo: props.item.repo,
        path,
        name: filename,
      }

      if (content === null) {
        content = `# ${filename.replace(/\.md$/i, '')}\n`
      }

      bus.emit('file-new', { file, content })
    }

    async function duplicateFile () {
      let newPath = await modal.input({
        title: '重复文件',
        hint: '目标路径',
        content: '当前路径：' + props.item.path,
        value: props.item.path,
        // 默认选中文件名
        select: [props.item.path.lastIndexOf('/') + 1, props.item.name.lastIndexOf('.') > -1 ? props.item.path.lastIndexOf('.') : props.item.path.length, 'forward']
      })

      if (!newPath) {
        return
      }

      newPath = newPath.replace(/\/$/, '')

      const { content } = await File.read({ path: props.item.path, repo: props.item.repo })
      await createFile(newPath, content)
    }

    async function toggleMark () {
      if (props.item.marked) {
        localMarked.value = false
        await File.unmark(props.item)
        bus.emit('file-unmarked', props.item)
      } else {
        localMarked.value = true
        await File.mark(props.item)
        bus.emit('file-marked', props.item)
      }
    }

    function select (item: any) {
      if (item.type !== 'dir') {
        if (Extensions.supported(item.name)) {
          store.commit('setCurrentFile', item)
        } else {
          if (item.path.toLowerCase().endsWith('.drawio')) {
            DrawioPlugin.open(item)
          } else {
            File.openInOS(props.item)
          }
        }
      }
    }

    function revealInExplorer () {
      File.openInOS(props.item)
    }

    function revealInXterminal () {
      const path = currentRepo.value ? currentRepo.value.path + props.item.path : ''

      bus.emit('xterm-run', `--yank-note-run-command-cd-- ${path}`)
    }

    async function renameFile () {
      if (props.item.path === '/') {
        toast.show('warning', '不能移动根目录')
        return
      }

      let newPath = await modal.input({
        title: '移动文件',
        hint: '新的路径',
        content: '当前路径：' + props.item.path,
        value: props.item.path,
        // 默认选中文件名
        select: [props.item.path.lastIndexOf('/') + 1, props.item.name.lastIndexOf('.') > -1 ? props.item.path.lastIndexOf('.') : props.item.path.length, 'forward']
      })

      if (!newPath) {
        return
      }

      newPath = newPath.replace(/\/$/, '')
      const oldPath = props.item.path.replace(/\/$/, '')

      if (newPath === oldPath) {
        return
      }

      // TODO 文件统一处理
      // bus.emit('file-move', {file, newPath})
      const newFile = {
        name: File.basename(newPath),
        path: newPath,
        repo: props.item.repo,
        type: props.item.type
      }

      await File.move(props.item, newPath)
      // 重命名当前文件或父目录后，切换到新位置
      if (currentFile.value && (File.isSameFile(props.item, currentFile.value) || (props.item.type === 'dir' && File.isBelongTo(props.item.path, currentFile.value.path)))) {
        if (newFile.type === 'file') {
          store.commit('setCurrentFile', newFile)
        } else {
          // TODO 切换到新位置
          store.commit('setCurrentFile', null)
        }
      }

      bus.emit('file-moved', newFile)
    }

    async function deleteFile () {
      if (props.item.path === '/') {
        toast.show('warning', '不能删除根目录')
        return
      }

      const confirm = await modal.confirm({ title: '删除文件', content: `确定要删除 [${props.item.path}] 吗？` })

      if (confirm) {
        await File.delete(props.item)

        // 删除当前文件或父目录后，关闭当前文件
        if (currentFile.value && (File.isSameFile(props.item, currentFile.value) || (props.item.type === 'dir' && File.isBelongTo(props.item.path, currentFile.value.path)))) {
          store.commit('setCurrentFile', null)
        }

        bus.emit('file-deleted', props.item)
      }
    }

    function showContextMenu (item: any) {
      const menu: Components.ContextMenu.Item[] = [
        { id: 'delete', label: '删除', onClick: () => deleteFile() },
        { id: 'rename', label: '重命名 / 移动', onClick: () => renameFile() },
        { type: 'separator' },
        { id: 'openInOS', label: '在系统中打开', onClick: () => revealInExplorer() },
        { id: 'openInOS', label: '刷新目录树', onClick: () => bus.emit('tree-refresh') },
      ]

      if (item.type === 'dir') {
        contextMenu.show([
          { id: 'create', label: '创建新文件', onClick: () => createFile() },
          ...menu,
          { id: 'openInTerminal', label: '在终端中打开', onClick: () => revealInXterminal() }
        ])
      } else {
        // markdown 文件可以被标记
        if (props.item.path.endsWith('.md')) {
          const additional: Components.ContextMenu.Item[] = [
            { id: 'mark', label: props.item.marked ? '取消标记' : '标记文件', onClick: () => toggleMark() },
          ]

          // 非加密文件增加复制重复菜单
          if (!File.isEncryptedFile(props.item)) {
            additional.push({ id: 'duplicate', label: '重复文件', onClick: () => duplicateFile() })
          }

          contextMenu.show([
            ...additional,
            ...menu,
            { id: 'create', label: '当前目录创建新文件', onClick: () => createFile() }
          ])
        } else {
          contextMenu.show(menu)
        }
      }
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
      duplicateFile,
      toggleMark,
      select,
      revealInExplorer,
      revealInXterminal,
      createFile,
      renameFile,
      deleteFile
    }
  },
})
</script>

<style scoped>
.tree-node {
  border-left: 1px rgb(87, 87, 87) solid;
  font-size: 16px;
  line-height: 1.4em;
  padding-left: 1em;
}

.tree-node * {
  user-select: none;
}

summary.folder::-webkit-details-marker {
  flex: none;
  width: 10px;
  margin: 0;
  margin-right: 5px;
}

.folder {
  display: flex;
  align-items: center;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

summary > .item {
  width: calc(100% - 15px);
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
  color: #999999;
}

.item-action .icon:hover {
  background: #757575;
  color: #eee;
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
  background: #5d5d5d;
}

.file-name:hover {
  background: #5d5d5d;
}

.file-name:active {
  padding-left: 0.3em;
}

.marked {
  color: #ffc107;
}
</style>
