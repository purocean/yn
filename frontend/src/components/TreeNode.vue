<template>
  <div class="tree-node" :style="`padding-left: 1em`">
    <details open v-if="item.type === 'dir'">
      <summary> {{ item.name }} </summary>
      <tree-node @select="f => $emit('select', f)" v-for="x in item.children" :key="x.path" :item="x"></tree-node>
    </details>
    <span v-else @click="select"> {{ item.name }} </span>
  </div>
</template>

<script>
export default {
  name: 'tree-node',
  props: {
    item: Object
  },
  mounted () {
    console.log(this.item.children)
  },
  methods: {
    select () {
      this.$emit('select', this.item)
    }
  }
}
</script>

<style scoped>
.tree-node {
  border-left: 1px rgb(155, 155, 154) solid;
}

.tree-node * {
  user-select: none;
}
</style>
