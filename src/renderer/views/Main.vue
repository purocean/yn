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
      <Outline show-filter v-if="showOutline" />
      <Tree v-show="!showOutline" />
    </template>
    <template v-slot:terminal>
      <Xterm @hide="hideXterm" />
    </template>
    <template v-slot:editor>
      <FileTabs />
      <Editor @editor:change="onEditorChange" />
    </template>
    <template v-slot:preview>
      <Previewer />
    </template>
  </Layout>
  <XFilter />
  <SettingPanel />
  <ExportPanel />
  <Premium />
  <ControlCenter />
  <DocHistory />
  <ExtensionManager />
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref, toRef } from 'vue'
import { useStore } from 'vuex'
import startup from '@fe/startup'
import { getActionHandler } from '@fe/core/action'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'
import type { AppState } from '@fe/support/store'
import { emitResize } from '@fe/services/layout'
import Layout from '@fe/components/Layout.vue'
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
import ExtensionManager from '@fe/components/ExtensionManager.vue'

export default defineComponent({
  name: 'x-main',
  components: {
    Layout,
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
    ExtensionManager,
  },
  setup () {
    const store = useStore<AppState>()
    const showOutline = toRef(store.state, 'showOutline')
    onMounted(startup)

    const forceHiddenPreview = ref(false)

    const classes = computed(() => ({
      'flag-disable-xterm': FLAG_DISABLE_XTERM,
      'editor-force-only': forceHiddenPreview.value,
    }))

    function hideXterm () {
      getActionHandler('layout.toggle-xterm')(false)
    }

    function onEditorChange (payload: { hiddenPreview: boolean }) {
      forceHiddenPreview.value = payload.hiddenPreview
      emitResize()
    }

    return { classes, hideXterm, showOutline, onEditorChange }
  }
})
</script>

<style scoped>
.flag-disable-xterm :deep(.run-in-xterm){
  display: none;
}

.editor-force-only :deep(.content .preview) {
  display: none !important;
}

.editor-force-only :deep(.content .editor) {
  display: block !important;
}
</style>
