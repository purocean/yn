<template>
  <Layout>
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
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue'
import startup from '../useful/startup'
import Layout from '../components/Layout.vue'
import TitleBar from '../components/TitleBar.vue'
import StatusBar from '../components/StatusBar.vue'
import Tree from '../components/Tree.vue'
import Xterm from '../components/Xterm.vue'
import FileTabs from '../components/FileTabs.vue'
import Editor from '../components/Editor.vue'
import Preview from '../components/Preview.vue'

// import RunPlugin from ''../plugins/RunPlugin'
import XFilter from '../components/Filter.vue'

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
  },
  setup () {
    const refEditor = ref<any>(null)
    const refPreview = ref<any>(null)

    onMounted(startup)

    return { refEditor, refPreview }
  }
})
</script>
