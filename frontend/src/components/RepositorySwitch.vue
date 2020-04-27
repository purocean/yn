<template>
  <div class="repository-switch">
    <div class="current" v-if="currentRepo">仓库：{{currentRepo.name}}</div>
    <div class="current" v-else>未选择仓库</div>
    <ul class="list">
      <li v-for="(path, name) in repositories" :key="name" :title="path" @click="choose({name, path})">{{name}}</li>
    </ul>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import file from '@/lib/file'

export default {
  name: 'repository-switch',
  components: {},
  props: {
  },
  data () {
    return {
      current: null,
    }
  },
  created () {
    this.$bus.on('switch-repo-by-name', this.chooseRepoByName)
    this.$bus.on('editor-ready', this.initRepo)
    this.$store.dispatch('app/fetchRepositories')
  },
  beforeDestroy () {
    this.$bus.off('switch-repo-by-name', this.chooseRepoByName)
    this.$bus.off('editor-ready', this.initRepo)
  },
  methods: {
    initRepo () {
      const initRepoName = window.$args().get('init-repo')
      const initFilePath = window.$args().get('init-file')

      if (initRepoName) {
        this.chooseRepoByName(initRepoName)
      }

      if (initFilePath) {
        this.$store.commit('app/setCurrentFile', { repo: this.currentRepo.name, name: file.basename(initFilePath), path: initFilePath })
      }
    },
    chooseRepoByName (name) {
      if (this.repositories[name]) {
        this.choose({ name, path: this.repositories[name] })
      }
    },
    choose (repo) {
      if (repo.name !== this.currentRepo.name) {
        this.$store.commit('app/setCurrentRepo', repo)
      }
    },
  },
  watch: {
    repositories (val) {
      const keys = Object.keys(val)
      if (!this.currentRepo || keys.indexOf(this.currentRepo.name) < 0) {
        if (keys.length > 0) {
          const name = keys[0]
          this.$store.commit('app/setCurrentRepo', { name, path: val[name] })
        }
      }
    }
  },
  computed: {
    ...mapState('app', ['currentRepo', 'repositories']),
  }
}
</script>

<style scoped>
.repository-switch {
  width: 100px;
  cursor: pointer;
  user-select: none;
}

.current {
  padding: 0 .3em;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
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
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.list li:hover {
  background: #252525;
}
</style>
