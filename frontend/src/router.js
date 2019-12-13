import Vue from 'vue'
import Router from 'vue-router'
import Main from './pages/Main'

Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [
    { path: '/', name: 'main', component: Main },
  ]
})
