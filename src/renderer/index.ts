import '@fe/others/demo'

import { createApp } from 'vue'
import Main from '@fe/Main.vue'

import directives from '@fe/directives'
import toast from '@fe/support/ui/toast'
import modal from '@fe/support/ui/modal'
import contextmenu from '@fe/support/ui/context-menu'
import quickFilter from '@fe/support/ui/quick-filter'
import fixedFloat from '@fe/support/ui/fixed-float'

const app = createApp(Main)

app.use(directives)
app.use(toast)
app.use(modal)
app.use(contextmenu)
app.use(quickFilter)
app.use(fixedFloat)

app.mount('#app')
