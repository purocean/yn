<template>
  <div class="context-menu">
    <div class="mask" v-if="isShow" @click="hide" @contextmenu.prevent.stop="hide"></div>
    <ul class="menu" ref="menu" :style="{visibility: isShow ? 'visible' : 'hidden'}">
      <template v-for="item in items">
        <li v-if="item.type === 'separator'" :key="item.id" :class="item.type || 'normal'"></li>
        <li v-else :key="item.id" @click="handleClick(item)" :class="item.type || 'normal'">{{item.label}}</li>
      </template>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'context-menu',
  props: {
  },
  data () {
    return {
      items: [], // [{ type: normal | 'separator', id: string, label: string, onClick: item => void }]
      isShow: false,
    }
  },
  mounted () {
    this.mouseX = 0
    this.mouseY = 0
    window.addEventListener('blur', this.hide)
    window.addEventListener('mousemove', this.recordMousePosition)
  },
  beforeDestroy () {
    window.removeEventListener('blur', this.hide)
    window.removeEventListener('mousemove', this.recordMousePosition)
  },
  methods: {
    handleClick (item) {
      item.onClick(item)
      this.hide()
    },
    recordMousePosition (e) {
      this.mouseX = e.clientX
      this.mouseY = e.clientY
    },
    showMenu () {
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      const menuWidth = this.$refs.menu.offsetWidth
      const menuHeight = this.$refs.menu.offsetHeight

      const x = this.mouseX + menuWidth > windowWidth ? this.mouseX - menuWidth : this.mouseX
      const y = this.mouseY + menuHeight > windowHeight ? this.mouseY - menuHeight : this.mouseY

      this.$refs.menu.style.left = x + 'px'
      this.$refs.menu.style.top = y + 'px'

      this.isShow = true
    },
    hideMenu () {
      this.isShow = false
    },
    show (items) {
      this.items = items
      this.$nextTick(() => {
        this.showMenu()
      })
    },
    hide () {
      this.items = []
      this.hideMenu()
    }
  },
}
</script>

<style scoped>
.mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.menu {
  list-style: none;
  padding: 1px;
  margin: 0;
  position: fixed;
  left: -99999px;
  top: -99999px;
  visibility: hidden;
  background: #696969;
  border: 1px #333 solid;
  border-left: 0;
  border-top: 0;
  z-index: 9999999999;
  color: #fafafa;
  min-width: 9em;
  cursor: default;
}

.menu > li.separator {
  border-top: 1px #888888 solid;
  border-bottom: 1px #646464 solid;
  margin: 3px 0;
}

.menu > li.normal {
  padding: 5px 20px;
  cursor: default;
  font-size: 12px;
}

.menu > li.normal:hover {
  background: #333;
}

</style>
