<template>
  <div>
    <Layout>
      <TitleBar slot="header"></TitleBar>
      <StatusBar slot="footer"></StatusBar>
      <Tree slot="left"></Tree>
      <Xterm slot="terminal"></Xterm>
      <template slot="editor">
        <FileTabs />
        <Editor ref="editor" @scroll-line="line => $refs.preview.revealLine(line)" />
      </template>
      <Preview
        ref="preview"
        slot="preview"
        @sync-scroll="line => $refs.editor.revealLineInCenter(line)"
        @switch-todo="(line, checked) => $refs.editor.switchTodo(line, checked)" />
    </Layout>
    <XFilter />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import Layout from '@/components/Layout'
import TitleBar from '@/components/TitleBar'
import FileTabs from '@/components/FileTabs'
import StatusBar from '@/components/StatusBar'
import Tree from '@/components/Tree'
import Editor from '@/components/Editor'
import Preview from '@/components/Preview'
import RunPlugin from '../plugins/RunPlugin'
import XFilter from '@/components/Filter'
import Xterm from '@/components/Xterm'

export default {
  name: 'x-main',
  components: { Layout, TitleBar, StatusBar, Tree, Editor, Preview, XFilter, Xterm, FileTabs },
  mounted () {
    RunPlugin.clearCache()
    this.$bus.on('editor-ready', this.init)
    this.$bus.on('copy-text', this.copyText)
  },
  beforeDestroy () {
    this.$bus.off('editor-ready', this.init)
    this.$bus.off('copy-text', this.copyText)
  },
  methods: {
    copyText (text) {
      const input = document.createElement('input')
      input.style.position = 'absolute'
      input.style.background = 'red'
      input.style.left = '-999999px'
      input.style.top = '-999999px'
      input.style.zIndex = -1000
      input.style.opacity = 0
      input.value = text
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      this.$toast.show('info', '已复制')
    },
    init () {
      if (!this.currentFile) {
        this.$store.dispatch('app/showHelp', 'README.md')
      }
    }
  },
  computed: {
    ...mapState('app', ['currentFile'])
  }
}
</script>
