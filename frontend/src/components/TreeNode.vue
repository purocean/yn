<template>
  <div class="tree-node">
    <details ref="dir" :open="item.path === '/'" v-if="item.type === 'dir'">
      <summary
        :style="{background: selected ? '#313131' : 'none'}"
        @dblclick="createFile()"
        @contextmenu.ctrl.prevent="renameFile"
        @contextmenu.shift.prevent="deleteFile"> {{ item.name }} </summary>
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
      v-else
      @click="select(item)"
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
      selected: false
    }
  },
  mounted () {
    this.$bus.on('editor-ready', () => {
      this.chooseFile(this.getSelectedFilePath())
    })
    this.$bus.on('choose-file', file => {
      this.chooseFile(file.path)
    })
  },
  methods: {
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
        window.open(`api/attachment/${encodeURIComponent(f.name)}?path=${encodeURIComponent(f.path)}`)
      }
    },
    createFile () {
      let filename = window.prompt(`[${this.item.path}] 文件名`, 'new.md')

      if (!filename) {
        return
      }

      if (!filename.endsWith('.md')) {
        filename += '.md'
      }

      const path = this.item.path + '/' + filename
      File.write(this.item.repo, path, `# ${filename.replace(/\.md$/i, '')}\n`, () => {
        this.$emit('change', path)
      }, e => {
        alert(e.message)
      }, true)
    },
    renameFile () {
      let newPath = window.prompt(`新文件名`, this.item.path)

      if (!newPath || newPath === this.item.path) {
        return
      }

      File.move(this.item.path, newPath, () => {
        this.$emit('move', this.item.path)
      })
    },
    deleteFile () {
      if (window.confirm(`确定要删除 [${this.item.path}] 吗？`)) {
        File.delete(this.item.path, () => {
          this.$emit('delete', this.item.path)
        })
      }
    },
    storeSelectedFilePath (path) {
      window.localStorage['selectedFile'] = path
    },
    getSelectedFilePath () {
      return window.localStorage['selectedFile'] || ''
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
</style>
