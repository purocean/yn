<template>
  <Tabs :list="list" v-model="current" @remove="removeTab"></Tabs>
</template>

<script>
import Tabs from './Tabs'

export default {
  name: 'file-tabs',
  components: { Tabs },
  data () {
    return {
      list: [
        { key: 'test1', label: 'TEST1', description: 'TTEESSTT2' },
        { key: 'test2', label: 'TEST2', description: 'TTEESSTT3' },
        { key: 'test3', label: 'TEST3', description: 'TTEESSTT4' },
        { key: 'test4', label: 'TEST4', description: 'TTEESSTT5' },
      ],
      current: 'test1'
    }
  },
  methods: {
    removeTab (item) {
      const list = this.list.filter(x => x.key !== item.key)
      if (list.length > 0) {
        setTimeout(() => {
          this.current = list[list.length - 1].key
        }, 50)
      }
      this.list = list
    }
  },
}
</script>
