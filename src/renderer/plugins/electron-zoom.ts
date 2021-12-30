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
    })
  }
} as Plugin
