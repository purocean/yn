<template>
  <div class="tree-node">
    <details :open="item.name !== 'FILES'" v-if="item.type === 'dir'">
      <summary
        :style="{background: selected ? '#eee' : 'none'}"
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
      :style="{background: selected ? '#53ddf3' : 'none'}"> {{ item.name }} </div>
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
  },
  methods: {
    select (f) {
      if (f.name.endsWith('.md')) {
        this.$nextTick(() => {
          setTimeout(() => {
            this.selected = true
          })
        })

        this.$emit('select', f)
      } else {
        window.open(`api/attachment/${f.name}?path=${encodeURIComponent(f.path)}`)
      }
    },
    createFile () {
      let filename = window.prompt(`[${this.item.path}] 文件名`, 'new.md')

      if (!filename) {
        return
      }

      if (this.item.children.find(x => x.name === filename)) {
        window.alert('目标目录有同名文件存在')
        return
      }

      if (!filename.endsWith('.md')) {
        filename += '.md'
      }

      const path = this.item.path + '/' + filename
      File.write(path, '# 新文件', () => {
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
  border-left: 1px rgb(155, 155, 154) solid;
  font-size: 25px;
  line-height: 1.3em;
  padding-left: 1em;
}

.tree-node * {
  user-select: none;
}
</style>
