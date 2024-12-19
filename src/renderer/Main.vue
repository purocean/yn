<template>
  <Layout :class="classes">
    <template v-slot:header>
      <TitleBar />
    </template>
    <template v-slot:footer>
      <StatusBar />
    </template>
    <template v-slot:left>
      <ActionBar />
      <Outline v-if="showOutline" show-filter enable-collapse />
      <Tree v-show="!showOutline" />
      <SearchPanel />
    </template>
    <template v-slot:terminal>
      <Xterm @hide="hideXterm" />
    </template>
    <template v-slot:editor>
      <Editor />
    </template>
    <template v-slot:preview>
      <Previewer />
    </template>
    <template v-slot:right-before>
      <FileTabs />
    </template>
  </Layout>
  <XFilter />
  <SettingPanel />
  <ExportPanel />
  <Premium />
  <ControlCenter />
  <DocHistory />
  <ExtensionManager />
  <KeyboardShortcuts />
  <div v-if="presentationExitVisible" class="presentation-exit" title="Exit" @click="exitPresent">
    <svg-icon name="times" />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import startup from '@fe/startup'
import { getActionHandler } from '@fe/core/action'
import { registerHook, removeHook } from '@fe/core/hook'
import { FLAG_DISABLE_XTERM, MODE } from '@fe/support/args'
import store from '@fe/support/store'
import type { CustomEditor } from '@fe/types'
import { emitResize } from '@fe/services/layout'
import { exitPresent } from '@fe/services/view'
import Layout from '@fe/components/Layout.vue'
import SvgIcon from '@fe/components/SvgIcon.vue'
import TitleBar from '@fe/components/TitleBar.vue'
import StatusBar from '@fe/components/StatusBar.vue'
import Tree from '@fe/components/Tree.vue'
import Xterm from '@fe/components/Xterm.vue'
import FileTabs from '@fe/components/FileTabs.vue'
import Editor from '@fe/components/Editor.vue'
import Previewer from '@fe/components/Previewer.vue'

import SettingPanel from '@fe/components/SettingPanel.vue'
import ExportPanel from '@fe/components/ExportPanel.vue'
import Premium from '@fe/components/Premium.vue'
import XFilter from '@fe/components/Filter.vue'
import ControlCenter from '@fe/components/ControlCenter.vue'
import DocHistory from '@fe/components/DocHistory.vue'
import ActionBar from '@fe/components/ActionBar.vue'
import Outline from '@fe/components/Outline.vue'
import SearchPanel from '@fe/components/SearchPanel.vue'
import ExtensionManager from '@fe/components/ExtensionManager.vue'
import KeyboardShortcuts from '@fe/components/KeyboardShortcuts.vue'

export default defineComponent({
  name: 'x-main',
  components: {
    Layout,
    SvgIcon,
    TitleBar,
    StatusBar,
    Tree,
    Xterm,
    FileTabs,
    Editor,
    Previewer,
    XFilter,
    Premium,
    SettingPanel,
    ExportPanel,
    ControlCenter,
    DocHistory,
    ActionBar,
    Outline,
    SearchPanel,
    ExtensionManager,
    KeyboardShortcuts,
  },
  setup () {
    const showOutline = computed(() => store.state.showOutline)
    const presentationExitVisible = computed(() => MODE === 'normal' && store.state.presentation)

    onMounted(startup)

    const forceHiddenPreview = ref(false)

    const classes = computed(() => ({
      'flag-disable-xterm': FLAG_DISABLE_XTERM,
      'editor-force-only': forceHiddenPreview.value,
    }))

    function hideXterm () {
      getActionHandler('layout.toggle-xterm')(false)
    }

    function onEditorChange (payload: { current?: CustomEditor | null }) {
      forceHiddenPreview.value = !!payload.current?.hiddenPreview
      emitResize()
    }

    registerHook('EDITOR_CURRENT_EDITOR_CHANGE', onEditorChange)

    onBeforeUnmount(() => {
      removeHook('EDITOR_CURRENT_EDITOR_CHANGE', onEditorChange)
    })

    return { presentationExitVisible, classes, hideXterm, showOutline, onEditorChange, exitPresent }
  }
})
</script>

<style scoped>
.flag-disable-xterm :deep(.run-in-xterm){
  display: none;
}

.editor-force-only :deep(.content > .preview) {
  display: none !important;
}

.editor-force-only :deep(.content > .editor) {
  display: flex !important;
  width: revert !important;
  min-width: 0 !important;
  max-width: revert !important;
}

.presentation-exit {
  position: fixed;
  z-index: 210000000;
  bottom: 6px;
  left: 6px;
  padding: 10px;
  color: var(--g-color-50);
  opacity: 0.4;
  cursor: pointer;
  transition: opacity 0.2s;
}

.presentation-exit:hover {
  opacity: 1;
}
</style>
