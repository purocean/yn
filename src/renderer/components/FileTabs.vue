<template>
  <Tabs
    ref="refTabs"
    :list="fileTabs"
    :value="current"
    :filter-btn-title="filterBtnTitle"
    @remove="removeTabs"
    @switch="switchTab"
    @change-list="setTabs"
  />
</template>

<script lang="ts">
import { useStore } from 'vuex'
import { computed, defineComponent, onBeforeMount, onBeforeUnmount, ref, toRefs, watch } from 'vue'
import { Alt, CtrlCmd, getKeysLabel, Shift } from '@fe/core/command'
import type { Components, Doc } from '@fe/types'
import { registerHook, removeHook } from '@fe/core/hook'
import { registerAction, removeAction } from '@fe/core/action'
import { ensureCurrentFileSaved, isEncrypted, isSubOrSameFile, switchDoc, toUri } from '@fe/services/document'
import type { AppState } from '@fe/support/store'
import { useI18n } from '@fe/services/i18n'
import { isElectron } from '@fe/support/env'
import Tabs from './Tabs.vue'

const blankUri = toUri(null)

export default defineComponent({
  name: 'file-tabs',
  components: { Tabs },
  setup () {
    const { t, $t } = useI18n()
    const store = useStore()

    const { currentFile, tabs } = toRefs<AppState>(store.state)
    const isSaved = computed(() => store.getters.isSaved)

    const list = ref<Components.FileTabs.Item[]>([])
    const current = ref(blankUri)
    const refTabs = ref<InstanceType<typeof Tabs> | null>(null)
    const showFilterBtnShortcuts = [Shift, Alt, 'p']
    const filterBtnTitle = computed(() => $t.value('tabs.search-tabs') + ' ' + getKeysLabel(showFilterBtnShortcuts))

    function setTabs (list: Components.FileTabs.Item[]) {
      store.commit('setTabs', list)
    }

    function switchFile (file: Doc | null) {
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
      setTabs(tabs.value.filter(x => keys.indexOf(x.key) === -1))
    }

    function addTab (item: Components.FileTabs.Item) {
      const tab = tabs.value.find(x => item.key === x.key)

      // no this tab, add new one.
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

    function closeCurrent () {
      const files = tabs.value.filter((x: Components.FileTabs.Item) => x.key === current.value)

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
        if (payload.newDoc.type === 'file' && payload.newDoc.path.endsWith('.md')) {
          await switchFile(payload.newDoc)
        }
        removeFile(payload.oldDoc)
      }
    }

    function handleDocCreated ({ doc }: { doc: Doc | null }) {
      if (!doc || doc.type === 'file') {
        switchFile(doc)
      }
    }

    function handleDocDeleted ({ doc }: { doc: Doc | null }) {
      removeFile(doc)
    }

    onBeforeMount(() => {
      registerHook('DOC_MOVED', handleMoved)
      registerHook('DOC_CREATED', handleDocCreated)
      registerHook('DOC_DELETED', handleDocDeleted)
      registerHook('DOC_SWITCH_FAILED', handleSwitchFailed)

      registerAction({
        name: 'file-tabs.switch-left',
        keys: [CtrlCmd, Alt, 'ArrowLeft'],
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
        keys: [CtrlCmd, Alt, 'ArrowRight']
      })

      registerAction({
        name: 'file-tabs.close-current',
        handler: closeCurrent,
        keys: isElectron ? [CtrlCmd, 'w'] : [CtrlCmd, Alt, 'w']
      })

      registerAction({
        name: 'file-tabs.search-tabs',
        handler () {
          refTabs.value?.showQuickFilter()
        },
        keys: showFilterBtnShortcuts
      })
    })

    onBeforeUnmount(() => {
      removeHook('DOC_MOVED', handleMoved)
      removeHook('DOC_CREATED', handleDocCreated)
      removeHook('DOC_DELETED', handleDocDeleted)
      removeHook('DOC_SWITCH_FAILED', handleSwitchFailed)
      removeAction('file-tabs.switch-left')
      removeAction('file-tabs.switch-right')
      removeAction('file-tabs.close-current')
      removeAction('file-tabs.search-tabs')
    })

    watch(currentFile, file => {
      const uri = toUri(file)
      const item = {
        key: uri,
        label: file ? file.name : t('blank-page'),
        description: file ? `[${file.repo}] ${file.path}` : t('blank-page'),
        payload: { file },
      }

      addTab(item)
    })

    watch(tabs, list => {
      if (list.length < 1) {
        addTab({
          key: blankUri,
          label: t('blank-page'),
          description: t('blank-page'),
          payload: { file: null }
        })
      } else if (tabs.value.length === 2) {
        if (tabs.value.some(x => x.key === blankUri)) {
          setTabs(tabs.value.filter(x => x.key !== blankUri))
        }
      }

      const tab = list.find(x => x.key === current.value)
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
      refTabs,
      filterBtnTitle,
    }
  },
})
</script>

<style lang="scss" scoped>
::v-deep(.tabs div[data-key="yank-note://system/blank.md"] > .icon) {
  display: none;
}
</style>
