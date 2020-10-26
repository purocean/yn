<template>
  <Tabs :list="tabs" :value="current" @remove="removeTabs" @switch="switchTab" @change-list="setTabs"></Tabs>
</template>

<script lang="ts">
import { useStore } from 'vuex'
import Tabs from './Tabs.vue'
import File from '../useful/file'
import { defineComponent, onBeforeMount, onBeforeUnmount, ref, toRefs, watch } from 'vue'
import { Components } from '../types'

const blankUri = File.toUri(null)

export default defineComponent({
  name: 'file-tabs',
  components: { Tabs },
  setup () {
    const store = useStore()

    const { currentFile, tabs } = toRefs(store.state)
    const list = ref<Components.FileTabs.Item[]>([])
    const current = ref(blankUri)

    function setTabs (list: Components.FileTabs.Item[]) {
      store.commit('setTabs', list)
    }

    function switchFile (file: any) {
      store.commit('setCurrentFile', file)
    }

    function switchTab (item: Components.FileTabs.Item) {
      switchFile(item.payload.file)
    }

    function removeTabs (items: Components.FileTabs.Item[]) {
      const keys = items.map(x => x.key)
      setTabs(tabs.value.filter((x: any) => keys.indexOf(x.key) === -1))
    }

    function addTab (item: Components.FileTabs.Item) {
      const tab = tabs.value.find((x: any) => item.key === x.key)

      // 没有打开此 Tab，新建一个
      if (!tab) {
        setTabs(tabs.value.concat([item]))
      }

      current.value = item.key
    }

    function keydownHandler (e: KeyboardEvent) {
      const findTab = (offset: number) => {
        const list = [...tabs.value]

        if (list.length < 1) {
          return null
        }

        const currentIndex = list.findIndex(x => x.key === current.value)
        let index = currentIndex + offset

        if (index < 0) {
          index = list.length - 1
        }

        if (index >= list.length) {
          index = 0
        }

        return list[index]
      }

      // 快捷键切换最近文档
      if (e.altKey && e.ctrlKey) {
        if (e.key === 'ArrowLeft') {
          const prev = findTab(-1)
          prev && switchTab(prev)
        } else if (e.key === 'ArrowRight') {
          const next = findTab(1)
          next && switchTab(next)
        }
      }
    }

    onBeforeMount(() => {
      window.addEventListener('keydown', keydownHandler, true)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', keydownHandler)
    })

    watch(currentFile, file => {
      const uri = File.toUri(file)
      const item = {
        key: uri,
        label: file ? file.name : '空白页',
        description: file ? file.path : '空白页',
        payload: { file },
      }

      addTab(item)
    }, { immediate: true })

    watch(tabs, list => {
      if (list.length < 1) {
        addTab({
          key: blankUri,
          label: '空白页',
          description: '空白页',
          payload: { file: null }
        })
      }

      const tab = list.find((x: any) => x.key === current.value)
      if (!tab) {
        const currentFile = list.length > 0 ? list[list.length - 1].payload.file : null
        switchFile(currentFile)
      }
    })

    return {
      list,
      current,
      tabs,
      removeTabs,
      switchTab,
      setTabs,
    }
  },
})
</script>
