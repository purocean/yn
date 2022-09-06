<template>
  <div class="status-bar">
    <StatusBarMenu class="left" position="left" />
    <StatusBarMenu class="right" position="right" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import StatusBarMenu from './StatusBarMenu.vue'

export default defineComponent({
  name: 'status-bar',
  components: { StatusBarMenu },
})
</script>

<style scoped>
.left {
  display: flex;
}

.right {
  display: flex;
}

.status-bar {
  box-sizing: border-box;
  padding: 0;
  color: #eee;
  background: #38383a;
  font-size: 12px;
  line-height: 20px;
  height: 100%;
  display: flex;
  justify-content: space-between;
  overflow: hidden;
}

.action {
  padding: 0 .5em;
  /* margin-left: 1em; */
  cursor: pointer;
  user-select: none;
  flex: none;
}

.action-icon {
  width: 10px;
  height: 20px;
}

.action:hover {
  background: #2e2e2e;
}
</style>
