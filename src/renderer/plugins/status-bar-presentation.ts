import type { Plugin } from '@fe/context'

export default {
  name: 'status-bar-presentation',
  register: ctx => {
    const action = ctx.action.getAction('view.enter-presentation')

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-presentation'] = {
        id: 'status-bar-presentation',
        position: 'right',
        tips: ctx.i18n.t('status-bar.present') + ` (${ctx.command.getKeysLabel(action!.name)})`,
        icon: 'presentation',
        onClick: () => {
          ctx.view.enterPresent()
          ctx.workbench.ControlCenter.toggle(false)
        }
      }
    })
  }
} as Plugin
