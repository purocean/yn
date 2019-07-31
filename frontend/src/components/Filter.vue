<template>
  <transition name="fade">
    <div v-if="show" class="filter-wrapper" @click="show = false">
      <QuickOpen @choose-file="show" @close="show = false"></QuickOpen>
    </div>
  </transition>
</template>

<script>
import QuickOpen from './QuickOpen'
import { mapState } from 'vuex'

export default {
  name: 'x-filter',
  components: { QuickOpen },
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
          this.$store.commit('app/setCurrentFile', f)
          this.show = false
        }
        e.preventDefault()
        e.stopPropagation()
      } else if (e.key === 'Escape' && this.show) {
        this.show = false
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

<style scoped>
.filter-wrapper {
  position: fixed;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, .2);
  z-index: 99999;
  padding-top: 4em;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
