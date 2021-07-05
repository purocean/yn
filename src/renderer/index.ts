import './support/demo'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import store from './support/store'
import bus from './support/bus'
import toast from './support/toast'
import modal from './support/modal'
import contextmenu from './support/context-menu'

const app = createApp(App)

app.use(bus)
app.use(store)
app.use(router)
app.use(toast)
app.use(modal)
app.use(contextmenu)

app.mount('#app')
