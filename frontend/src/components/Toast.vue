<template>
  <div v-if="toast" :class="{toast: true, [`toast-${toast.type}`]: true}">{{toast.content}}</div>
</template>

<script>
export default {
  name: 'toast',
  data () {
    return {
      toast: null
    }
  },
  methods: {
    show (type, content, timeout = 2000) {
      // TODO 暂时只有 warning type
      this.toast = { type, content }

      setTimeout(() => {
        this.toast = null
      }, timeout)
    },
  },
}
</script>

<style scoped>
.toast {
  position: fixed;
  width: 250px;
  left: 0;
  top: 100px;
  padding: 10px;
  z-index: 999999;
  right: 0;
  margin: auto;
  border-radius: 50px;
  text-align: center;
  word-break: break-all;
}

.toast-warning {
  background: #d46b08;
  color: #f9ebeb;
}
</style>
