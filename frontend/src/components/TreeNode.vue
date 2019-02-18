<template>
  <div class="tree-node">
    <details :title="dirTitle" ref="dir" :open="item.path === '/'" v-if="item.type === 'dir'">
      <summary
        class="dir-label"
        :style="{background: selected ? '#313131' : 'none'}"
        @dblclick.exact="createFile()"
        @dblclick.ctrl.exact="revealInExplorer()"
        @contextmenu.ctrl.prevent="renameFile"
        @contextmenu.shift.prevent="deleteFile"> {{ item.name }} <span class="count">({{item.children.length}})</span> </summary>
      <tree-node
        v-for="x in item.children"
        :key="x.path" :item="x"
        :slected-file="slectedFile"
        @select="select"
        @move="p => $emit('move', p)"
        @change="p => $emit('change', p)"
        @delete="p => $emit('delete', p)"></tree-node>
    </details>
    <div
      :title="fileTitle"
      v-else
      @click="select(item)"
      @dblclick.ctrl.exact="revealInExplorer()"
      @contextmenu.ctrl.prevent="renameFile"
      @contextmenu.shift.prevent="deleteFile"
      :style="{background: selected ? '#313131' : 'none'}"> {{ item.name }} </div>
  </div>
</template>

<script>
import File from '../file'

export default {
  name: 'tree-node',
  props: {
    item: Object,
    slectedFile: {
      type: Object,
      default: null
    }
  },
  data () {
    return {
      selected: false,
      dirTitle: [
        '"双击" 创建新文件',
        '"Ctrl + 右键" 重命名目录',
        '"Shift + 右键" 删除目录',
        '"Ctrl + 双击" 在操作系统中打开目录'
      ].join('\n'),
      fileTitle: [
        '"Ctrl + 右键" 重命名文件',
        '"Shift + 右键" 删除文件',
        '"Ctrl + 双击" 使用系统程序打开文件',
        '".c.md" 结尾的文件为加密文件'
      ].join('\n')
    }
  },
  created () {
    this.$bus.on('editor-ready', this.handleReady)
    this.$bus.on('choose-file', this.handleChooseFile)
  },
  beforeDestroy () {
    this.$bus.off('editor-ready', this.handleReady)
    this.$bus.off('choose-file', this.handleChooseFile)
  },
  mounted () {
    this.handleReady()
  },
  methods: {
    handleReady () {
      this.chooseFile(this.getSelectedFilePath())
    },
    handleChooseFile (file) {
      this.chooseFile(file.path)
    },
    chooseFile (filePath) {
      if (this.item.type === 'dir' && filePath.startsWith(this.item.path)) {
        this.$refs.dir.open = true
      } else if (filePath === this.item.path) {
        this.select(this.item)
      }
    },
    select (f) {
      if (f.name.endsWith('.md')) {
        this.$nextTick(() => {
          setTimeout(() => {
            this.selected = true
          })
        })

        this.$emit('select', f)
        this.storeSelectedFilePath(f.path)
      } else {
        window.open(`api/attachment/${encodeURIComponent(f.name)}?repo=${f.repo}&path=${encodeURIComponent(f.path)}`)
      }
    },
    revealInExplorer () {
      File.openInOS(this.item.repo, this.item.path)
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
        this.$emit('change', path)
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
        this.$emit('move', { oldPath: this.item.path, newPath })
      })
    },
    deleteFile () {
      if (window.confirm(`确定要删除 [${this.item.path}] 吗？`)) {
        File.delete(this.item.repo, this.item.path, () => {
          this.$emit('delete', this.item.path)
        })
      }
    },
    storeSelectedFilePath (path) {
      window.localStorage[`selectedFile_${this.item.repo}`] = path
    },
    getSelectedFilePath () {
      return window.localStorage[`selectedFile_${this.item.repo}`] || ''
    }
  },
  watch: {
    slectedFile () {
      this.selected = false
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
