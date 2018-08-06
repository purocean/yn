<template>
  <div class="status-bar">
    <div class="document-info right">
      <span>行：{{documentInfo.line}}</span>
      <span>列：{{documentInfo.column}}</span>
      <span>总行数：{{documentInfo.lineCount}}</span>
      <span>字符数：{{documentInfo.textLength}}</span>
      <span v-if="documentInfo.selectedLength > 0">已选中：{{documentInfo.selectedLength}}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'status-bar',
  components: {},
  props: {
  },
  data () {
    return {
      documentInfo: {
        textLength: 0,
        selectedLength: 0,
        lineCount: 0,
        line: 0,
        column: 0
      }
    }
  },
  created () {
    this.$bus.on('change-document', this.handleChangeDocument)
  },
  mounted () {
  },
  beforeDestroy () {
    this.$bus.off('change-document', this.handleChangeDocument)
  },
  methods: {
    handleChangeDocument (data) {
      this.documentInfo = data
    }
  },
  watch: {
  },
  computed: {
  }
}
</script>

<style scoped>
.right {
  float: right;
}

.status-bar {
  box-sizing: border-box;
  padding: 0 1em;
  color: #eee;
  background: #4e4e4e;
  font-size: 12px;
  line-height: 20px;
}

.document-info > span {
  display: inline-block;
  padding: 0 .2em;
}
</style>
