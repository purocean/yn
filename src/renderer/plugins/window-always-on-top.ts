import { watch } from 'vue'
import type { Plugin } from '@fe/context'
import type { Components } from '@fe/types'
import { isWindowAlwaysOnTop, toggleWindowAlwaysOnTop } from '@fe/support/window-state'

export default {
  name: 'window-always-on-top',
  register: ctx => {
    if (!ctx.env.isElectron) {
      return
    }

    const tapper = (btns: Components.Tabs.ActionBtn[]) => {
      btns.push({
        type: 'normal',
        key: 'window-always-on-top',
        icon: 'thumbtack-solid',
        iconWidth: '9px',
        title: ctx.i18n.t('title-bar.pin'),
        checked: isWindowAlwaysOnTop.value,
        order: Number.MAX_SAFE_INTEGER,
        onClick: toggleWindowAlwaysOnTop,
      })
    }

    ctx.workbench.FileTabs.tapActionBtns(tapper)
    watch(isWindowAlwaysOnTop, ctx.workbench.FileTabs.refreshActionBtns)
  },
} as Plugin
