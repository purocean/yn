import Vue from 'vue'
import Router from 'vue-router'
import Main from './pages/Main'
import Mini from './pages/Mini'

Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [
    { path: '/', name: 'main', component: Main },
    { path: '/mini', name: 'mini', component: Mini }
  ]
})
