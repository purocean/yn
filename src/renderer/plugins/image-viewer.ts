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
        viewer = new Viewer(getViewDom(), { zIndex: 299999 })
      }

      viewer.update()
    }, 500))

    ctx.theme.addStyles(`
      body .viewer-backdrop,
      body .viewer-navbar {
        background: rgba(167, 167, 167, 0.6);
      }

      body .viewer-canvas > img {
        background-color: #fff;
      }
    `)
  }
} as Plugin
