import { defineComponent, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import mime from 'mime'
import { debounce } from 'lodash-es'
import Viewer from 'viewerjs'
import type { Plugin } from '@fe/context'
import store from '@fe/support/store'
import { getAttachmentURL } from '@fe/services/base'
import { sleep } from '@fe/utils'
import type { Doc } from '@fe/types'

import 'viewerjs/dist/viewer.css'

function isImageFile (doc?: Doc | null) {
  if (!doc) {
    return false
  }

  if (doc.name.toLocaleLowerCase().endsWith('.svg')) {
    return true
  }

  if (doc.plain) {
    return false
  }

  const fileMime = mime.getType(doc.name)
  return !!fileMime && fileMime.startsWith('image/')
}

const ImageViewer = defineComponent({
  setup () {
    const img = ref<HTMLImageElement>()
    let viewer: Viewer | null = null

    function clean () {
      if (viewer) {
        viewer.destroy()
        viewer = null
      }
    }

    onMounted(() => {
      watchEffect(async () => {
        const doc = store.state.currentFile
        if (doc && img.value && isImageFile(doc)) {
          clean()
          await sleep(0)
          viewer = new Viewer(img.value, {
            inline: true,
            navbar: false,
            fullscreen: false,
            button: false,
            backdrop: false,
            transition: false,
            toolbar: {
              zoomIn: true,
              zoomOut: true,
              flipHorizontal: true,
              flipVertical: true,
              oneToOne: true,
              reset: true,
              rotateLeft: true,
              rotateRight: true,
            },
            url () {
              return getAttachmentURL(doc)
            },
          })

          await sleep(0)
        }
      })
    })

    onBeforeUnmount(clean)

    return () => <div
      id="image-viewer"
      style={{ width: '100%', height: '100%' }}
    ><img ref={img} /></div>
  }
})

export default {
  name: 'image-viewer',
  register: ctx => {
    ctx.registerHook('VIEW_MOUNTED', () => {
      setTimeout(() => {
        const viewer = new Viewer(ctx.view.getViewDom()!, {
          zIndex: 299999,
          container: document.body,
          transition: false,
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

      body .viewer-canvas > img {
        transition: transform .2s;
      }
    `)

    // https://github.com/fengyuanchen/viewerjs/issues/197
    ctx.view.addStyles(`
      body.viewer-open {
        padding-right: 0 !important;
      }
    `)

    ctx.editor.registerCustomEditor({
      name: 'ImageViewer',
      hiddenPreview: true,
      when ({ doc }) {
        return isImageFile(doc)
      },
      component: ImageViewer,
    })
  }
} as Plugin
