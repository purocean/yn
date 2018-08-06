<template>
  <div class="repository-switch">
    <div class="current" v-if="current">仓库：{{current}}</div>
    <div class="current" v-else>未选择仓库</div>
    <ul class="list">
      <li v-for="(path, name) in list" :key="name" :title="path" @click="choose(name)">{{name}}</li>
    </ul>
  </div>
</template>

<script>
import file from '../file'

export default {
  name: 'repository-switch',
  components: {},
  props: {
  },
  data () {
    return {
      current: null,
      list: []
    }
  },
  created () {
    this.fetchRepositories()
  },
  mounted () {
  },
  beforeDestroy () {
  },
  methods: {
    fetchRepositories () {
      file.fetchRepositories(data => {
        this.list = data
        const keys = Object.keys(data)
        if (keys.length > 0) {
          this.choose(keys[0])
        }
      })
    },
    choose (name) {
      this.current = name
    }
  },
  watch: {
    current (val) {
      if (val) {
        this.$bus.emit('switch-repository', val)
      }
    }
  },
  computed: {
  }
}
</script>

<style scoped>
.repository-switch {
  width: 100px;
  cursor: pointer;
}

.current {
  padding: 0 .3em;
}

.repository-switch:hover {
  background: #333030;
}

.repository-switch:hover .list {
  display: block;
}

.list {
  width: 100px;
  margin: 0;
  list-style: none;
  background: #333030;
  padding: 4px 0;
  display: none;
  position: fixed;
  bottom: 20px;
  box-sizing: border-box;
}

.list li {
  padding: 4px .6em;
}

.list li:hover {
  background: #252525;
}
</style>
