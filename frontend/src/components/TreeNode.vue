<template>
  <div class="tree-node">
    <details ref="dir" @keydown.enter.prevent v-if="item.type === 'dir'" class="name" :title="item.name + '\n\n' + dirTitle" :open="item.path === '/'">
      <summary
        class="folder"
        :style="{background: selected ? '#313131' : 'none'}"
        @click.ctrl.exact.prevent="revealInExplorer"
        @click.ctrl.alt.exact.prevent="revealInXterminal"
        @contextmenu.exact.prevent.stop="showContextMenu(item)"
        @contextmenu.ctrl.exact.prevent.stop="renameFile"
        @contextmenu.shift.exact.prevent.stop="deleteFile">
        <div class="item">
          <div class="item-label">
            {{ item.name === '/' ? currentRepoName : item.name }} <span class="count">({{item.children.length}})</span>
          </div>
          <div class="item-action">
            <y-icon class="icon" name="folder-plus" @click.native.exact.stop.prevent="createFile()" title="创建文件"></y-icon>
            <!-- <EditIcon class="icon" @click.native.exact.stop.prevent="renameFile" title="重命名/移动（Ctrl + 右键）"></EditIcon>
            <ShareIcon class="icon" @click.native.exact.stop.prevent="revealInExplorer" title="系统中打开（Ctrl + 单击）"></ShareIcon>
            <TrashIcon class="icon" @click.native.exact.stop.prevent="deleteFile" title="删除（Shift + 右键）"></TrashIcon> -->
          </div>
        </div>
      </summary>
      <tree-node v-for="x in item.children" :key="x.path" :item="x"></tree-node>
    </details>
    <div
      ref="file"
      v-else
      :class="{name: true, 'file-name': true, selected}"
      :title="item.name + '\n\n' + fileTitle"
      @click.exact.prevent="select(item)"
      @click.ctrl.exact.prevent="revealInExplorer"
      @contextmenu.exact.prevent.stop="showContextMenu(item)"
      @contextmenu.ctrl.exact.prevent.stop="renameFile"
      @contextmenu.shift.exact.prevent.stop="deleteFile">
      <div class="item">
        <div :class="{'item-label': true, marked: !!item.marked}"> {{ item.name }} </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import File from '@/lib/file'
import Extensions from '@/lib/extensions'
import DrawioPlugin from '@/plugins/DrawioPlugin'
import 'vue-awesome/icons/folder-plus'

export default {
  name: 'tree-node',
  props: {
    item: Object,
  },
  data () {
    return {
      dirTitle: [
        '"Ctrl + 右键" 重命名目录',
        '"Shift + 右键" 删除目录',
        '"Ctrl + 单击" 在操作系统中打开目录',
        '"Ctrl + Alt + 单击" 在终端中打开'
      ].join('\n'),
      fileTitle: [
        `创建于：${this.item.birthtime ? new Date(this.item.birthtime).toLocaleString() : '无'}`,
        `更新于：${this.item.mtime ? new Date(this.item.mtime).toLocaleString() : '无'}`,
        '',
        '"Ctrl + 右键" 重命名文件',
        '"Shift + 右键" 删除文件',
        '"Ctrl + 单击" 使用系统程序打开文件',
        '".c.md" 结尾的文件为加密文件'
      ].join('\n')
    }
  },
  methods: {
    showContextMenu (item) {
      const menu = [
        { id: 'rename', label: '重命名 / 移动', onClick: () => this.renameFile() },
        { id: 'delete', label: '删除', onClick: () => this.deleteFile() },
        { type: 'separator' },
        { id: 'openInOS', label: '在系统中打开', onClick: () => this.revealInExplorer() },
        { id: 'openInOS', label: '刷新目录树', onClick: () => this.$bus.emit('tree-refresh') },
      ]

      if (item.type === 'dir') {
        this.$contextMenu.show([
          { id: 'create', label: '创建新文件', onClick: () => this.createFile() }
        ].concat(menu).concat([
          { id: 'openInTerminal', label: '在终端中打开', onClick: () => this.revealInXterminal() }
        ]))
      } else {
        // markdown 文件可以被标记
        if (this.item.path.endsWith('.md')) {
          const additional = [
            { id: 'mark', label: this.item.marked ? '取消标记' : '标记文件', onClick: () => this.toggleMark() },
          ]

          // 非加密文件增加复制重复菜单
          if (!File.isEncryptedFile(this.item)) {
            additional.push({ id: 'duplicate', label: '重复文件', onClick: () => this.duplicateFile() })
          }

          this.$contextMenu.show(additional.concat(menu, [{ id: 'create', label: '当前目录创建新文件', onClick: () => this.createFile() }]))
        } else {
          this.$contextMenu.show(menu)
        }
      }
    },
    async duplicateFile () {
      let newPath = await this.$modal.input({
        title: '重复文件',
        hint: '目标路径',
        content: '当前路径：' + this.item.path,
        value: this.item.path,
        // 默认选中文件名
        select: [this.item.path.lastIndexOf('/') + 1, this.item.name.lastIndexOf('.') > -1 ? this.item.path.lastIndexOf('.') : this.item.path.length, 'forward']
      })

      if (!newPath) {
        return
      }

      newPath = newPath.replace(/\/$/, '')

      const { content } = await File.read({ path: this.item.path, repo: this.item.repo })
      await this.createFile(newPath, content)
    },
    async toggleMark () {
      if (this.item.marked) {
        this.item.marked = false
        await File.unmark(this.item)
        this.$bus.emit('file-unmarked', this.item)
      } else {
        this.item.marked = true
        await File.mark(this.item)
        this.$bus.emit('file-marked', this.item)
      }
    },
    select (item) {
      if (item.type !== 'dir') {
        if (Extensions.supported(item.name)) {
          this.$store.commit('app/setCurrentFile', item)
        } else {
          if (item.path.toLowerCase().endsWith('.drawio')) {
            DrawioPlugin.open(item)
          } else {
            File.openInOS(this.item)
          }
        }
      }
    },
    revealInExplorer () {
      File.openInOS(this.item)
    },
    revealInXterminal () {
      const path = this.currentRepo ? this.currentRepo.path + this.item.path : ''

      this.$bus.emit('xterm-run', `--yank-note-run-command-cd-- ${path}`)
    },
    async createFile (path = null, content = null) {
      if (path === null) {
        const currentPath = this.item.type === 'dir' ? this.item.path : File.dirname(this.item.path)

        let filename = await this.$modal.input({
          title: '创建文件(加密文件以 .c.md 结尾)',
          hint: '文件路径',
          content: '当前路径：' + currentPath,
          value: 'new.md'
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
        repo: this.item.repo,
        path,
        name: filename,
      }

      if (content === null) {
        content = `# ${filename.replace(/\.md$/i, '')}\n`
      }

      this.$bus.emit('file-new', { file, content })
    },
    async renameFile () {
      if (this.item.path === '/') {
        this.$toast.show('warning', '不能移动根目录')
        return
      }

      let newPath = await this.$modal.input({
        title: '移动文件',
        hint: '新的路径',
        content: '当前路径：' + this.item.path,
        value: this.item.path,
        // 默认选中文件名
        select: [this.item.path.lastIndexOf('/') + 1, this.item.name.lastIndexOf('.') > -1 ? this.item.path.lastIndexOf('.') : this.item.path.length, 'forward']
      })

      if (!newPath) {
        return
      }

      newPath = newPath.replace(/\/$/, '')
      const oldPath = this.item.path.replace(/\/$/, '')

      if (newPath === oldPath) {
        return
      }

      // TODO 文件统一处理
      // this.$bus.emit('file-move', {file, newPath})
      const newFile = {
        name: File.basename(newPath),
        path: newPath,
        repo: this.item.repo,
        type: this.item.type
      }

      await File.move(this.item, newPath)
      // 重命名当前文件或父目录后，切换到新位置
      if (this.currentFile && (File.isSameFile(this.item, this.currentFile) || (this.item.type === 'dir' && File.isBelongTo(this.item.path, this.currentFile.path)))) {
        if (newFile.type === 'file') {
          this.$store.commit('app/setCurrentFile', newFile)
        } else {
          // TODO 切换到新位置
          this.$store.commit('app/setCurrentFile', null)
        }
      }

      this.$bus.emit('file-moved', newFile)
    },
    async deleteFile () {
      if (this.item.path === '/') {
        this.$toast.show('warning', '不能删除根目录')
        return
      }

      const confirm = await this.$modal.confirm({ title: '删除文件', content: `确定要删除 [${this.item.path}] 吗？` })

      if (confirm) {
        await File.delete(this.item)

        // 删除当前文件或父目录后，关闭当前文件
        if (this.currentFile && (File.isSameFile(this.item, this.currentFile) || (this.item.type === 'dir' && File.isBelongTo(this.item.path, this.currentFile.path)))) {
          this.$store.commit('app/setCurrentFile', null)
        }

        this.$bus.emit('file-deleted', this.item)
      }
    },
  },
  computed: {
    currentRepoName () {
      return this.currentRepo ? this.currentRepo.name : '/'
    },
    ...mapState('app', ['currentFile', 'currentRepo']),
    selected () {
      if (!this.currentFile) {
        return false
      }

      if (this.item.type === 'dir') {
        return this.currentFile.repo === this.item.repo && this.currentFile.path.startsWith(this.item.path + '/')
      }

      return this.currentFile.repo === this.item.repo && this.currentFile.path === this.item.path
    },
    shouldOpen () {
      return this.item.type === 'dir' && this.currentFile && this.currentFile.path.startsWith(this.item.path + '/') && this.currentFile.repo === this.item.repo
    }
  },
  watch: {
    selected: {
      immediate: true,
      handler (val) {
        if (val && this.item.type === 'file') {
          this.$nextTick(() => {
            this.$refs.file.scrollIntoViewIfNeeded()
          })
        }
      }
    },
    shouldOpen: {
      immediate: true,
      handler (val) {
        if (val) {
          this.$nextTick(() => {
            this.$refs.dir.open = true
          })
        }
      }
    }
  }
}
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
  height: 22px;
  border-radius: 2px;
  fill: #999999;
}

.item-action .icon:hover {
  background: #757575;
  fill: #eee;
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
