<template>
  <div class="tree-node">
    <details v-if="item.type === 'dir'" class="name" :title="item.name + '\n\n' + dirTitle" ref="dir" :open="item.path === '/'">
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
    updateOpenStatus () {
      if (this.currentFile && this.item.type === 'dir' && this.currentFile.path.startsWith(this.item.path + '/')) {
        this.$refs.dir.open = true
      }
    },
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
      File.openInOS(this.item.repo, this.item.path)
    },
    revealInXterminal (item) {
      const path = this.currentRepo ? this.currentRepo.path + item.path : '~'

      this.$bus.emit('xterm-run', `cd '${path.replace('\'', '\\\'')}'`)
    },
    createFile () {
      let filename = window.prompt(`[${this.item.path}] 文件名`, 'new.md')

      if (!filename) {
        return
      }

      if (!filename.endsWith('.md')) {
        filename += '.md'
      }

      const path = this.item.path.replace(/\/$/, '') + '/' + filename
      File.write(this.item.repo, path, `# ${filename.replace(/\.md$/i, '')}\n`, 'new', () => {
        const newFile = { name: filename, path, repo: this.item.repo, type: this.item.type }
        this.$bus.emit('file-created', newFile)
        this.$store.commit('app/setCurrentFile', newFile)
      }, e => {
        alert(e.message)
      })
    },
    renameFile () {
      let newPath = window.prompt(`新文件名`, this.item.path)

      if (!newPath || newPath === this.item.path) {
        return
      }

      File.move(this.item.repo, this.item.path, newPath, () => {
        const newFile = { name: newPath.substr(newPath.lastIndexOf('/') + 1), path: newPath, repo: this.item.repo, type: this.item.type }
        this.$bus.emit('file-moved', newFile)
        if (this.currentFile.repo === this.item.repo && this.currentFile.path === this.item.path) {
          this.$store.commit('app/setCurrentFile', newFile)
        }
      })
    },
    deleteFile () {
      if (window.confirm(`确定要删除 [${this.item.path}] 吗？`)) {
        File.delete(this.item.repo, this.item.path, () => {
          this.$bus.emit('file-deleted', this.item)
          if (this.currentFile.repo === this.item.repo && this.currentFile.path === this.item.path) {
            this.$store.commit('app/setCurrentFile', null)
          }
        })
      }
    },
  },
  computed: {
    ...mapState('app', ['currentFile', 'currentRepo']),
    selected () {
      return this.currentFile && this.currentFile.path === this.item.path && this.currentFile.repo === this.item.repo
    }
  },
  watch: {
    currentFile () {
      this.updateOpenStatus()
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
