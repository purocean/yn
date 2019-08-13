<template>
  <div class="tree-node">
    <details ref="dir" @keydown.enter.prevent v-if="item.type === 'dir'" class="name" :title="item.name + '\n\n' + dirTitle" :open="item.path === '/'">
      <summary
        class="folder"
        :style="{background: selected ? '#313131' : 'none'}"
        @click.ctrl.exact.prevent="revealInExplorer"
        @click.ctrl.alt.exact.prevent="revealInXterminal(item)"
        @contextmenu.ctrl.prevent="renameFile"
        @contextmenu.shift.prevent="deleteFile">
        <div class="item">
          <div class="item-label">
            {{ item.name }} <span class="count">({{item.children.length}})</span>
          </div>
          <div class="item-action">
            <FileIcon class="icon" @click.native.exact.stop.prevent="createFile" title="创建文件"></FileIcon>
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
      @click.ctrl.exact.prevent="revealInExplorer()"
      @contextmenu.ctrl.prevent="renameFile"
      @contextmenu.shift.prevent="deleteFile">
      <div class="item">
        <div class="item-label"> {{ item.name }} </div>
        <div class="item-action">
          <!-- <BookmarkIcon class="icon" @click.native.exact.stop.prevent="" title="标记"></BookmarkIcon> -->
          <!-- <EditIcon class="icon" @click.native.exact.stop.prevent="renameFile" title="重命名/移动（Ctrl + 右键）"></EditIcon>
          <ShareIcon class="icon" @click.native.exact.stop.prevent="revealInExplorer" title="系统中打开（Ctrl + 单击）"></ShareIcon>
          <TrashIcon class="icon" @click.native.exact.stop.prevent="deleteFile" title="删除（Shift + 右键）"></TrashIcon> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import File from '@/lib/file'
import DrawioPlugin from '@/plugins/DrawioPlugin'
import FileIcon from 'vue-ionicons/dist/ios-document.vue'
import ShareIcon from 'vue-ionicons/dist/ios-share-alt.vue'
import EditIcon from 'vue-ionicons/dist/ios-brush.vue'
import TrashIcon from 'vue-ionicons/dist/ios-trash.vue'
// import BookmarkIcon from 'vue-ionicons/dist/ios-bookmark.vue'

export default {
  name: 'tree-node',
  components: { FileIcon, ShareIcon, EditIcon, TrashIcon },
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
        '"Ctrl + 右键" 重命名文件',
        '"Shift + 右键" 删除文件',
        '"Ctrl + 单击" 使用系统程序打开文件',
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
          if (item.path.toLowerCase().endsWith('.drawio')) {
            DrawioPlugin.open(item)
          } else {
            File.openInOS(this.item)
            // window.open(`api/attachment/${encodeURIComponent(item.name)}?repo=${item.repo}&path=${encodeURIComponent(item.path)}`)
          }
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
  position: relative;
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
</style>
