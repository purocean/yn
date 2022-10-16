import { debounce } from 'lodash-es'
import Viewer from 'viewerjs'
import type { Plugin } from '@fe/context'
import 'viewerjs/dist/viewer.css'

export default {
  name: 'image-viewer',
  register: ctx => {
    ctx.registerHook('VIEW_MOUNTED', () => {
      setTimeout(() => {
        const viewer = new Viewer(ctx.view.getViewDom()!, {
          zIndex: 299999,
          container: document.body,
          toolbar: {
            zoomIn: 4,
            zoomOut: 4,
            oneToOne: 4,
            reset: 4,
            prev: 4,
            play: 0,
            next: 4,
            rotateLeft: 4,
            rotateRight: 4,
            flipHorizontal: 4,
            flipVertical: 4,
          }
        })

        ctx.registerHook('VIEW_RENDERED', debounce(() => {
          viewer.update()
        }, 500))
      }, 0)
    })

    ctx.theme.addStyles(`
      body .viewer-backdrop {
        background: rgba(239, 239, 239, 0.98);
      }

      body .viewer-title {
        color: #888;
      }

      body .viewer-navbar {
        background: rgba(0, 0, 0, .57)
      }
    `)

    // https://github.com/fengyuanchen/viewerjs/issues/197
    ctx.view.addStyles(`
      body.viewer-open {
        padding-right: 0 !important;
      }
    `)
  }
} as Plugin
