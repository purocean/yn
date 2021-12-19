import type { Plugin } from '@fe/context'
import { hasCtrlCmd } from '@fe/core/command'

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

      window.addEventListener('keydown', e => {
        if (hasCtrlCmd(e)) {
          if (e.key === '0') {
            webContents.setZoomFactor(1)
          } else if (e.key === '=') {
            changeZoomFactor(true)
          } else if (e.key === '-') {
            changeZoomFactor(false)
          }
        }
      })

      // window.addEventListener('mousewheel', event => {
      //   const e = event as WheelEvent

      //   if (hasCtrlCmd(e)) {
      //     changeZoomFactor(e.deltaY < 0)
      //   }
      // })
    })
  }
} as Plugin
