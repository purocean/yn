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

      function setZoomFactor (factor: number) {
        webContents.setZoomFactor(factor)
        ctx.statusBar.refreshMenu()
      }

      function changeZoomFactor (zoomIn: boolean) {
        const currentZoomFactor = webContents.getZoomFactor()
        const factor = currentZoomFactor + (zoomIn ? 0.1 : -0.1)

        if (factor > 0.2 && factor < 2) {
          setZoomFactor(factor)
        }
      }

      const zoomInId: BuildInActionName = 'plugin.electron-zoom.zoom-in'
      const zoomOutId: BuildInActionName = 'plugin.electron-zoom.zoom-out'
      const zoomResetId: BuildInActionName = 'plugin.electron-zoom.zoom-reset'

      ctx.action.registerAction({
        name: zoomInId,
        keys: [ctx.keybinding.CtrlCmd, '='],
        description: ctx.i18n.t('command-desc.plugin_electron-zoom_zoom-in'),
        forUser: true,
        handler: () => changeZoomFactor(true)
      })

      ctx.action.registerAction({
        name: zoomOutId,
        keys: [ctx.keybinding.CtrlCmd, '-'],
        description: ctx.i18n.t('command-desc.plugin_electron-zoom_zoom-out'),
        forUser: true,
        handler: () => changeZoomFactor(false)
      })

      ctx.action.registerAction({
        name: zoomResetId,
        keys: [ctx.keybinding.CtrlCmd, '0'],
        description: ctx.i18n.t('command-desc.plugin_electron-zoom_zoom-reset'),
        forUser: true,
        handler: () => setZoomFactor(1)
      })

      ctx.statusBar.tapMenus(menus => {
        const factor = ctx.env.getElectronRemote().getCurrentWebContents().getZoomFactor()
        menus['status-bar-view']?.list?.push(
          { type: 'separator' },
          {
            id: zoomInId,
            type: 'normal' as any,
            title: ctx.i18n.t('electron-zoom.zoom-in'),
            disabled: factor >= 1.9,
            subTitle: ctx.keybinding.getKeysLabel(zoomInId),
            onClick: () => ctx.action.getActionHandler(zoomInId)()
          },
          {
            id: zoomOutId,
            type: 'normal' as any,
            title: ctx.i18n.t('electron-zoom.zoom-out'),
            disabled: factor < 0.25,
            subTitle: ctx.keybinding.getKeysLabel(zoomOutId),
            onClick: () => ctx.action.getActionHandler(zoomOutId)()
          },
          {
            id: zoomResetId,
            type: 'normal' as any,
            title: ctx.i18n.t('electron-zoom.zoom-reset'),
            disabled: factor === 1,
            subTitle: ctx.keybinding.getKeysLabel(zoomResetId),
            onClick: () => ctx.action.getActionHandler(zoomResetId)()
          },
        )
      })
    })
  }
} as Plugin
