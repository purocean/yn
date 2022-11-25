<template>
  <component v-if="currentEditor && currentEditor.component" :is="currentEditor.component" />
  <DefaultEditor v-show="!(currentEditor && currentEditor.component)" />
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watchEffect } from 'vue'
import { useStore } from 'vuex'
import { getAllCustomEditors, getIsDefault, getValue, setValue, switchEditor } from '@fe/services/editor'
import { registerAction, removeAction } from '@fe/core/action'
import { registerHook, removeHook, triggerHook } from '@fe/core/hook'
import { getLogger, storage } from '@fe/utils'
import { FileTabs } from '@fe/services/workbench'
import { useQuickFilter } from '@fe/support/ui/quick-filter'
import { isMarkdownFile } from '@fe/services/document'
import { t } from '@fe/services/i18n'
import type { AppState } from '@fe/support/store'
import type { Components, CustomEditor, Doc } from '@fe/types'
import DefaultEditor from './DefaultEditor.vue'

const EDITOR_LAST_USAGE_TIME_KEY = 'editor.last-usage-time'

const defaultEditor: CustomEditor = {
  name: 'default-markdown-editor',
  displayName: 'Default Editor',
  component: null,
  when ({ doc }) {
    return !!(doc && isMarkdownFile(doc))
  }
}

const store = useStore<AppState>()
const logger = getLogger('main-editor')
const editorLastUsageTime = storage.get<Record<string, number>>(EDITOR_LAST_USAGE_TIME_KEY, {})

const availableEditors = shallowRef<CustomEditor[]>([])
const currentEditor = computed(() => {
  return availableEditors.value.find(item => item.name === store.state.editor)
})

function recordEditorUsageTime (name: string) {
  editorLastUsageTime[name] = Date.now()
  storage.set(EDITOR_LAST_USAGE_TIME_KEY, editorLastUsageTime)
}

async function changeEditor ({ doc }: { doc?: Doc | null, name?: string }) {
  availableEditors.value = (await Promise.allSettled(
    getAllCustomEditors().concat([defaultEditor]).map(async val => {
      if (await val.when({ doc })) {
        return { ...val, _lastUsageAt: editorLastUsageTime[val.name] || 0 }
      }

      return null
    })
  ))
    .filter(x => x.status === 'fulfilled' && x.value)
    .map(x => (x as any).value)
    .sort((a, b) => b._lastUsageAt - a._lastUsageAt)

  if (availableEditors.value.length < 1) {
    switchEditor('default')
    return
  }

  if (!availableEditors.value.some(x => x.name === store.state.editor)) {
    switchEditor(availableEditors.value[0].name)
  }
}

function refreshEditor () {
  logger.debug('refreshEditor')
  changeEditor({ doc: store.state.currentFile })
}

function tabsActionBtnTapper (btns: Components.Tabs.ActionBtn[]) {
  if (availableEditors.value.length > 1) {
    btns.push({
      icon: 'pen-solid',
      title: t('editor.switch-editor'),
      onClick: (e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        useQuickFilter().show({
          filterInputHidden: true,
          top: `${rect.bottom + 10}px`,
          right: `${document.body.clientWidth - rect.right}px`,
          list: availableEditors.value.map(x => ({ key: x.name, label: x.displayName || x.name })),
          current: currentEditor.value?.name || 'default',
          onChoose: ({ key }) => {
            switchEditor(key)

            // sync default editor content
            nextTick(() => {
              const { currentContent } = store.state
              if (getIsDefault() && getValue() !== currentContent) {
                setValue(currentContent)
              }
            })
          },
        })
      },
    })
  }
}

onMounted(() => {
  registerAction({
    name: 'editor.refresh-custom-editor',
    handler: refreshEditor,
  })

  registerHook('DOC_BEFORE_SWITCH', changeEditor)
  registerHook('DOC_SWITCH_FAILED', refreshEditor)
  registerHook('EDITOR_CUSTOM_EDITOR_CHANGE', refreshEditor)
  registerHook('DOC_SWITCHED', refreshEditor, true)
  FileTabs.tapActionBtns(tabsActionBtnTapper)
  refreshEditor()
})

onBeforeUnmount(() => {
  removeAction('editor.refresh-custom-editor')
  removeHook('DOC_BEFORE_SWITCH', changeEditor)
  removeHook('DOC_SWITCH_FAILED', refreshEditor)
  removeHook('EDITOR_CUSTOM_EDITOR_CHANGE', refreshEditor)
  FileTabs.removeActionBtnTapper(tabsActionBtnTapper)
})

watchEffect(() => {
  triggerHook('EDITOR_CURRENT_EDITOR_CHANGE', { current: currentEditor.value })
  FileTabs.refreshActionBtns()
  recordEditorUsageTime(currentEditor.value?.name || 'default')
})
</script>
