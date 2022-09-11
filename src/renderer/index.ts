import '@fe/others/demo'

import { createApp } from 'vue'
import App from '@fe/App.vue'
import router from '@fe/router'

import store from '@fe/support/store'
import toast from '@fe/support/ui/toast'
import modal from '@fe/support/ui/modal'
import contextmenu from '@fe/support/ui/context-menu'
import quickFilter from '@fe/support/ui/quick-filter'

const app = createApp(App)

app.use(store)
app.use(router)
app.use(toast)
app.use(modal)
app.use(contextmenu)
app.use(quickFilter)

app.mount('#app')
