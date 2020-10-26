import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import bus from './useful/bus'
import toast from './useful/toast'
import modal from './useful/modal'
import contextmenu from './useful/context-menu'

const app = createApp(App)

app.use(bus)
app.use(store)
app.use(router)
app.use(toast)
app.use(modal)
app.use(contextmenu)

app.mount('#app')
