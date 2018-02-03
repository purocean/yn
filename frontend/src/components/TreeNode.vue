<template>
  <div class="tree-node" :style="`padding-left: 1em`">
    <details open v-if="item.type === 'dir'">
      <summary @contextmenu.prevent="createFile"> {{ item.name }} </summary>
      <tree-node @select="f => $emit('select', f)" @change="p => $emit('change', p)" v-for="x in item.children" :key="x.path" :item="x"></tree-node>
    </details>
    <span v-else @click="select"> {{ item.name }} </span>
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
    createFile (e) {
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
