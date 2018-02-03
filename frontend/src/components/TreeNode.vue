<template>
  <div class="tree-node" :style="`padding-left: 1em`">
    <details open v-if="item.type === 'dir'">
      <summary  @dblclick="createFile()" @contextmenu.shift.prevent="deleteFile"> {{ item.name }} </summary>
      <tree-node @select="f => $emit('select', f)" @change="p => $emit('change', p)" v-for="x in item.children" :key="x.path" :item="x"></tree-node>
    </details>
    <div v-else @click="select" @contextmenu.prevent="deleteFile"> {{ item.name }} </div>
  </div>
</template>

<script>
import File from '../file'

export default {
  name: 'tree-node',
  props: {
    item: Object
  },
  mounted () {
  },
  methods: {
    select () {
      this.$emit('select', this.item)
    },
    createFile () {
      const filename = window.prompt(`[${this.item.path}] 文件名`, 'new.md')

      if (!filename) {
        return
      }

      if (this.item.children.find(x => x.name === filename)) {
        window.alert('目标目录有同名文件存在')
        return
      }

      if (!filename.endsWith('.md')) {
        window.alert('文件名必须以 .md 结尾')
        return
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
  }
}
</script>

<style scoped>
.tree-node {
  border-left: 1px rgb(155, 155, 154) solid;
  font-size: 25px;
  line-height: 1.3em;
}

.tree-node * {
  user-select: none;
}
</style>
