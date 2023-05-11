<template>
  <Tabs
    ref="refTabs"
    class="file-tabs"
    :list="fileTabs"
    :value="current"
    :filter-btn-title="filterBtnTitle"
    :action-btns="actionBtns"
    @remove="removeTabs"
    @switch="switchTab"
    @change-list="setTabs"
    @dblclick-item="makeTabPermanent"
    @dblclick-blank="onDblclickBlank"
  />
</template>

<script lang="ts">
import { useStore } from 'vuex'
import { computed, defineComponent, onBeforeMount, onBeforeUnmount, ref, toRefs, watch } from 'vue'
import { Alt, CtrlCmd, getKeysLabel, Shift } from '@fe/core/command'
import type { Components, Doc } from '@fe/types'
import { registerHook, removeHook } from '@fe/core/hook'
import { registerAction, removeAction } from '@fe/core/action'
import { ensureCurrentFileSaved, isEncrypted, isMarkdownFile, isSameFile, isSubOrSameFile, switchDoc, toUri } from '@fe/services/document'
import type { AppState } from '@fe/support/store'
import { useI18n } from '@fe/services/i18n'
import { FileTabs } from '@fe/services/workbench'
import { getSetting } from '@fe/services/setting'
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
    const actionBtns = ref<Components.Tabs.ActionBtn[]>([])

    const welcomeShortcuts = isElectron ? [CtrlCmd, 'n'] : [CtrlCmd, Alt, 'n']

    function copyDoc (file: Doc | null): Doc | null {
      return file ? {
        type: 'file',
        name: file?.name,
        repo: file?.repo,
        path: file?.path,
      } : null
    }

    function setTabs (list: Components.FileTabs.Item[]) {
      store.commit('setTabs', list.map(item => {
        item.payload.file = copyDoc(item.payload.file)
        return item
      }))
    }

    function switchFile (file: Doc | null) {
      return switchDoc(copyDoc(file))
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
        if (item.payload.file) {
          // remove temporary tab and add new one.
          setTabs(tabs.value.filter(x => !x.temporary).concat([item]))
        } else {
          // welcome tab
          setTabs(tabs.value.concat([item]))
        }
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
      // find current tab
      const files = tabs.value.filter((x: Components.FileTabs.Item) => x.key === current.value)

      if (files.length > 0) {
        // remove if not fixed
        removeTabs(files.filter(x => !x.fixed))
      }
    }

    function handleSwitchFailed (payload?: { doc?: Doc | null, message: string }) {
      if (isEncrypted(payload?.doc) || payload?.message?.indexOf('NOENT')) {
        removeFile(payload?.doc)
      }
    }

    async function handleMoved (payload?: { oldDoc: Doc, newDoc: Doc }) {
      if (payload) {
        if (
          isMarkdownFile(payload.newDoc) &&
          isSameFile(payload.oldDoc, currentFile.value)
        ) {
          await switchFile(payload.newDoc)
        }
        removeFile(payload.oldDoc)
      }
    }

    function handleDocCreated ({ doc }: { doc: Doc | null }) {
      if (!doc || isMarkdownFile(doc)) {
        switchFile(doc)
      }
    }

    function handleDocDeleted ({ doc }: { doc: Doc | null }) {
      removeFile(doc)
    }

    function makeTabPermanent (item: Pick<Components.FileTabs.Item, 'key'>) {
      const tab = tabs.value.find(x => item.key === x.key)

      if (tab && tab.temporary && tab.payload.file) {
        tab.temporary = false
        setTabs(tabs.value)
      }
    }

    function handleTreeNodeDblClick (payload: { node: Doc | null }) {
      const doc = payload.node
      if (doc) {
        makeTabPermanent({ key: toUri(doc) })
      }
    }

    function onDblclickBlank () {
      switchDoc(null)
    }

    function refreshActionBtns () {
      const arr = [...FileTabs.getActionBtns()]

      if (currentFile.value) {
        arr.unshift({
          icon: 'plus-regular',
          type: 'normal',
          title: t('tabs.new-tab') + ' ' + getKeysLabel(welcomeShortcuts),
          onClick () {
            switchDoc(null)
          },
          order: -600,
          style: 'order: -600;'
        })
      }

      actionBtns.value = arr
    }

    onBeforeMount(() => {
      registerHook('DOC_MOVED', handleMoved)
      registerHook('DOC_CREATED', handleDocCreated)
      registerHook('DOC_DELETED', handleDocDeleted)
      registerHook('DOC_SWITCH_FAILED', handleSwitchFailed)
      registerHook('TREE_NODE_DBLCLICK', handleTreeNodeDblClick)

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

      registerAction({
        name: 'file-tabs.show-welcome',
        handler () {
          switchDoc(null)
        },
        keys: welcomeShortcuts
      })

      registerAction({
        name: 'file-tabs.refresh-action-btns',
        handler: refreshActionBtns,
      })
    })

    onBeforeUnmount(() => {
      removeHook('DOC_MOVED', handleMoved)
      removeHook('DOC_CREATED', handleDocCreated)
      removeHook('DOC_DELETED', handleDocDeleted)
      removeHook('DOC_SWITCH_FAILED', handleSwitchFailed)
      removeHook('TREE_NODE_DBLCLICK', handleTreeNodeDblClick)
      removeAction('file-tabs.switch-left')
      removeAction('file-tabs.switch-right')
      removeAction('file-tabs.close-current')
      removeAction('file-tabs.search-tabs')
      removeAction('file-tabs.refresh-action-btns')
      removeAction('file-tabs.show-welcome')
    })

    watch(currentFile, file => {
      if (file === undefined) {
        return
      }

      const uri = toUri(file)
      const item = {
        key: uri,
        label: file ? file.name : t('get-started.get-started'),
        description: file ? `[${file.repo}] ${file.path}` : t('get-started.get-started'),
        temporary: getSetting('editor.enable-preview', true),
        payload: { file },
      }

      addTab(item)
    }, { immediate: true })

    watch(tabs, list => {
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

        // not saved tab should be marked as permanent
        if (tab.temporary && status === 'loaded' && !isSaved.value) {
          tab.temporary = false
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
      actionBtns,
      filterBtnTitle,
      makeTabPermanent,
      onDblclickBlank,
    }
  },
})
</script>

<style lang="scss" scoped>
::v-deep(.tabs div:only-child[data-key="yank-note://system/blank.md"] > .icon) {
  display: none;
}
</style>
