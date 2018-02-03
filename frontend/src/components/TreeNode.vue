<template>
  <div class="tree-node">
    <details open v-if="item.type === 'dir'">
      <summary
        :style="{background: selected ? '#eee' : 'none'}"
        @dblclick="createFile()"
        @contextmenu.shift.prevent="deleteFile"> {{ item.name }} </summary>
      <tree-node
        @select="select"
        @change="p => $emit('change', p)"
        v-for="x in item.children"
        :key="x.path" :item="x"
        :slected-file="slectedFile"></tree-node>
    </details>
    <div
      v-else
      @click="select(item)"
      @contextmenu.prevent="deleteFile"
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
      this.$nextTick(() => {
        setTimeout(() => {
          this.selected = true
        })
      })

      this.$emit('select', f)
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
      })
    },
    deleteFile () {
      if (window.confirm(`确定要删除 [${this.item.path}] 吗？`)) {
        File.delete(this.item.path, () => {
          this.$emit('change')
        })
      }
    }
  },
  watch: {
    slectedFile () {
      this.selected = false
      console.log('xxxxxxxxx')
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
