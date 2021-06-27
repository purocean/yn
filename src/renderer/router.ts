import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import Main from '@fe/views/Main.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Main',
    component: Main
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
