<template>
  <Layout :class="classes">
    <template v-slot:header>
      <TitleBar />
    </template>
    <template v-slot:footer>
      <StatusBar />
    </template>
    <template v-slot:left>
      <Tree />
    </template>
    <template v-slot:terminal>
      <Xterm />
    </template>
    <template v-slot:editor>
      <FileTabs />
      <Editor ref="refEditor" @scroll-line="line => refPreview.revealLine(line)" />
    </template>
    <template v-slot:preview>
      <Preview
        ref="refPreview"
        @sync-scroll="line => refEditor.revealLineInCenter(line)" />
    </template>
  </Layout>
  <XFilter />
  <SettingPanel />
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue'
import startup from '@fe/useful/startup'
import { FLAG_DISABLE_XTERM } from '@fe/useful/global-args'
import Layout from '@fe/components/Layout.vue'
import TitleBar from '@fe/components/TitleBar.vue'
import StatusBar from '@fe/components/StatusBar.vue'
import Tree from '@fe/components/Tree.vue'
import Xterm from '@fe/components/Xterm.vue'
import FileTabs from '@fe/components/FileTabs.vue'
import Editor from '@fe/components/Editor.vue'
import Preview from '@fe/components/Preview.vue'

import SettingPanel from '@fe/components/SettingPanel.vue'
import XFilter from '@fe/components/Filter.vue'

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
    Preview,
    XFilter,
    SettingPanel
  },
  setup () {
    const refEditor = ref<any>(null)
    const refPreview = ref<any>(null)

    onMounted(startup)

    const classes = {
      'flag-disable-xterm': FLAG_DISABLE_XTERM
    }

    return { refEditor, refPreview, classes }
  }
})
</script>

<style scoped>
.flag-disable-xterm :deep(.run-in-xterm){
  display: none;
}
</style>
