import type { Plugin } from '@fe/context'
import type { BuildInActionName } from '@fe/types'

export default {
  name: 'electron-zoom',
  register: (ctx) => {
    if (!ctx.env.isElectron) {
      return
    }

    ctx.registerHook('STARTUP', () => {
      const webContents = ctx.env.getElectronRemote().getCurrentWebContents()

      function changeZoomFactor (zoomIn: boolean) {
        const currentZoomFactor = webContents.getZoomFactor()
        const factor = currentZoomFactor + (zoomIn ? 0.1 : -0.1)

        if (factor > 0.2 && factor < 3) {
          webContents.setZoomFactor(factor)
        }
      }

      const zoomInId: BuildInActionName = 'plugin.electron-zoom.zoom-in'
      const zoomOutId: BuildInActionName = 'plugin.electron-zoom.zoom-out'
      const zoomResetId: BuildInActionName = 'plugin.electron-zoom.zoom-reset'

      ctx.action.registerAction({
        name: zoomInId,
        keys: [ctx.command.CtrlCmd, '='],
        handler: () => changeZoomFactor(true)
      })

      ctx.action.registerAction({
        name: zoomOutId,
        keys: [ctx.command.CtrlCmd, '-'],
        handler: () => changeZoomFactor(false)
      })

      ctx.action.registerAction({
        name: zoomResetId,
        keys: [ctx.command.CtrlCmd, '0'],
        handler: () => webContents.setZoomFactor(1)
      })

      ctx.statusBar.tapMenus(menus => {
        console.log('xxx', menus['status-bar-view'].list)
        menus['status-bar-view'].list?.push(
          {
            id: zoomInId,
            type: 'normal',
            title: ctx.i18n.t('status-bar.view.zoom-in'),
            subTitle: ctx.command.getKeysLabel(zoomInId),
            onClick: () => ctx.action.getActionHandler(zoomInId)()
          },
          {
            id: zoomOutId,
            type: 'normal',
            title: ctx.i18n.t('status-bar.view.zoom-out'),
            subTitle: ctx.command.getKeysLabel(zoomOutId),
            onClick: () => ctx.action.getActionHandler(zoomOutId)()
          },
          {
            id: zoomResetId,
            type: 'normal',
            title: ctx.i18n.t('status-bar.view.zoom-reset'),
            subTitle: ctx.command.getKeysLabel(zoomResetId),
            onClick: () => ctx.action.getActionHandler(zoomResetId)()
          },
          { type: 'separator' },
        )
      })
    })
  }
} as Plugin
