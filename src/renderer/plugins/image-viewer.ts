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
  }
} as Plugin
