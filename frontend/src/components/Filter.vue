<template>
  <XMask :show="!!show" @close="show = false">
    <QuickOpen @choose-file="show" @close="show = false"></QuickOpen>
  </XMask>
</template>

<script>
import { mapState } from 'vuex'
import XMask from './Mask'
import QuickOpen from './QuickOpen'

export default {
  name: 'x-filter',
  components: { QuickOpen, XMask },
  data () {
    return {
      show: false,
    }
  },
  mounted () {
    window.addEventListener('keydown', this.keydownHandler, true)
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.keydownHandler)
  },
  methods: {
    keydownHandler (e) {
      if (e.key === 'i' && e.ctrlKey && e.altKey) {
        this.show = f => {
          if (this.currentFile) {
            const relativePath = f.path.replace(this.currentFile.path.substr(0, this.currentFile.path.lastIndexOf('/')), '.')
            this.$bus.emit('editor-insert-value', `[${f.name.replace(/\.[^.]$/, '')}](${encodeURI(relativePath)})`)
          }
          this.show = false
        }
        e.preventDefault()
        e.stopPropagation()
      } else if (e.key === 'p' && e.ctrlKey) {
        this.show = f => {
          this.$bus.$emit('switch-repo-by-name', f.repo)
          this.$store.commit('app/setCurrentFile', f)
          this.show = false
        }
        e.preventDefault()
        e.stopPropagation()
      }
    },
  },
  computed: {
    ...mapState('app', ['currentFile'])
  }
}
</script>
