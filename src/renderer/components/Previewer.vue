<template>
  <component v-if="previewer" :is="previewer.component" />
  <default-previewer :class="previewer ? 'preview-hidden' : undefined" />
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { registerHook, removeHook } from '@fe/core/hook'
import { useQuickFilter } from '@fe/support/ui/quick-filter'
import { getAllPreviewers, switchPreviewer } from '@fe/services/view'
import { FileTabs } from '@fe/services/workbench'
import { t } from '@fe/services/i18n'
import { HELP_REPO_NAME } from '@fe/support/args'
import store from '@fe/support/store'
import type { Components } from '@fe/types'
import DefaultPreviewer from './DefaultPreviewer.vue'

const previewer = computed(() => {
  const { previewer } = store.state
  return getAllPreviewers().find(item => item.name === previewer)
})

function tabsActionBtnTapper (btns: Components.Tabs.ActionBtn[]) {
  const previewers = getAllPreviewers()

  if (previewers.length < 1 || store.state.currentFile?.repo === HELP_REPO_NAME) {
    return
  }

  const availablePreviewers = [
    {
      name: 'default',
      displayName: t('previewer.default-previewer'),
      component: null,
    },
    ...previewers,
  ]

  btns.push({
    type: 'normal',
    icon: 'eye-solid',
    title: t('previewer.switch-previewer'),
    order: 7001,
    onClick: (e) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      useQuickFilter().show({
        filterInputHidden: true,
        top: `${rect.bottom + 10}px`,
        right: `${document.body.clientWidth - rect.right}px`,
        list: availablePreviewers.map(x => ({ key: x.name, label: x.displayName || x.name })),
        current: previewer.value?.name || 'default',
        onChoose: ({ key }) => {
          switchPreviewer(key)
        },
      })
    },
  })
}

onMounted(() => {
  FileTabs.tapActionBtns(tabsActionBtnTapper)
  registerHook('VIEW_PREVIEWER_CHANGE', FileTabs.refreshActionBtns)
})

onBeforeUnmount(() => {
  FileTabs.removeActionBtnTapper(tabsActionBtnTapper)
  removeHook('VIEW_PREVIEWER_CHANGE', FileTabs.refreshActionBtns)
})

</script>

<style scoped>
.preview-hidden {
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
