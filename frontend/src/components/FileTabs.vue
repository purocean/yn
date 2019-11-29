<template>
  <Tabs :list="list" :value="current" @remove="removeTabs" @switch="switchTab" @change-list="changeList"></Tabs>
</template>

<script>
import { mapState } from 'vuex'
import Tabs from './Tabs'
import File from '@/lib/file'

const blankUri = File.toUri(null)

export default {
  name: 'file-tabs',
  components: { Tabs },
  data () {
    return {
      list: [],
      current: blankUri
    }
  },
  methods: {
    changeList (list) {
      this.list = list
    },
    switchTab (item) {
      this.switchFile(item.payload.file)
    },
    removeTabs (items) {
      const keys = items.map(x => x.key)
      this.list = this.list.filter(x => keys.indexOf(x.key) === -1)
    },
    addTab (item) {
      const tab = this.list.find(x => item.key === x.key)

      // 没有打开此 Tab，新建一个
      if (!tab) {
        this.list = this.list.concat([item])
      }

      this.current = item.key
    },
    switchFile (file) {
      this.$store.commit('app/setCurrentFile', file)
    }
  },
  computed: {
    ...mapState('app', ['currentFile'])
  },
  watch: {
    currentFile: {
      immediate: true,
      handler (file) {
        const uri = File.toUri(file)
        const item = {
          key: uri,
          label: file ? file.name : '空白页',
          description: file ? file.path : '空白页',
          payload: { file },
        }

        this.addTab(item)
      }
    },
    list (list) {
      if (list.length < 1) {
        this.addTab({
          key: blankUri,
          label: '空白页',
          description: '空白页',
          payload: { file: null }
        })
      }

      const tab = list.find(x => x.key === this.current)
      if (!tab) {
        const currentFile = list.length > 0 ? list[list.length - 1].payload.file : null
        this.switchFile(currentFile)
      }
    }
  }
}
</script>
