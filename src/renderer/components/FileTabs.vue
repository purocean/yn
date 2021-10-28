<template>
  <Tabs :list="fileTabs" :value="current" @remove="removeTabs" @switch="switchTab" @change-list="setTabs"></Tabs>
</template>

<script lang="ts">
import { useStore } from 'vuex'
import { computed, defineComponent, onBeforeMount, onBeforeUnmount, ref, toRefs, watch } from 'vue'
import { Alt, Ctrl } from '@fe/core/shortcut'
import type { Components, Doc } from '@fe/types'
import { useBus } from '@fe/core/bus'
import { ensureCurrentFileSaved, isEncrypted, isSubOrSameFile, switchDoc, toUri } from '@fe/services/document'
import { registerAction, removeAction } from '@fe/core/action'
import Tabs from './Tabs.vue'

const blankUri = toUri(null)

export default defineComponent({
  name: 'file-tabs',
  components: { Tabs },
  setup () {
    const store = useStore()
    const bus = useBus()

    const { currentFile, tabs } = toRefs(store.state)
    const { isSaved } = toRefs(store.getters)
    const list = ref<Components.FileTabs.Item[]>([])
    const current = ref(blankUri)

    function setTabs (list: Components.FileTabs.Item[]) {
      store.commit('setTabs', list)
    }

    function switchFile (file: any) {
      return switchDoc(file)
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
      const files = tabs.value.filter((x: Components.FileTabs.Item) => isSubOrSameFile(doc, x.payload.file))

      if (files.length > 0) {
        removeTabs(files)
      }
    }

    function handleSwitchFailed (payload?: { doc?: Doc | null, message: string }) {
      if (isEncrypted(payload?.doc) || payload?.message?.indexOf('NOENT')) {
        removeFile(payload?.doc)
      }
    }

    async function handleMoved (payload?: { oldDoc: Doc, newDoc: Doc }) {
      if (payload) {
        if (payload.newDoc.type === 'file') {
          await switchFile(payload.newDoc)
        }
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
    })

    watch(tabs, list => {
      if (list.length < 1) {
        addTab({
          key: blankUri,
          label: '空白页',
          description: '空白页',
          payload: { file: null }
        })
      } else if (tabs.value.length === 2) {
        if (tabs.value.some((x: any) => x.key === blankUri)) {
          setTabs(tabs.value.filter((x: any) => x.key !== blankUri))
        }
      }

      const tab = list.find((x: any) => x.key === current.value)
      if (!tab) {
        const currentFile = list.length > 0 ? list[list.length - 1].payload.file : null
        switchFile(currentFile)
      }
    })

    const fileTabs = computed(() => (tabs.value as Components.FileTabs.Item[]).map(tab => {
      if (currentFile.value && tab.key === toUri(currentFile.value)) {
        const status = currentFile.value.status

        let mark = ''
        if (!isSaved.value) {
          mark = '*'
        } else if (status === 'saved') {
          mark = ''
        } else if (status === 'save-failed') {
          mark = '!'
        } else if (status === 'loaded') {
          mark = ''
        } else {
          mark = '…'
        }

        tab.label = mark + currentFile.value.name
      }

      return tab
    }))

    return {
      list,
      current,
      fileTabs,
      removeTabs,
      switchTab,
      setTabs,
    }
  },
})
</script>
