<template>
  <component v-if="currentEditor && currentEditor.component" :is="currentEditor.component" />
  <DefaultEditor v-show="!(currentEditor && currentEditor.component)" />
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { getAllCustomEditors, isDefault, getValue, setValue, switchEditor } from '@fe/services/editor'
import { registerAction, removeAction } from '@fe/core/action'
import { registerHook, removeHook, triggerHook } from '@fe/core/hook'
import { getLogger, storage } from '@fe/utils'
import { FileTabs } from '@fe/services/workbench'
import { useQuickFilter } from '@fe/support/ui/quick-filter'
import { isMarkdownFile } from '@fe/services/document'
import { t } from '@fe/services/i18n'
import store from '@fe/support/store'
import type { Components, CustomEditor, Doc } from '@fe/types'
import DefaultEditor from './DefaultEditor.vue'

const EDITOR_LAST_USAGE_TIME_KEY = 'editor.last-usage-time'

const defaultEditor: CustomEditor = {
  name: 'default-markdown-editor',
  displayName: t('editor.default-editor'),
  component: null,
  when ({ doc }) {
    return !!(doc && isMarkdownFile(doc))
  }
}

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
        (val as any)._lastUsageAt = editorLastUsageTime[val.name] || 0
        return val
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

function chooseEditor (key: string) {
  switchEditor(key)

  // sync default editor content
  nextTick(() => {
    const { currentContent } = store.state
    if (isDefault() && getValue() !== currentContent) {
      setValue(currentContent)
    }
  })
}

function tabsActionBtnTapper (btns: Components.Tabs.ActionBtn[]) {
  const order = 7000
  if (availableEditors.value.length > 1) {
    btns.push({ type: 'separator', order })
    btns.push({
      type: 'normal',
      icon: 'pen-solid',
      order,
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
            chooseEditor(key)
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

  registerAction({
    name: 'editor.rotate-custom-editors',
    description: t('command-desc.editor_rotate-custom-editors'),
    forUser: true,
    handler: () => {
      if (availableEditors.value.length > 1) {
        const index = availableEditors.value.findIndex(x => x.name === store.state.editor)
        const nextIndex = index === availableEditors.value.length - 1 ? 0 : index + 1
        chooseEditor(availableEditors.value[nextIndex].name)
      }
    },
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
  removeAction('editor.rotate-custom-editors')
  removeHook('DOC_BEFORE_SWITCH', changeEditor)
  removeHook('DOC_SWITCH_FAILED', refreshEditor)
  removeHook('EDITOR_CUSTOM_EDITOR_CHANGE', refreshEditor)
  FileTabs.removeActionBtnTapper(tabsActionBtnTapper)
})

watch(() => store.state.editor, () => {
  triggerHook('EDITOR_CURRENT_EDITOR_CHANGE', { current: currentEditor.value })
  FileTabs.refreshActionBtns()
  recordEditorUsageTime(currentEditor.value?.name || 'default')
})
</script>
