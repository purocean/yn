<template>
  <div class="tree-node">
    <details @keydown.enter.prevent v-if="item.type === 'dir'" class="name" :title="item.name + '\n\n' + dirTitle" ref="dir" :open="item.path === '/'">
      <summary
        class="dir-label"
        :style="{background: selected ? '#313131' : 'none'}"
        @dblclick.exact="createFile()"
        @dblclick.ctrl.exact="revealInExplorer()"
        @click.ctrl.alt.exact.prevent="revealInXterminal(item)"
        @contextmenu.ctrl.prevent="renameFile"
        @contextmenu.shift.prevent="deleteFile"> {{ item.name }} <span class="count">({{item.children.length}})</span> </summary>
      <tree-node v-for="x in item.children" :key="x.path" :item="x"></tree-node>
    </details>
    <div
      v-else
      class="name"
      :title="item.name + '\n\n' + fileTitle"
      @click="select(item)"
      @dblclick.ctrl.exact="revealInExplorer()"
      @contextmenu.ctrl.prevent="renameFile"
      @contextmenu.shift.prevent="deleteFile"
      :style="{background: selected ? '#313131' : 'none'}"> {{ item.name }} </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import File from '@/lib/file'

export default {
  name: 'tree-node',
  props: {
    item: Object,
  },
  data () {
    return {
      dirTitle: [
        '"双击" 创建新文件',
        '"Ctrl + 右键" 重命名目录',
        '"Shift + 右键" 删除目录',
        '"Ctrl + 双击" 在操作系统中打开目录',
        '"Ctrl + Alt + 单击" 在终端中打开'
      ].join('\n'),
      fileTitle: [
        '"Ctrl + 右键" 重命名文件',
        '"Shift + 右键" 删除文件',
        '"Ctrl + 双击" 使用系统程序打开文件',
        '".c.md" 结尾的文件为加密文件'
      ].join('\n')
    }
  },
  methods: {
    select (item) {
      if (item.type !== 'dir') {
        if (item.name.endsWith('.md')) {
          this.$store.commit('app/setCurrentFile', item)
        } else {
          window.open(`api/attachment/${encodeURIComponent(item.name)}?repo=${item.repo}&path=${encodeURIComponent(item.path)}`)
        }
      }
    },
    revealInExplorer () {
      File.openInOS(this.item)
    },
    revealInXterminal (item) {
      const path = this.currentRepo ? this.currentRepo.path + item.path : '~'

      this.$bus.emit('xterm-run', `cd '${path.replace('\'', '\\\'')}'`)
    },
    async createFile () {
      let filename = await this.$modal.input({
        title: '创建文件(加密文件以 .c.md 结尾)',
        hint: '文件路径',
        content: '当前路径：' + this.item.path,
        value: 'new.md'
      })

      if (!filename) {
        return
      }

      if (!filename.endsWith('.md')) {
        filename = filename.replace(/\/$/, '') + '.md'
      }

      const path = this.item.path.replace(/\/$/, '') + '/' + filename

      const file = {
        type: 'file',
        repo: this.item.repo,
        path,
        name: filename,
      }

      this.$bus.emit('file-new', { file, content: `# ${filename.replace(/\.md$/i, '')}\n` })
    },
    async renameFile () {
      let newPath = await this.$modal.input({
        title: '移动文件',
        hint: '新的路径',
        content: '当前路径：' + this.item.path,
        value: this.item.path,
        select: [this.item.path.lastIndexOf('/') + 1, this.item.path.length, 'forward']
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
    ...mapState('app', ['currentFile', 'currentRepo']),
    selected () {
      return this.currentFile && this.currentFile.path === this.item.path && this.currentFile.repo === this.item.repo
    },
    shouldOpen () {
      return this.currentFile && this.item.type === 'dir' && this.currentFile.path.startsWith(this.item.path + '/')
    }
  },
  watch: {
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
  line-height: 1.3em;
  padding-left: 1em;
}

.tree-node * {
  user-select: none;
}

.name {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.dir-label .count {
  color: #989898;
  font-size: 12px;
  vertical-align: text-bottom;

  opacity: 0;
}

.dir-label:hover .count {
  opacity: 1;
}
</style>
