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
      <Xterm @hide="hideXterm" />
    </template>
    <template v-slot:editor>
      <FileTabs />
      <Editor />
    </template>
    <template v-slot:preview>
      <Preview />
    </template>
  </Layout>
  <XFilter />
  <SettingPanel />
  <ExportPanel />
  <Premium />
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue'
import startup from '@fe/startup'
import { getActionHandler } from '@fe/core/action'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'
import Layout from '@fe/components/Layout.vue'
import TitleBar from '@fe/components/TitleBar.vue'
import StatusBar from '@fe/components/StatusBar.vue'
import Tree from '@fe/components/Tree.vue'
import Xterm from '@fe/components/Xterm.vue'
import FileTabs from '@fe/components/FileTabs.vue'
import Editor from '@fe/components/Editor.vue'
import Preview from '@fe/components/Preview.vue'

import SettingPanel from '@fe/components/SettingPanel.vue'
import ExportPanel from '@fe/components/ExportPanel.vue'
import Premium from '@fe/components/Premium.vue'
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
    Premium,
    SettingPanel,
    ExportPanel,
  },
  setup () {
    onMounted(startup)

    const classes = {
      'flag-disable-xterm': FLAG_DISABLE_XTERM
    }

    function hideXterm () {
      getActionHandler('layout.toggle-xterm')(false)
    }

    return { classes, hideXterm }
  }
})
</script>

<style scoped>
.flag-disable-xterm :deep(.run-in-xterm){
  display: none;
}
</style>
