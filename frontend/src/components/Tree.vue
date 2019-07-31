<template>
  <aside class="side" @dblclick="refresh" title="双击此处刷新目录树">
    <div class="loading" v-if="tree === null"> 加载中 </div>
    <template v-else>
      <TreeNode v-for="item in tree" :item="item" :key="item.path" />
    </template>
  </aside>
</template>

<script>
import { mapState } from 'vuex'
import TreeNode from './TreeNode'

export default {
  name: 'tree',
  components: { TreeNode },
  data () {
    return {
    }
  },
  created () {
    this.$bus.on('file-created', this.refresh)
    this.$bus.on('file-moved', this.refresh)
    this.$bus.on('file-deleted', this.refresh)
    this.$bus.on('file-uploaded', this.refresh)
    this.refresh()
  },
  beforeDestroy () {
    this.$bus.off('file-created', this.refresh)
    this.$bus.off('file-moved', this.refresh)
    this.$bus.off('file-deleted', this.refresh)
    this.$bus.off('file-uploaded', this.refresh)
  },
  methods: {
    refresh () {
      this.$store.dispatch('app/fetchTree', this.currentRepo)
    },
  },
  watch: {
    file (f) {
      this.$emit('input', f)
    },
    currentRepo () {
      this.refresh()
    }
  },
  computed: {
    ...mapState('app', ['currentRepo', 'tree']),
  }
}
</script>

<style scoped>
.side {
  color: #ddd;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow: auto;
}

.loading {
  font-size: 24px;
  text-align: center;
  padding-top: 50%;
  color: #848181;
}
</style>
