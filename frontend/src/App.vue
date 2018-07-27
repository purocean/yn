<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
import 'normalize.css/normalize.css'
import Vue from 'vue'
import VueBus from 'vue-bus'

Vue.use(VueBus)

export default {
  name: 'App'
}
</script>

<style>
* {
  outline: none;
}

::selection {
  background: #d3d3d3;
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.08);
}

::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.1);
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.1);
}

@media screen {
  body {
    background: #403e3e;
  }
}
</style>
