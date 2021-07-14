import { debounce } from 'lodash-es'
import Viewer from 'viewerjs'
import type { Plugin } from '@fe/context/plugin'
import 'viewerjs/dist/viewer.css'

let viewer: any

export default {
  name: 'image-viewer',
  register: ctx => {
    ctx.registerHook('ON_VIEW_RENDERED', debounce(({ getViewDom }) => {
      if (!viewer) {
        viewer = new Viewer(getViewDom(), {
          zIndex: 299999,
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
      }

      viewer.update()
    }, 500))

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
  }
} as Plugin
