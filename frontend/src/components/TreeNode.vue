<template>
  <div class="tree-node" :style="`padding-left: ${level}em`">
    <details open v-if="item.type === 'dir'">
      <summary> {{ item.name }} </summary>
      <tree-node v-for="x in item.children" :key="x.path" :level="level + 1" :item="x"></tree-node>
    </details>
    <span v-else @click="select"> {{ item.name }} </span>
  </div>
</template>

<script>
export default {
  name: 'tree-node',
  props: {
    item: Object,
    level: {
      type: Number,
      default: 0
    }
  },
  mounted () {
    console.log(this.item.children)
  },
  methods: {
    select () {
      alert(this.item.path)
    }
  }
}
</script>

<style scoped>
.tree-node * {
  user-select: none;
}
</style>
