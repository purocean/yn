<template>
  <Tabs :list="tabs" :value="current" @remove="removeTabs" @switch="switchTab" @change-list="setTabs"></Tabs>
</template>

<script lang="ts">
import { useStore } from 'vuex'
import { defineComponent, onBeforeMount, onBeforeUnmount, ref, toRefs, watch } from 'vue'
import { Alt, Ctrl } from '@fe/context/shortcut'
import { Components, Doc } from '@fe/support/types'
import { useBus } from '@fe/support/bus'
import { ensureCurrentFileSaved, isEncrypted, switchDoc, toUri } from '@fe/context/document'
import { registerAction, removeAction } from '@fe/context/action'
import { isBelongTo } from '@fe/utils/path'
import Tabs from './Tabs.vue'

const blankUri = toUri(null)

export default defineComponent({
  name: 'file-tabs',
  components: { Tabs },
  setup () {
    const store = useStore()
    const bus = useBus()

    const { currentFile, tabs } = toRefs(store.state)
    const list = ref<Components.FileTabs.Item[]>([])
    const current = ref(blankUri)

    function setTabs (list: Components.FileTabs.Item[]) {
      store.commit('setTabs', list)
    }

    function switchFile (file: any) {
      switchDoc(file)
    }

    function switchTab (item: Components.FileTabs.Item) {
      switchFile(item.payload.file)
    }

    async function removeTabs (items: Components.FileTabs.Item[]) {
      if (items.find(x => x.key === current.value)) {
        await ensureCurrentFileSaved()
      }

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

    function findTab (offset: number) {
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

    function removeFile (doc?: Doc | null) {
      const tab = tabs.value.find((x: Components.FileTabs.Item) => {
        return x.key === toUri(doc) || (x.payload.file && doc && isBelongTo(doc.path, x.payload.file.path))
      })

      if (tab) {
        removeTabs([tab])
      }
    }

    function handleSwitchFailed (payload?: { doc?: Doc | null, message: string }) {
      if (isEncrypted(payload?.doc) || payload?.message?.indexOf('NOENT')) {
        removeFile(payload?.doc)
      }
    }

    function handleMoved (payload?: { oldDoc: Doc }) {
      if (payload) {
        removeFile(payload.oldDoc)
      }
    }

    onBeforeMount(() => {
      bus.on('doc.created', switchFile)
      bus.on('doc.deleted', removeFile)
      bus.on('doc.switch-failed', handleSwitchFailed)
      bus.on('doc.moved', handleMoved)

      registerAction({
        name: 'file-tabs.switch-left',
        keys: [Ctrl, Alt, 'ArrowLeft'],
        handler () {
          const prev = findTab(-1)
          prev && switchTab(prev)
        },
      })

      registerAction({
        name: 'file-tabs.switch-right',
        handler () {
          const next = findTab(1)
          next && switchTab(next)
        },
        keys: [Ctrl, Alt, 'ArrowRight']
      })
    })

    onBeforeUnmount(() => {
      bus.off('doc.created', switchFile)
      bus.off('doc.deleted', removeFile)
      bus.off('doc.switch-failed', handleSwitchFailed)
      bus.off('doc.moved', handleMoved)
      removeAction('file-tabs.switch-left')
      removeAction('file-tabs.switch-next')
    })

    watch(currentFile, (file: any) => {
      const uri = toUri(file)
      const item = {
        key: uri,
        label: file ? file.name : '空白页',
        description: file ? `[${file.repo}] ${file.path}` : '空白页',
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
