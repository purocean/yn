<template>
  <div class="repository-switch">
    <div class="current" v-if="currentRepo">仓库：{{currentRepo.name}}</div>
    <div class="current" v-else>未选择仓库</div>
    <ul class="list">
      <li v-for="(path, name) in repositories" :key="name" :title="path" @click="choose({name, path})">{{name}}</li>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeMount, onBeforeUnmount, toRefs, watch } from 'vue'
import { useStore } from 'vuex'
import file from '../useful/file'
import { useBus } from '../useful/bus'
import { $args } from '../useful/global-args'

export default defineComponent({
  name: 'repository-switch',
  setup () {
    const store = useStore()
    const bus = useBus()

    const { currentRepo, repositories } = toRefs(store.state)

    function choose (repo: any) {
      if (repo.name !== currentRepo.value?.name) {
        store.commit('setCurrentRepo', repo)
      }
    }

    function chooseRepoByName (name?: string) {
      if (name && repositories.value[name]) {
        choose({ name, path: repositories.value[name] })
      }
    }

    function initRepo () {
      const initRepoName = $args().get('init-repo')
      const initFilePath = $args().get('init-file')

      if (initRepoName) {
        chooseRepoByName(initRepoName)
      }

      if (initFilePath) {
        store.commit('setCurrentFile', { repo: currentRepo.value.name, name: file.basename(initFilePath), path: initFilePath })
      }
    }

    onBeforeMount(() => {
      bus.on('switch-repo-by-name', chooseRepoByName)
      bus.on('editor-ready', initRepo)
      store.dispatch('fetchRepositories')
    })

    onBeforeUnmount(() => {
      bus.off('switch-repo-by-name', chooseRepoByName)
      bus.off('editor-ready', initRepo)
    })

    watch(repositories, val => {
      const keys = Object.keys(val)
      if (!currentRepo.value || keys.indexOf(currentRepo.value.name) < 0) {
        if (keys.length > 0) {
          const name = keys[0]
          store.commit('setCurrentRepo', { name, path: val[name] })
        }
      }
    })

    return {
      currentRepo,
      repositories,
      choose,
    }
  },
})
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
