import type { Plugin } from '@fe/context'
import type { PositionScrollState } from '@fe/types'

export default {
  name: 'scroll-position-keeper',
  register: (ctx) => {
    const maxLength = 100
    const positions = new Map<string, { time: number, value: PositionScrollState }>()
    let skip = false

    const clean = ctx.lib.lodash.debounce(() => {
      const entries = Array.from(positions.entries()).sort((a, b) => a[1].time - b[1].time)
      const deleteCount = entries.length - maxLength
      if (deleteCount <= 0) {
        return
      }

      for (let i = 0; i < deleteCount; i++) {
        positions.delete(entries[i][0])
      }
    }, 1000)

    ctx.registerHook('PLUGIN_HOOK', ({ plugin, type, payload }) => {
      skip = false
      if (plugin === 'markdown-link' && type === 'before-switch-doc' && payload.position) {
        skip = true
      }
    })

    ctx.registerHook('DOC_PRE_SWITCH', () => {
      const doc = ctx.store.state.currentFile
      if (!doc) {
        return
      }

      const viewScrollTop = ctx.view.getScrollTop() || 0
      const editorScrollTop = ctx.editor.getEditor().getScrollTop()

      if (viewScrollTop < 1 && editorScrollTop < 1) {
        return
      }

      positions.set(ctx.doc.toUri(doc), {
        value: { viewScrollTop, editorScrollTop },
        time: Date.now()
      })
    })

    ctx.registerHook('DOC_SWITCHED', ({ doc }) => {
      if (skip) {
        skip = false
        return
      }

      const uri = ctx.doc.toUri(doc)
      const position = positions.get(uri)
      if (position) {
        ctx.routines.changePosition(position.value)
      }

      clean()
    })
  }
} as Plugin
