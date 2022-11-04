<template>
  <component v-if="currentEditor" :is="currentEditor.component" />
  <default-editor v-show="!currentEditor" />
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, shallowRef, watchEffect } from 'vue'
import { useStore } from 'vuex'
import { getAllCustomEditors, switchEditor } from '@fe/services/editor'
import { registerAction, removeAction } from '@fe/core/action'
import { registerHook, removeHook } from '@fe/core/hook'
import type { AppState } from '@fe/support/store'
import { CustomEditor, Doc } from '@fe/types'
import { getLogger } from '@fe/utils'
import DefaultEditor from './DefaultEditor.vue'

// eslint-disable-next-line no-undef, func-call-spacing
const emit = defineEmits<{
  (event: 'editor:change', payload: { name: string, hiddenPreview: boolean }): void
}>()

const store = useStore<AppState>()
const logger = getLogger('main-editor')

const availableEditors = shallowRef<CustomEditor[]>([])
const currentEditor = computed(() => {
  return availableEditors.value.find(item => item.name === store.state.editor)
})

async function changeEditor ({ doc }: { doc?: Doc | null, name?: string }) {
  availableEditors.value = (await Promise.allSettled(
    getAllCustomEditors().map(x => x.when({ doc }) ? x : null))
  ).filter(x => x.status === 'fulfilled' && x.value).map(x => (x as any).value)

  logger.debug('changeEditor', store.state.editor, availableEditors.value)

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

onMounted(() => {
  registerAction({
    name: 'editor.refresh-custom-editor',
    handler: refreshEditor,
  })

  registerHook('DOC_BEFORE_SWITCH', changeEditor)
  registerHook('DOC_SWITCH_FAILED', refreshEditor)
  registerHook('EDITOR_CUSTOM_EDITOR_CHANGE', refreshEditor)
  registerHook('DOC_SWITCHED', refreshEditor, true)
  refreshEditor()
})

onBeforeUnmount(() => {
  removeAction('editor.refresh-custom-editor')
  removeHook('DOC_BEFORE_SWITCH', changeEditor)
  removeHook('DOC_SWITCH_FAILED', refreshEditor)
  removeHook('EDITOR_CUSTOM_EDITOR_CHANGE', refreshEditor)
})

watchEffect(() => {
  if (currentEditor.value) {
    const hiddenPreview = !!currentEditor.value.hiddenPreview
    emit('editor:change', { name: currentEditor.value.name, hiddenPreview })
  } else {
    emit('editor:change', { name: 'default', hiddenPreview: false })
  }
})
</script>
