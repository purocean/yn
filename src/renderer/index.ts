import '@fe/others/demo'

import { createApp } from 'vue'
import App from '@fe/App.vue'
import router from '@fe/router'

import bus from '@fe/core/bus'
import store from '@fe/support/store'
import toast from '@fe/support/ui/toast'
import modal from '@fe/support/ui/modal'
import contextmenu from '@fe/support/ui/context-menu'

const app = createApp(App)

app.use(bus)
app.use(store)
app.use(router)
app.use(toast)
app.use(modal)
app.use(contextmenu)

app.mount('#app')
