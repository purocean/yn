import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store/index'
import modal from './modal'

Vue.config.productionTip = false

Vue.use(modal)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
